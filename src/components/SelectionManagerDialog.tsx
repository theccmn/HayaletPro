
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createSelection, getSelectionByProjectId, deleteSelection, updateSelectionSettings, type SelectionSettings, type ExtraLimitType } from '../services/apiPhotoSelection';
import type { Project } from '../types';
import { Loader2, Copy, Check, ExternalLink, Plus, Trash2, Info, RefreshCw, Pencil, X, Save, Clock, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SelectionGalleryDialog } from './SelectionGalleryDialog';

interface SelectionManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
}

export function SelectionManagerDialog({ isOpen, onClose, project }: SelectionManagerDialogProps) {
    const queryClient = useQueryClient();

    // Form State
    const [folderId, setFolderId] = useState('');
    const [limit, setLimit] = useState(40);
    const [pin, setPin] = useState('');
    const [expirationDate, setExpirationDate] = useState(''); // YYYY-MM-DD
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [extraLimits, setExtraLimits] = useState<ExtraLimitType[]>([
        { id: 'cover', label: 'Albüm Kapağı', limit: 1 },
        { id: 'poster', label: 'Poster', limit: 3 }
    ]);
    const [newExtraLabel, setNewExtraLabel] = useState('');
    const [newExtraLimit, setNewExtraLimit] = useState(1);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch existing selection
    const { data: existingSelection, isLoading } = useQuery({
        queryKey: ['selection', project?.id],
        queryFn: () => getSelectionByProjectId(project!.id),
        enabled: !!project?.id
    });

    // Realtime subscription for status updates
    useEffect(() => {
        if (!existingSelection) return;

        const channel = supabase
            .channel(`selection-${existingSelection.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'photo_selections',
                    filter: `id=eq.${existingSelection.id}`
                },
                (payload: any) => {
                    // Check if status changed
                    if (payload.new.status !== existingSelection.status) {
                        queryClient.invalidateQueries({ queryKey: ['selection', project?.id] });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [existingSelection?.id, queryClient, project?.id]);

    // Generate random PIN on mount or open
    useEffect(() => {
        if (isOpen && !existingSelection) {
            setPin(Math.floor(1000 + Math.random() * 9000).toString());
        }
    }, [isOpen, existingSelection]);

    const createMutation = useMutation({
        mutationFn: async () => {
            const settings: SelectionSettings = {
                limit: limit,
                extra_limits: extraLimits,
                expiration_date: expirationDate || undefined
            };
            await createSelection(project!.id, folderId, settings, pin);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['selection', project?.id] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!existingSelection) return;
            const settings: SelectionSettings = {
                limit: limit,
                extra_limits: extraLimits,
                expiration_date: expirationDate || undefined
            };
            await updateSelectionSettings(existingSelection.id, folderId, settings, pin);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['selection', project?.id] });
            setIsEditing(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await deleteSelection(project!.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['selection', project?.id] });
            queryClient.invalidateQueries({ queryKey: ['projects'] }); // Refresh kanban
            onClose();
        },
        onError: (error) => {
            console.error('Delete failed:', error);
            alert('Silme işlemi başarısız: ' + (error as Error).message);
        }
    });



    const handleSave = () => {
        if (isEditing) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    const handleStartEdit = () => {
        if (!existingSelection) return;
        setFolderId(existingSelection.folder_id);
        // @ts-ignore
        setLimit(existingSelection.settings?.limit || 40);
        // @ts-ignore
        setExtraLimits(existingSelection.settings?.extra_limits || []);
        // @ts-ignore
        setExpirationDate(existingSelection.settings?.expiration_date || '');
        setPin(existingSelection.access_token);
        setIsEditing(true);
    };


    const handleAddExtra = () => {
        if (!newExtraLabel) return;
        const id = newExtraLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        setExtraLimits([...extraLimits, { id, label: newExtraLabel, limit: newExtraLimit }]);
        setNewExtraLabel('');
        setNewExtraLimit(1);
    };

    const handleRemoveExtra = (index: number) => {
        const newExtras = [...extraLimits];
        newExtras.splice(index, 1);
        setExtraLimits(newExtras);
    };

    const copyLink = () => {
        if (!existingSelection) return;
        const link = `${window.location.origin}/select/${existingSelection.access_token}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!project) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={existingSelection && !isEditing ? "Panel Durumu" : (isEditing ? "Paneli Düzenle" : "Yeni Proje Seçim Paneli")}
            description={existingSelection && !isEditing ? "Aktif seçim paneli detayları." : "Ayarları ve klasör bağlantısını güncelleyin."}
        >
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            ) : existingSelection && !isEditing ? (
                // --- EXISTING SELECTION VIEW ---
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="bg-green-100 p-4 rounded-full">
                            <Check size={32} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-green-900">Panel Aktif ve Çalışıyor</h3>
                            <p className="text-green-700">Müşteriniz aşağıdaki bağlantıyı kullanarak seçim yapabilir.</p>
                        </div>
                        <div className="flex gap-2">
                            {/* View Selections Button */}
                            <Button
                                onClick={() => setIsGalleryOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <ImageIcon size={18} className="mr-2" />
                                Seçimleri İncele
                            </Button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Müşteri Linki</Label>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={`${window.location.origin}/select/${existingSelection.access_token}`}
                                className="font-mono text-sm bg-white"
                            />
                            <Button size="icon" variant="outline" onClick={copyLink}>
                                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => window.open(`/select/${existingSelection.access_token}`, '_blank')}
                                title="Yeni sekmede aç"
                            >
                                <ExternalLink size={16} />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-xl bg-white text-center">
                            <div className="text-xs text-muted-foreground font-bold uppercase mb-1">Durum</div>
                            <div className="font-medium capitalize px-2 py-1 bg-slate-100 rounded-full inline-block text-xs truncate max-w-full" title={existingSelection.status}>{existingSelection.status}</div>
                        </div>
                        <div className="p-4 border rounded-xl bg-white text-center group relative cursor-help">
                            <div className="text-xs text-muted-foreground font-bold uppercase mb-1 flex items-center justify-center gap-1">
                                Erişim Kodu <Info size={10} />
                            </div>
                            <div className="font-mono font-bold text-lg">{existingSelection.access_token}</div>
                            {/* Simple tooltip for Access Code */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                Linkin sonundaki benzersiz koddur. Değiştirilirse eski link geçersiz olur.
                            </div>
                        </div>
                        <div className="p-4 border rounded-xl bg-white text-center">
                            <div className="text-xs text-muted-foreground font-bold uppercase mb-1">Klasör</div>
                            <div className="font-mono text-xs truncate px-2" title={existingSelection.folder_id}>
                                {existingSelection.folder_id || 'Demo Modu'}
                            </div>
                        </div>
                        <div className="p-4 border rounded-xl bg-white text-center">
                            <div className="text-xs text-muted-foreground font-bold uppercase mb-1">Seçimler</div>
                            <div className="font-bold text-lg">
                                {/* @ts-ignore */}
                                {existingSelection.selection_data?.filter(s => s.selected).length || 0} / {existingSelection.settings?.limit || 40}
                            </div>
                        </div>
                    </div>

                    {/* Deadline Info Display */}
                    {existingSelection.settings?.expiration_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <Clock size={16} className="text-orange-500" />
                            <span>
                                Son Seçim Tarihi: <strong>{format(new Date(existingSelection.settings.expiration_date), 'd MMMM yyyy', { locale: tr })}</strong>
                            </span>
                            {new Date(existingSelection.settings.expiration_date) < new Date() && (
                                <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">SÜRE DOLDU</span>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t items-center">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                if (window.confirm("⚠️ Paneli tamamen silmek üzeresiniz!\n\nMüşteri erişimi kaybolacak ve seçim verileri silinecek.\n\nDevam etmek istiyor musunuz?")) {
                                    deleteMutation.mutate();
                                }
                            }}
                        >
                            <Trash2 size={14} className="mr-2" /> Paneli Sil
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose}>Kapat</Button>
                            <Button onClick={handleStartEdit} variant="secondary">
                                <Pencil size={14} className="mr-2" /> Düzenle
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                // --- CREATE / EDIT PANEL VIEW ---
                <div className="flex flex-col md:flex-row gap-8 mt-2 h-[600px] overflow-hidden">

                    {/* LEFT COLUMN: Project Info (Read Only) */}
                    <div className="md:w-1/3 space-y-4 overflow-y-auto pr-2 border-r border-dashed">
                        <h3 className="font-bold flex items-center gap-2 text-slate-800">
                            <Info size={16} /> Proje Bilgileri
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase">Proje Adı</Label>
                                <div className="p-2 bg-slate-50 border rounded-md text-sm font-medium">{project.title}</div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase">Müşteri</Label>
                                <div className="p-2 bg-slate-50 border rounded-md text-sm font-medium">{project.client_name}</div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase">Çekim Tarihi</Label>
                                <div className="p-2 bg-slate-50 border rounded-md text-sm">
                                    {project.start_date ? format(new Date(project.start_date), 'dd.MM.yyyy') : '-'}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase">Tutar</Label>
                                <div className="p-2 bg-slate-50 border rounded-md text-sm">
                                    {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '-'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 leading-relaxed">
                            <p><strong>Not:</strong> Bu bilgiler projeden otomatik çekilmiştir. Değişiklik yapmak için önce projeyi düzenleyin.</p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Rules & Settings */}
                    <div className="md:w-2/3 space-y-6 overflow-y-auto pr-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2 text-indigo-700">
                                <RefreshCw size={16} /> Kurallar & Limitler
                            </h3>
                        </div>

                        {/* Top Config Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">Toplam Limit</Label>
                                <Input
                                    type="number"
                                    value={limit}
                                    onChange={(e) => setLimit(parseInt(e.target.value))}
                                    className="text-lg font-bold"
                                />
                            </div>
                            <div className="space-y-2 group relative">
                                <Label className="font-bold text-slate-700 flex items-center gap-2">
                                    Erişim Kodu <Info size={12} className="text-slate-400 cursor-help" />
                                </Label>
                                <Input
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="text-lg font-mono tracking-widest text-center bg-slate-50"
                                />
                                <div className="hidden group-hover:block absolute top-0 right-0 -mt-8 p-2 bg-slate-800 text-white text-xs rounded z-50 w-48">
                                    Linkin sonundaki koddur.
                                </div>
                            </div>
                        </div>

                        {/* Expiration Date Input */}
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700 flex justify-between">
                                <span>Son Seçim Tarihi (Opsiyonel)</span>
                                <span className="text-xs font-normal text-muted-foreground">Bu tarihten sonra panel kilitlenir</span>
                            </Label>
                            <Input
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full"
                            />
                        </div>

                        {/* Extra Limits Section */}
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                            <Label className="text-xs font-bold uppercase text-slate-500">Ekstra Seçim Alanları</Label>

                            <div className="space-y-2">
                                {extraLimits.map((extra, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white p-2 border rounded-md shadow-sm">
                                        <div className="flex-1 text-sm font-medium">{extra.label}</div>
                                        <div className="text-xs bg-slate-100 px-2 py-1 rounded text-muted-foreground">{extra.limit} Adet</div>
                                        <button onClick={() => handleRemoveExtra(idx)} className="text-red-400 hover:text-red-600 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-end gap-2 pt-2 border-t mt-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px]">Alan Adı</Label>
                                    <Input
                                        placeholder="Örn: Kanvas Tablo"
                                        className="h-8 text-sm"
                                        value={newExtraLabel}
                                        onChange={(e) => setNewExtraLabel(e.target.value)}
                                    />
                                </div>
                                <div className="w-20 space-y-1">
                                    <Label className="text-[10px]">Limit</Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-sm"
                                        value={newExtraLimit}
                                        onChange={(e) => setNewExtraLimit(parseInt(e.target.value))}
                                    />
                                </div>
                                <Button size="sm" variant="secondary" onClick={handleAddExtra} disabled={!newExtraLabel}>
                                    <Plus size={14} /> Ekle
                                </Button>
                            </div>
                        </div>

                        {/* Google Drive / Source Input */}
                        <div className="space-y-2">
                            <Label className="font-bold flex justify-between">
                                <span>Fotoğraf Linkleri / Klasör ID</span>
                                <span className="text-xs font-normal text-muted-foreground">Drive linkini yapıştırabilirsiniz</span>
                            </Label>
                            <Input
                                placeholder="https://drive.google.com/..."
                                value={folderId}
                                onChange={(e) => setFolderId(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                <Info size={10} /> Linkler otomatik taranacaktır. Boş bırakırsanız Demo modunda açılır.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t">
                            {isEditing ? (
                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                    <X size={14} className="mr-2" /> İptal
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={onClose}>İptal</Button>
                            )}

                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 min-w-[150px]"
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save size={16} className="mr-2" /> : null)}
                                {isEditing ? 'Değişiklikleri Kaydet' : 'Paneli Oluştur'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Gallery Dialog */}
            {existingSelection && (
                <SelectionGalleryDialog
                    isOpen={isGalleryOpen}
                    onClose={() => setIsGalleryOpen(false)}
                    folderId={existingSelection.folder_id}
                    // @ts-ignore
                    selectionData={existingSelection.selection_data || []}
                    clientName={project.client_name}
                    projectName={project.title}
                />
            )}
        </Dialog>
    );
}
