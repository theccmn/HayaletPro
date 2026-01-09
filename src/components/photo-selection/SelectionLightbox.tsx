import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, CheckCircle, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DriveFile } from '../../services/apiGoogleDrive';
import type { SelectedPhoto, ExtraLimitType } from '../../services/apiPhotoSelection';

interface SelectionLightboxProps {
    photos: DriveFile[];
    currentIndex: number | null;
    onClose: () => void;
    onNavigate: (index: number) => void;

    // Selection State
    selections: Record<string, SelectedPhoto>;
    onToggleSelect: (photoId: string) => void;
    onToggleStar: (photoId: string) => void;
    onToggleExtra: (photoId: string, extraId: string) => void;
    onUpdateComment: (photoId: string, comment: string) => void;

    // Config
    extraLimits: ExtraLimitType[];
    isLocked?: boolean;
    isAdminView?: boolean;
}

export function SelectionLightbox({
    photos,
    currentIndex,
    onClose,
    onNavigate,
    selections,
    onToggleSelect,
    onToggleStar,
    onToggleExtra,
    onUpdateComment,
    extraLimits,
    isLocked = false,
    isAdminView = false
}: SelectionLightboxProps) {
    if (currentIndex === null || !photos[currentIndex]) return null;

    const activePhoto = photos[currentIndex];
    const selectionState = selections[activePhoto.id] || { id: activePhoto.id, selected: false };

    // Keyboard Navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % photos.length);
            if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + photos.length) % photos.length);
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [currentIndex, photos.length, onNavigate, onClose]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 text-white bg-black/50 z-20">
                <div><span className="font-bold">{currentIndex + 1}</span> / {photos.length}</div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={24} /></button>
            </div>

            {/* Image Area */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + photos.length) % photos.length); }}
                    className="absolute left-4 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-white/20"
                >
                    <ChevronLeft size={32} />
                </button>

                <img
                    src={activePhoto.webContentLink}
                    className="max-h-full max-w-full object-contain shadow-2xl transition-opacity duration-300"
                    alt={activePhoto.name}
                />

                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % photos.length); }}
                    className="absolute right-4 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-white/20"
                >
                    <ChevronRight size={32} />
                </button>
            </div>

            {/* Controls Bar (Bottom) */}
            {!isLocked && (
                <div className="bg-black/80 p-4 pb-8 text-white backdrop-blur-md z-20">
                    <div className="container mx-auto max-w-4xl flex flex-col md:flex-row items-center gap-4">

                        {/* Main Select Button */}
                        <button
                            onClick={() => onToggleSelect(activePhoto.id)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all min-w-[140px] justify-center",
                                selectionState.selected
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-slate-700 hover:bg-slate-600'
                            )}
                        >
                            {selectionState.selected ? <CheckCircle size={20} /> : <div className="w-5 h-5 border-2 rounded-full" />}
                            {selectionState.selected ? 'SEÇİLDİ' : 'SEÇ'}
                        </button>

                        {/* Extra Options (Visible only if selected) */}
                        {selectionState.selected && (
                            <div className="flex flex-wrap gap-2 justify-center animate-in slide-in-from-left-2 fade-in">
                                {extraLimits.map((el) => {
                                    const isSelected = selectionState.extraSelections?.[el.id];
                                    return (
                                        <button
                                            key={el.id}
                                            onClick={() => onToggleExtra(activePhoto.id, el.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors",
                                                isSelected
                                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                                    : "bg-transparent border-slate-500 text-slate-300 hover:bg-white/10"
                                            )}
                                        >
                                            {el.label} {isSelected && '✓'}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Admin Star Toggle */}
                        {isAdminView && (
                            <button
                                onClick={() => onToggleStar(activePhoto.id)}
                                className={cn(
                                    "p-3 rounded-full border transition-colors",
                                    selectionState.isStarred
                                        ? "bg-amber-500 text-white border-amber-500"
                                        : "border-slate-500 text-slate-400 hover:bg-white/10"
                                )}
                            >
                                <Star size={20} fill={selectionState.isStarred ? "currentColor" : "none"} />
                            </button>
                        )}

                        {/* Comment Input */}
                        {selectionState.selected && (
                            <input
                                value={selectionState.comment || ''}
                                onChange={(e) => onUpdateComment(activePhoto.id, e.target.value)}
                                placeholder="Fotoğraf için notunuz..."
                                className="flex-1 w-full md:w-auto bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
