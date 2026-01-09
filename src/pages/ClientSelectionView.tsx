
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSelectionByToken, updateSelectionData, type SelectedPhoto } from '../services/apiPhotoSelection';
import { listDriveFiles } from '../services/apiGoogleDrive';
import { SelectionLightbox } from '../components/photo-selection/SelectionLightbox';
import { Loader2, CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export function ClientSelectionView() {
    const { token } = useParams<{ token: string }>();
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number | null>(null);

    // Local Selection State
    const [selections, setSelections] = useState<Record<string, SelectedPhoto>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        if (session?.status === 'completed') return;

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
        if (session?.status === 'completed') return;

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
        if (session?.status === 'completed') return;
        setSelections(prev => {
            const current = prev[photoId] || { id: photoId, selected: false };
            setHasUnsavedChanges(true);
            return { ...prev, [photoId]: { ...current, comment } };
        });
    };

    const handleComplete = () => {
        if (confirm("Seçimlerinizi onaylayıp göndermek istiyor musunuz? Bu işlemden sonra değişiklik yapamazsınız.")) {
            saveMutation.mutate('completed');
        }
    };


    if (isSessionLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
    }

    if (sessionError || !session) {
        return <div className="min-h-screen flex items-center justify-center text-red-500">Oturum bulunamadı veya süresi dolmuş.</div>;
    }

    const selectedCount = Object.values(selections).filter(p => p.selected).length;
    const isLocked = session.status === 'completed';

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
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center shadow-md",
                                        isSelected ? "bg-indigo-600 text-white" : "bg-white text-slate-300"
                                    )}>
                                        {isSelected && <CheckCircle size={14} />}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {sel?.extraSelections && Object.keys(sel.extraSelections).map(eid => {
                                        const label = session.settings.extra_limits.find((e: any) => e.id === eid)?.label;
                                        return <span key={eid} className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">{label}</span>
                                    })}
                                    {sel?.comment && <span className="bg-white text-slate-800 text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-1"><Info size={10} /> Not</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {isLocked && (
                <div className="fixed bottom-0 left-0 w-full bg-green-600 text-white p-4 text-center font-bold shadow-lg z-40">
                    <CheckCircle className="inline-block mr-2" size={20} />
                    Seçim işleminiz onaylandı ve bize iletildi. Teşekkürler!
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
