import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProjectType, updateProjectType, deleteProjectType, updateProjectTypeOrder, getProjectTypes } from '../services/apiProjectTypes';
import { Plus, Trash2, GripVertical, Check } from 'lucide-react';
import type { ProjectType } from '../types';
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

function ColorPicker({ value, onChange }: { value: string, onChange: (value: string) => void }) {
    const selectedColor = COLOR_PALETTE.find(c => c.value === value) || COLOR_PALETTE[0];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "w-8 h-8 rounded-md border shadow-sm transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary",
                        selectedColor.bg
                    )}
                    title="Renk seçin"
                />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
                <div className="grid grid-cols-5 gap-2">
                    {COLOR_PALETTE.map((color) => (
                        <button
                            key={color.name}
                            className={cn(
                                "w-8 h-8 rounded-md border transition-all hover:scale-110 focus:outline-none",
                                color.bg,
                                value === color.value && "ring-2 ring-offset-1 ring-primary"
                            )}
                            onClick={() => onChange(color.value)}
                            title={color.name}
                        >
                            {value === color.value && (
                                <Check className={cn("w-4 h-4 mx-auto", color.text)} />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

interface SortableTypeItemProps {
    type: ProjectType;
    onUpdate: (id: string, label: string, color: string) => void;
    onDelete: (id: string) => void;
}

function SortableTypeItem({ type, onUpdate, onDelete }: SortableTypeItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: type.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(type.label);
    const [color, setColor] = useState(type.color);

    const handleSave = () => {
        onUpdate(type.id, label, color);
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
                    <button
                        type="button"
                        className="h-8 w-8 flex items-center justify-center rounded-md text-green-600 hover:bg-green-50"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSave();
                        }}
                    >
                        <Check className="h-4 w-4" />
                    </button>
                </>
            ) : (
                <>
                    <div className={`flex-1 text-sm font-medium px-2 py-1 rounded ${type.color}`}>
                        {type.label}
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
                            onDelete(type.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    );
}

interface TypeManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TypeManagerDialog({ isOpen, onClose }: TypeManagerDialogProps) {
    const queryClient = useQueryClient();
    const [newTypeLabel, setNewTypeLabel] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('bg-gray-100 text-gray-700');
    const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

    const { data: types } = useQuery({
        queryKey: ['project_types'],
        queryFn: getProjectTypes,
        staleTime: 0
    });

    const [localTypes, setLocalTypes] = useState<ProjectType[]>([]);

    useEffect(() => {
        if (types) {
            setLocalTypes(types);
        }
    }, [types]);

    const createMutation = useMutation({
        mutationFn: createProjectType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_types'] });
            toast.success('Proje türü eklendi');
        },
        onError: (error) => {
            toast.error('Proje türü eklenirken hata: ' + error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectType> }) =>
            updateProjectType(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_types'] });
            toast.success('Proje türü güncellendi');
        },
        onError: (error) => {
            toast.error('Güncelleme hatası: ' + error.message);
        }
    });

    const sortMutation = useMutation({
        mutationFn: updateProjectTypeOrder,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_types'] })
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProjectType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_types'] });
            toast.success('Proje türü silindi');
        },
        onError: (error) => {
            toast.error('Silme hatası: ' + error.message);
        }
    });

    const handleCreate = () => {
        if (!newTypeLabel.trim()) return;
        createMutation.mutate({
            label: newTypeLabel,
            order: (types?.length || 0),
            color: newTypeColor
        });
        setNewTypeLabel('');
        setNewTypeColor('bg-gray-100 text-gray-700');
    };

    const handleUpdate = (id: string, label: string, color: string) => {
        updateMutation.mutate({ id, updates: { label, color } });
    };

    const handleDelete = (id: string) => {
        setTypeToDelete(id);
    };

    const confirmDelete = () => {
        if (typeToDelete) {
            deleteMutation.mutate(typeToDelete);
            setTypeToDelete(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setLocalTypes((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over!.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger API update for order
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    order: index
                }));
                sortMutation.mutate(updates);

                return newItems;
            });
        }
    };

    return (
        <>
            <Dialog isOpen={isOpen} onClose={onClose} title="Proje Türü Yönetimi" description="Proje türlerini ekleyin, düzenleyin veya sıralayın.">
                <div className="mt-4 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Yeni tür adı..."
                            value={newTypeLabel}
                            onChange={(e) => setNewTypeLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <ColorPicker value={newTypeColor} onChange={setNewTypeColor} />
                        <Button onClick={handleCreate} disabled={!newTypeLabel.trim()}>
                            <Plus className="h-4 w-4 mr-2" /> Ekle
                        </Button>
                    </div>

                    <div className="mt-4">
                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={localTypes} strategy={verticalListSortingStrategy}>
                                {localTypes.map((type) => (
                                    <SortableTypeItem
                                        key={type.id}
                                        type={type}
                                        onUpdate={handleUpdate}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            </Dialog>

            <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Türü Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu proje türünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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
