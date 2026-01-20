import { useState, useEffect } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStatus, updateStatus, deleteStatus, updateStatusOrder, getStatuses } from '../services/apiStatuses';
import { Plus, Trash2, GripVertical, Save, Check } from 'lucide-react';
import type { ProjectStatus } from '../types';
import { useQuery } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";

// Hazır renk paleti
const COLOR_PALETTE = [
    { name: 'Gri', bg: 'bg-gray-100', text: 'text-gray-700', value: 'bg-gray-100 text-gray-700' },
    { name: 'Kırmızı', bg: 'bg-red-100', text: 'text-red-700', value: 'bg-red-100 text-red-700' },
    { name: 'Turuncu', bg: 'bg-orange-100', text: 'text-orange-700', value: 'bg-orange-100 text-orange-700' },
    { name: 'Sarı', bg: 'bg-yellow-100', text: 'text-yellow-700', value: 'bg-yellow-100 text-yellow-700' },
    { name: 'Yeşil', bg: 'bg-green-100', text: 'text-green-700', value: 'bg-green-100 text-green-700' },
    { name: 'Turkuaz', bg: 'bg-teal-100', text: 'text-teal-700', value: 'bg-teal-100 text-teal-700' },
    { name: 'Mavi', bg: 'bg-blue-100', text: 'text-blue-700', value: 'bg-blue-100 text-blue-700' },
    { name: 'Mor', bg: 'bg-purple-100', text: 'text-purple-700', value: 'bg-purple-100 text-purple-700' },
    { name: 'Pembe', bg: 'bg-pink-100', text: 'text-pink-700', value: 'bg-pink-100 text-pink-700' },
    { name: 'Çivit', bg: 'bg-indigo-100', text: 'text-indigo-700', value: 'bg-indigo-100 text-indigo-700' },
];

interface StatusManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

// Renk Seçici Komponenti
function ColorPicker({ value, onChange }: { value: string, onChange: (color: string) => void }) {
    const [open, setOpen] = useState(false);
    const currentColor = COLOR_PALETTE.find(c => c.value === value) || COLOR_PALETTE[0];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "h-8 w-8 rounded-md border-2 border-gray-300 hover:border-primary transition-colors flex items-center justify-center",
                        currentColor.bg
                    )}
                    title="Renk seç"
                >
                    <div className={cn("w-4 h-4 rounded-full", currentColor.bg, "ring-1 ring-inset ring-black/10")} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
                <div className="grid grid-cols-5 gap-2">
                    {COLOR_PALETTE.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => {
                                onChange(color.value);
                                setOpen(false);
                            }}
                            className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110",
                                color.bg,
                                "ring-1 ring-inset ring-black/10",
                                value === color.value && "ring-2 ring-primary ring-offset-1"
                            )}
                            title={color.name}
                        >
                            {value === color.value && <Check className={cn("h-4 w-4", color.text)} />}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">Renk seçin</p>
            </PopoverContent>
        </Popover>
    );
}

function SortableStatusItem({ status, onUpdate, onDelete }: { status: ProjectStatus, onUpdate: (id: string, label: string, color: string) => void, onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: status.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(status.label);
    const [color, setColor] = useState(status.color);

    const handleSave = () => {
        onUpdate(status.id, label, color);
        setIsEditing(false);
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mb-2">
            <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {isEditing ? (
                <>
                    <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="h-8 flex-1"
                    />
                    <ColorPicker value={color} onChange={setColor} />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <>
                    <div className={`flex-1 text-sm font-medium px-2 py-1 rounded ${status.color}`}>
                        {status.label}
                    </div>
                    <button
                        type="button"
                        className="h-8 px-2 text-xs rounded-md hover:bg-gray-100"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                    >
                        Düzenle
                    </button>
                    <button
                        type="button"
                        className="h-8 w-8 flex items-center justify-center rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(status.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    );
}

export function StatusManagerDialog({ isOpen, onClose }: StatusManagerDialogProps) {
    const queryClient = useQueryClient();
    const [newStatusLabel, setNewStatusLabel] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('bg-gray-100 text-gray-700');
    const [statusToDelete, setStatusToDelete] = useState<string | null>(null);

    const { data: statuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
        staleTime: 0 // Always fetch fresh data when opening/managing
    });

    const [localStatuses, setLocalStatuses] = useState<ProjectStatus[]>([]);

    useEffect(() => {
        if (statuses) {
            setLocalStatuses(statuses);
        }
    }, [statuses]);

    const createMutation = useMutation({
        mutationFn: createStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statuses'] })
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<ProjectStatus> }) => updateStatus(id, updates),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statuses'] })
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statuses'] })
    });

    const reorderMutation = useMutation({
        mutationFn: updateStatusOrder,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statuses'] })
    });

    const handleCreate = () => {
        if (!newStatusLabel.trim()) return;
        createMutation.mutate({
            label: newStatusLabel,
            order: (statuses?.length || 0),
            color: newStatusColor
        });
        setNewStatusLabel('');
        setNewStatusColor('bg-gray-100 text-gray-700');
    };

    const handleUpdate = (id: string, label: string, color: string) => {
        updateMutation.mutate({ id, updates: { label, color } });
    };

    const handleDelete = (id: string) => {
        setStatusToDelete(id);
    };

    const confirmDelete = () => {
        if (statusToDelete) {
            deleteMutation.mutate(statusToDelete);
            setStatusToDelete(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setLocalStatuses((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over!.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger API update for order
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    order: index
                }));
                reorderMutation.mutate(updates);

                return newItems;
            });
        }
    };

    return (
        <>
            <Dialog isOpen={isOpen} onClose={onClose} title="Durum Yönetimi" description="Proje durumlarını ekleyin, düzenleyin veya sıralayın.">
                <div className="mt-4 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Yeni durum adı..."
                            value={newStatusLabel}
                            onChange={(e) => setNewStatusLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <ColorPicker value={newStatusColor} onChange={setNewStatusColor} />
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            <Plus className="h-4 w-4 mr-2" /> Ekle
                        </Button>
                    </div>

                    <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-2">
                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={localStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                {localStatuses.map((status) => (
                                    <SortableStatusItem
                                        key={status.id}
                                        status={status}
                                        onUpdate={handleUpdate}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            </Dialog>

            {/* Silme Onay Dialog'u */}
            <AlertDialog open={!!statusToDelete} onOpenChange={(open) => !open && setStatusToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Durumu Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu durumu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
