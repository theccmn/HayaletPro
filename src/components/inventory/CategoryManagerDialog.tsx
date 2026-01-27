import { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/apiInventory';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategoryManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SortableItemProps {
    id: string;
    category: any;
    onDelete: (id: string) => void;
}

function SortableItem({ id, category, onDelete }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-2 bg-muted/50 rounded-md border group mb-2"
        >
            <div className="flex items-center gap-3">
                {/* Drag Handle */}
                <button
                    className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <span className="font-medium text-sm">{category.name}</span>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                onClick={() => {
                    if (confirm(`${category.name} kategorisini silmek istediğinize emin misiniz?`)) {
                        onDelete(category.id);
                    }
                }}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function CategoryManagerDialog({ isOpen, onClose }: CategoryManagerDialogProps) {
    const queryClient = useQueryClient();
    const [newCategoryName, setNewCategoryName] = useState('');

    // Fetch categories
    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['inventory-categories'],
        queryFn: getCategories,
        enabled: isOpen,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) + 1 : 0;
            return createCategory(name, nextOrder);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setNewCategoryName('');
            toast.success('Kategori eklendi');
        },
        onError: (error) => {
            toast.error('Kategori eklenirken hata oluştu');
            console.error(error);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
            toast.success('Kategori silindi');
        },
        onError: () => toast.error('Bu kategori silinemedi (kullanılıyor olabilir)')
    });

    const updateOrderMutation = useMutation({
        mutationFn: async (items: { id: string, order_index: number }[]) => {
            await Promise.all(items.map(item => updateCategory(item.id, { order_index: item.order_index })));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
            // Remove toast to avoid spamming on every drag, or keep it if preferred.
            // toast.success('Sıralama güncellendi'); 
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);

            // Mutate UI locally first (React Query handles optimism?) 
            // Actually dnd-kit handles the visual drag, but we need to commit the change.
            // With React Query, we should update the cache optimistically or just trigger mutation.
            // Calculating new order indices is tricky if we just swap. 
            // Best approach for lists: re-assign index based on array position.

            const newItems = arrayMove(categories, oldIndex, newIndex);

            // Optimistic updat is a bit complex here without setQueryData, 
            // but let's just trigger the API update.
            // We send the NEW order for ALL items (or affected ones) to be safe.
            const updates = newItems.map((cat, index) => ({
                id: cat.id,
                order_index: index
            }));

            // Directly update cache to avoid flicker?
            queryClient.setQueryData(['inventory-categories'], newItems);

            updateOrderMutation.mutate(updates);
        }
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            createMutation.mutate(newCategoryName.trim());
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Kategori Yönetimi"
            description="Ekipman kategorilerini düzenleyin ve sıralayın."
        >
            <div className="mt-4 space-y-4">
                {/* Add New Category */}
                <form onSubmit={handleAdd} className="flex gap-2">
                    <Input
                        placeholder="Yeni kategori adı..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={!newCategoryName.trim() || createMutation.isPending}>
                        {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Ekle
                    </Button>
                </form>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : categories.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">Henüz kategori bulunmuyor.</p>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={categories.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {categories.map((category) => (
                                    <SortableItem
                                        key={category.id}
                                        id={category.id}
                                        category={category}
                                        onDelete={(id) => deleteMutation.mutate(id)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={onClose}>Kapat</Button>
            </div>
        </Dialog>
    );
}
