
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { useQuery } from '@tanstack/react-query';
import { listDriveFiles as fetchDriveFiles, type DriveFile } from '../services/apiGoogleDrive';
import { Loader2, Download, Image as ImageIcon, AlertCircle } from 'lucide-react';
import type { SelectedPhoto } from '../services/apiPhotoSelection';

interface SelectionGalleryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string;
    selectionData: SelectedPhoto[];
    clientName: string;
    projectName: string;
}

export function SelectionGalleryDialog({ isOpen, onClose, folderId, selectionData, clientName, projectName }: SelectionGalleryDialogProps) {
    // 1. Fetch all files from Drive to get metadata (names, thumbnails)
    // We need to fetch from the folder to match IDs.
    const { data: driveFiles, isLoading, error } = useQuery({
        queryKey: ['drive-files', folderId],
        queryFn: () => fetchDriveFiles(folderId),
        enabled: isOpen && !!folderId,
        staleTime: 1000 * 60 * 5 // 5 mins cache
    });

    // 2. Filter only selected files
    const selectedFiles = driveFiles?.filter(file => {
        const selection = selectionData.find(s => s.id === file.id);
        return selection?.selected;
    }).map(file => {
        const selection = selectionData.find(s => s.id === file.id);
        return {
            ...file,
            selectionDetails: selection
        };
    }) || [];

    // CSV Download Handler
    const handleDownloadCSV = () => {
        if (selectedFiles.length === 0) return;

        // Header
        const headers = ['Sıra No', 'Dosya Adı', 'Ekstra Seçimler'];

        // Rows
        const rows = selectedFiles.map((item, index) => {
            const extraSelections = item.selectionDetails?.extraSelections
                ? Object.keys(item.selectionDetails.extraSelections).filter(k => item.selectionDetails?.extraSelections?.[k])
                    .map(k => {
                        return k.charAt(0).toUpperCase() + k.slice(1);
                    }).join(', ')
                : '';

            return [
                index + 1,
                item.name,
                `"${extraSelections}"`
            ].join(';');
        });

        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n'); // Add BOM for Excel UTF-8
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${clientName}_${projectName}_secimler.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Seçilen Fotoğraflar (${selectedFiles.length})`}
            description={`${clientName} - ${projectName} projesi için yapılan seçimler.`}
            className="max-w-5xl h-[80vh] flex flex-col"
        >
            <div className="flex flex-col flex-1 min-h-0">
                {/* Actions Bar - Compact */}
                <div className="flex justify-between items-center py-2 border-b shrink-0">
                    <div className="text-sm text-muted-foreground">
                        Toplam <strong>{selectedFiles.length}</strong> fotoğraf seçildi.
                    </div>
                    <Button onClick={handleDownloadCSV} disabled={selectedFiles.length === 0} variant="outline" size="sm" className="gap-2">
                        <Download size={14} /> Listeyi İndir (CSV)
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0 pt-4 pr-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="animate-spin text-primary w-8 h-8" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-2">
                            <AlertCircle size={24} />
                            <p>Fotoğraflar yüklenirken hata oluştu.</p>
                        </div>
                    ) : selectedFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <ImageIcon size={32} className="opacity-20" />
                            <p>Henüz hiç fotoğraf seçilmemiş.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {selectedFiles.map((item, index) => (
                                <div key={item.id} className="border rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="aspect-[2/3] relative bg-muted cursor-pointer" onClick={() => window.open(item.webContentLink, '_blank')}>
                                        <img
                                            src={item.thumbnailLink}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                            #{index + 1}
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Button size="icon" variant="ghost" className="text-white bg-black/30 hover:bg-black/50 rounded-full">
                                                <ImageIcon size={20} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 text-sm space-y-2">
                                        <div className="font-medium truncate" title={item.name}>{item.name}</div>

                                        {/* Extra Selections Badge */}
                                        {item.selectionDetails?.extraSelections && Object.values(item.selectionDetails.extraSelections).some(Boolean) && (
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(item.selectionDetails.extraSelections).map(([key, val]) => (
                                                    val && <span key={key} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100 capitalize">
                                                        {key}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Comments */}
                                        {item.selectionDetails?.comment && (
                                            <div className="bg-amber-50 p-2 rounded text-xs text-amber-800 border border-amber-100 italic">
                                                "{item.selectionDetails.comment}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t mt-auto shrink-0 flex justify-end">
                    <Button onClick={onClose}>Kapat</Button>
                </div>
            </div>
        </Dialog>
    );
}
