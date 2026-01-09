
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSelectionByToken, updateSelectionData, type SelectedPhoto } from '../services/apiPhotoSelection';
import { listDriveFiles, type DriveFile } from '../services/apiGoogleDrive';
import { SelectionLightbox } from '../components/photo-selection/SelectionLightbox';
import { Loader2, CheckCircle, AlertCircle, Info, RefreshCw, Download, FileText, Lock } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export function ClientSelectionView() {
    const { token } = useParams<{ token: string }>();
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number | null>(null);

    // Local Selection State
    const [selections, setSelections] = useState<Record<string, SelectedPhoto>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isLegalApproved, setIsLegalApproved] = useState(false);
    const [localCompleted, setLocalCompleted] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<{ current: number, total: number, isDownloading: boolean } | null>(null);

    // Fetch Session Data
    const { data: session, isLoading: isSessionLoading, error: sessionError } = useQuery({
        queryKey: ['selection-session', token],
        queryFn: () => getSelectionByToken(token!),
        enabled: !!token
    });

    // Fetch Photos from Drive
    const { data: photos, isLoading: isPhotosLoading, error: driveError, refetch: refetchPhotos } = useQuery({
        queryKey: ['drive-files', session?.folder_id],
        queryFn: () => listDriveFiles(session!.folder_id),
        enabled: !!session?.folder_id,
        retry: false
    });

    // Initialize local state from DB
    useEffect(() => {
        if (session?.selection_data) {
            const initialMap: Record<string, SelectedPhoto> = {};
            session.selection_data.forEach((p: any) => {
                initialMap[p.id] = p;
            });
            setSelections(initialMap);
        }
    }, [session]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (status?: string) => {
            if (!session) return;
            const dataArray = Object.values(selections);
            await updateSelectionData(session.id, dataArray, status);
        },
        onSuccess: () => {
            setHasUnsavedChanges(false);
        }
    });

    // Auto-save
    useEffect(() => {
        const timer = setInterval(() => {
            if (hasUnsavedChanges) {
                saveMutation.mutate(undefined);
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [hasUnsavedChanges, selections]);

    const handleToggleSelect = (photoId: string) => {
        if (session?.status === 'completed' || localCompleted) return;

        setSelections(prev => {
            const current = prev[photoId] || { id: photoId, selected: false };
            const newState = { ...current, selected: !current.selected };

            if (newState.selected) {
                const currentCount = Object.values(prev).filter(p => p.selected).length;
                if (currentCount >= (session?.settings.limit || 1000)) {
                    alert(`Maksimum ${session?.settings.limit} fotoğraf seçebilirsiniz.`);
                    return prev;
                }
            }

            setHasUnsavedChanges(true);
            return { ...prev, [photoId]: newState };
        });
    };

    const handleToggleExtra = (photoId: string, extraId: string) => {
        if (session?.status === 'completed' || localCompleted) return;

        setSelections(prev => {
            const current = prev[photoId];
            if (!current?.selected) return prev;

            const currentExtraCount = Object.values(prev).filter(p => p.extraSelections?.[extraId]).length;
            const extraLimit = session?.settings.extra_limits.find((e: any) => e.id === extraId)?.limit || 1;

            const isCurrentlySelected = current.extraSelections?.[extraId];

            if (!isCurrentlySelected && currentExtraCount >= extraLimit) {
                alert(`Bu özellik için limit doldu.`);
                return prev;
            }

            const newExtraSelections = { ...(current.extraSelections || {}) };
            if (newExtraSelections[extraId]) {
                delete newExtraSelections[extraId];
            } else {
                newExtraSelections[extraId] = true;
            }

            setHasUnsavedChanges(true);
            return { ...prev, [photoId]: { ...current, extraSelections: newExtraSelections } };
        });
    };

    const handleUpdateComment = (photoId: string, comment: string) => {
        if (session?.status === 'completed' || localCompleted) return;
        setSelections(prev => {
            const current = prev[photoId] || { id: photoId, selected: false };
            setHasUnsavedChanges(true);
            return { ...prev, [photoId]: { ...current, comment } };
        });
    };

    const handleComplete = () => {
        // 1. Validate Total Count
        const limit = session?.settings.limit || 0;
        if (selectedCount !== limit) {
            alert(`Lütfen tam olarak ${limit} adet fotoğraf seçiniz. Şu an ${selectedCount} adet seçtiniz.`);
            return;
        }

        // 2. Validate Extra Limits
        const extraLimits = session?.settings.extra_limits || [];
        for (const limit of extraLimits) {
            const currentExtraCount = Object.values(selections).filter(p => p.extraSelections?.[limit.id]).length;
            if (currentExtraCount !== limit.limit) {
                alert(`Lütfen ${limit.limit} adet "${limit.label}" seçimi yapınız. Şu an ${currentExtraCount} adet seçtiniz.`);
                return;
            }
        }

        setIsConfirmOpen(true);
    };

    const confirmSelection = async () => {
        setLocalCompleted(true);
        saveMutation.mutate('completed');
        setIsConfirmOpen(false);

        try {
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    type: 'selection_completed',
                    payload: {
                        // @ts-ignore
                        project_title: session?.projects?.title || "Proje",
                        // @ts-ignore
                        client_name: session?.projects?.client_name || "Müşteri",
                        total_selected: selectedCount,
                        project_id: session?.project_id
                    }
                }
            });
            if (error) {
                console.error('Edge Function Error:', error);
            } else {
                console.log('Edge Function Response:', data);
            }
        } catch (error) {
            console.error('Failed to send email notification:', error);
        }
    };

    const processDownloadQueue = async (items: DriveFile[]) => {
        if (items.length === 0) {
            alert("İndirilecek fotoğraf bulunamadı.");
            return;
        }

        const proceed = window.confirm(`${items.length} adet fotoğraf ZIP olarak hazırlanıp indirilecek. Bu işlem internet hızınıza bağlı olarak biraz zaman alabilir. Lütfen pencereyi kapatmayın.\n\nDevam edilsin mi?`);

        if (!proceed) {
            return;
        }

        try {
            setDownloadProgress({ current: 0, total: items.length, isDownloading: true });

            const zip = new JSZip();
            const folderName = session?.projects?.client_name || "Fotograflar";
            const imgFolder = zip.folder(folderName);

            for (let i = 0; i < items.length; i++) {
                const photo = items[i];
                setDownloadProgress({ current: i + 1, total: items.length, isDownloading: true });

                try {
                    // Try to fetch the image. 
                    // We prioritize specific high-res thumbnail link if webContentLink fails CORS, 
                    // but usually lh3 links (thumbnails) are CORS friendly.
                    // apiGoogleDrive already sets thumbnailLink to s1920. Let's try to get s3000 for better quality if possible, 
                    // or just use the current one.

                    // NOTE: webContentLink (drive.google.com/uc...) often blocks CORS. 
                    // thumbnailLink (lh3.googleusercontent.com...) usually allows it.
                    // We use the thumbnailLink but try to request max resolution.
                    const fetchUrl = photo.thumbnailLink ? photo.thumbnailLink.replace(/=s\d+$/, '=s3000') : photo.webContentLink;

                    const response = await fetch(fetchUrl, { mode: 'cors' });
                    if (!response.ok) throw new Error('Network response was not ok');

                    const blob = await response.blob();
                    imgFolder?.file(photo.name, blob);

                } catch (err) {
                    console.error(`Failed to download ${photo.name}`, err);
                    // Continue to next photo
                }
            }

            setDownloadProgress(prev => prev ? { ...prev, current: items.length, total: items.length } : null);

            // Generate ZIP
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${folderName}_Secimler.zip`);

            alert("İndirme işlemi tamamlandı. ZIP dosyasını kontrol ediniz.");
        } catch (error) {
            console.error("ZIP Error:", error);
            alert("İndirme işlemi sırasında bir hata oluştu.");
        } finally {
            setDownloadProgress(null);
        }
    };

    const downloadSelectedPhotos = () => {
        const selectedPhotos = photos?.filter(p => selections[p.id]?.selected) || [];
        processDownloadQueue(selectedPhotos);
    };

    const downloadAllPhotos = () => {
        if (!photos) return;
        processDownloadQueue(photos);
    };

    // Loading & Error States
    if (isSessionLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
    }

    if (sessionError || !session) {
        return <div className="min-h-screen flex items-center justify-center text-red-500">Oturum bulunamadı veya süresi dolmuş.</div>;
    }

    const selectedCount = Object.values(selections).filter(p => p.selected).length;
    const isLocked = session.status === 'completed' || localCompleted;

    // Header Rendering
    const renderHeader = () => (
        <header className="bg-white sticky top-0 z-30 shadow-sm px-6 py-4 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold text-slate-800">
                    {/* @ts-ignore */}
                    {session.projects?.client_name || "Müşteri"} - Fotoğraf Seçimi
                </h1>
                <div className="text-xs text-slate-500 flex gap-2">
                    <span>Toplam: {photos?.length || 0}</span>
                    {hasUnsavedChanges && <span className="text-amber-500 font-bold">• Kaydedilmedi</span>}
                    {!hasUnsavedChanges && <span className="text-green-500 font-bold">• Kaydedildi</span>}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className={cn("px-4 py-2 rounded-lg font-bold text-sm border",
                    selectedCount >= session.settings.limit ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200"
                )}>
                    {selectedCount} / {session.settings.limit} Seçildi
                </div>
                {!isLocked && (
                    <button
                        onClick={handleComplete}
                        disabled={selectedCount === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        ONAYLA
                    </button>
                )}
            </div>
        </header>
    );

    // Empty State / Error Rendering
    if (isPhotosLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                {renderHeader()}
                <div className="p-20 text-center flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-slate-400" size={48} />
                    <p className="text-slate-500">Fotoğraflar taranıyor...</p>
                </div>
            </div>
        );
    }

    if (driveError || !photos || photos.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50">
                {renderHeader()}
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 px-4">
                    <div className="bg-slate-100 p-6 rounded-full">
                        <AlertCircle size={48} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700">Fotoğraf Bulunamadı</h3>

                    <div className="max-w-md text-sm text-slate-500 space-y-4 text-left bg-white p-6 rounded-lg border shadow-sm">
                        <div className="flex items-start gap-2">
                            <Info className="shrink-0 text-blue-500 mt-0.5" size={16} />
                            <p>Bu klasörde görüntülenecek <strong>doğrudan fotoğraf dosyası</strong> bulunamadı.</p>
                        </div>

                        <div className="space-y-2 border-t pt-2">
                            <p className="font-bold text-slate-700">Olası Sebepler:</p>
                            <ul className="list-disc list-inside space-y-1 text-slate-600">
                                <li>Seçilen klasörde hiç fotoğraf yok (Alt klasörler taranmaz).</li>
                                <li>Klasör paylaşım ayarı <strong>"Bağlantıya sahip herkes"</strong> olarak seçilmemiş.</li>
                                <li>API Anahtarınızda bir sorun var.</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-yellow-800 text-xs text-left">
                            <strong>İpucu:</strong> Drive'da klasörünüz alt alta klasörlerden oluşuyorsa (örn: Düğün &gt; Fotoğraflar), en son aşamadaki, içinde direkt .jpg dosyaları olan klasörün ID'sini kullanmalısınız.
                        </div>
                    </div>

                    <button onClick={() => refetchPhotos()} className="mt-4 flex items-center gap-2 text-indigo-600 font-bold hover:underline">
                        <RefreshCw size={16} /> Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {renderHeader()}

            {/* Main Grid */}
            <main className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {photos.map((photo, index) => {
                    const sel = selections[photo.id];
                    const isSelected = sel?.selected;

                    return (
                        <div
                            key={photo.id}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={cn(
                                "aspect-[2/3] relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all group",
                                isSelected ? "border-indigo-600 shadow-lg ring-2 ring-indigo-100" : "border-transparent hover:border-slate-300"
                            )}
                        >
                            <img
                                src={photo.thumbnailLink}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                alt=""
                            />

                            <div className={cn(
                                "absolute inset-0 bg-black/0 transition-colors flex flex-col justify-between p-3",
                                isSelected ? "bg-black/20" : "group-hover:bg-black/10"
                            )}>
                                <div className="flex justify-end">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSelect(photo.id);
                                        }}
                                        className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 hover:scale-110",
                                            isSelected ? "bg-indigo-600 text-white" : "bg-white text-slate-300 hover:text-indigo-600"
                                        )}
                                    >
                                        {isSelected && <CheckCircle size={14} />}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 items-end">
                                    {isSelected ? (
                                        // Interactive Buttons when Selected
                                        <>
                                            {session.settings.extra_limits.map((limit: any) => {
                                                const isExtraSelected = sel?.extraSelections?.[limit.id];
                                                return (
                                                    <button
                                                        key={limit.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleExtra(photo.id, limit.id);
                                                        }}
                                                        className={cn(
                                                            "text-[9px] font-bold px-2 py-1 rounded shadow transition-colors border",
                                                            isExtraSelected
                                                                ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
                                                                : "bg-white/90 text-slate-600 border-white hover:bg-white"
                                                        )}
                                                    >
                                                        {limit.label}
                                                        {isExtraSelected && <span className="ml-1">✓</span>}
                                                    </button>
                                                );
                                            })}
                                            {sel?.comment && (
                                                <span className="bg-white text-slate-800 text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-1 border border-slate-200">
                                                    <Info size={10} />
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        // Just Comment Indicator if NOT selected (unlikely to have comment but possible if deselected later)
                                        sel?.comment && <span className="bg-white/50 text-slate-800 text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-1 backdrop-blur-sm"><Info size={10} /></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Legal Confirmation Dialog */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b bg-slate-50 flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg">
                                <FileText size={24} className="text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Dijital Baskı Onayı</h3>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 leading-relaxed mb-6 h-64 overflow-y-auto shadow-inner">
                                <p className="font-bold text-slate-800 mb-2">Lütfen Dikkatlice Okuyunuz:</p>
                                <p className="mb-3">
                                    İşbu form aracılığıyla seçmiş olduğum fotoğrafların, belirlediğim kapak ve poster tercihlerinin son kontrollerini yaptığımı beyan ederim.
                                </p>
                                <p className="mb-3">
                                    Seçim işlemini onaylamamla birlikte, siparişimin tasarım ve baskı aşamasına geçeceğini, bu aşamadan sonra seçilen fotoğraflarda, albüm kapağında veya posterlerde herhangi bir değişiklik, iptal veya iade talep edemeyeceğimi kabul ederim.
                                </p>
                                <p>
                                    Kişiye özel hazırlanan bu ürünlerde cayma hakkımın bulunmadığını bildiğimi ve onayladığımı taahhüt ederim.
                                </p>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={isLegalApproved}
                                    onChange={(e) => setIsLegalApproved(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors select-none">
                                    Yukarıdaki metni okudum, anladım ve onaylıyorum.
                                </span>
                            </label>
                        </div>

                        <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsConfirmOpen(false)}
                                className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={confirmSelection}
                                disabled={!isLegalApproved || saveMutation.isPending}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 disabled:shadow-none transition-all flex items-center gap-2"
                            >
                                {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
                                SİPARİŞİ ONAYLA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Locked / Completed / Success View */}
            {isLocked && (
                <div className="fixed inset-0 z-40 bg-slate-50/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500 block">
                    <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-indigo-100">
                        <div className="bg-indigo-600 p-8 text-center text-white">
                            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                                <CheckCircle size={40} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Siparişiniz Alındı!</h2>
                            <p className="text-indigo-100 text-lg">Seçimleriniz fotoğrafçınıza iletildi.</p>
                        </div>

                        <div className="p-10 text-center space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-4xl font-bold text-indigo-600 mb-1">{selectedCount}</div>
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Seçilen Fotoğraf</div>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-4xl font-bold text-indigo-600 mb-1">{photos?.length}</div>
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Toplam Fotoğraf</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 flex items-center justify-center gap-2">
                                    <Download size={20} className="text-indigo-600" />
                                    Fotoğrafları İndir
                                </h3>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    Seçtiğiniz veya tüm fotoğrafları yüksek kalitede cihazınıza indirebilirsiniz.
                                    İndirme işlemi ZIP formatında gerçekleşecektir.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                                    <button
                                        onClick={downloadSelectedPhotos}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                    >
                                        <CheckCircle size={20} />
                                        Sadece Seçilenleri İndir
                                    </button>
                                    <button
                                        onClick={downloadAllPhotos}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Download size={20} />
                                        Tümünü İndir (ZIP)
                                    </button>
                                </div>
                            </div>

                            {downloadProgress && (
                                <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in slide-in-from-bottom">
                                    <div className="flex items-center justify-between mb-2 text-sm font-bold text-indigo-800">
                                        <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Hazırlanıyor...</span>
                                        <span>{downloadProgress.current} / {downloadProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-indigo-600 h-full transition-all duration-300"
                                            style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t">
                            Bu alan artık düzenlemeye kapalıdır.
                        </div>
                    </div>
                </div>
            )}

            <SelectionLightbox
                photos={photos}
                currentIndex={currentPhotoIndex}
                onClose={() => setCurrentPhotoIndex(null)}
                onNavigate={setCurrentPhotoIndex}
                selections={selections}
                onToggleSelect={handleToggleSelect}
                onToggleExtra={handleToggleExtra}
                onToggleStar={() => { }}
                onUpdateComment={handleUpdateComment}
                /* @ts-ignore */
                extraLimits={session.settings.extra_limits}
                isLocked={isLocked}
            />
        </div>
    );
}
