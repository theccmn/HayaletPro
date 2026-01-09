import { useState, useEffect } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStatus, updateStatus, deleteStatus, updateStatusOrder, getStatuses } from '../services/apiStatuses';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import type { ProjectStatus } from '../types';
import { useQuery } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StatusManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
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
                    <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 w-24"
                        placeholder="bg-red-100"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <>
                    <div className={`flex-1 text-sm font-medium px-2 py-1 rounded ${status.color}`}>
                        {status.label}
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditing(true)}>
                        Düzenle
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(status.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            )}
        </div>
    );
}

export function StatusManagerDialog({ isOpen, onClose }: StatusManagerDialogProps) {
    const queryClient = useQueryClient();
    const [newStatusLabel, setNewStatusLabel] = useState('');

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
            color: 'bg-gray-100 text-gray-700'
        });
        setNewStatusLabel('');
    };

    const handleUpdate = (id: string, label: string, color: string) => {
        updateMutation.mutate({ id, updates: { label, color } });
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu durumu silmek istediğinize emin misiniz?')) {
            deleteMutation.mutate(id);
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
        <Dialog isOpen={isOpen} onClose={onClose} title="Durum Yönetimi" description="Proje durumlarını ekleyin, düzenleyin veya sıralayın.">
            <div className="mt-4 space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Yeni durum adı..."
                        value={newStatusLabel}
                        onChange={(e) => setNewStatusLabel(e.target.value)}
                    />
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
    );
}
