import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import type { Project, ProjectStatus, Transaction } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { useState, useMemo, useEffect } from 'react';
import { updateStatusOrder } from '../services/apiStatuses';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface KanbanBoardProps {
    projects: Project[];
    statuses: ProjectStatus[];
    transactions?: Transaction[];
    onStatusChange: (projectId: string, newStatus: string) => void;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onAddTransaction: (project: Project) => void;
    onManageSelection: (project: Project) => void;
    onPaymentDetails: (project: Project) => void;
}

export function KanbanBoard({ projects, statuses, transactions, onStatusChange, onEdit, onDelete, onAddTransaction, onManageSelection, onPaymentDetails }: KanbanBoardProps) {
    // We need local state for optimistic column reordering
    const [orderedStatuses, setOrderedStatuses] = useState(statuses);

    useEffect(() => {
        setOrderedStatuses(statuses);
    }, [statuses]);

    const queryClient = useQueryClient();

    const reorderStatusMutation = useMutation({
        mutationFn: updateStatusOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statuses'] });
        }
    });

    const projectsByStatus = useMemo(() => {
        const grouped: Record<string, Project[]> = {};
        orderedStatuses.forEach(s => {
            grouped[s.id] = [];
        });

        // Safety for fallback
        if (orderedStatuses.length > 0) {
            const fallbackId = orderedStatuses[0].id;
            projects.forEach((project) => {
                const statusId = project.status_id;
                if (statusId && grouped[statusId]) {
                    grouped[statusId].push(project);
                } else {
                    grouped[fallbackId]?.push(project);
                }
            });
        }
        return grouped;
    }, [projects, orderedStatuses]);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) {
            return;
        }

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Column Reordering
        if (type === 'COLUMN') {
            const newOrderedStatuses = Array.from(orderedStatuses);
            const [removed] = newOrderedStatuses.splice(source.index, 1);
            newOrderedStatuses.splice(destination.index, 0, removed);

            setOrderedStatuses(newOrderedStatuses);

            const updates = newOrderedStatuses.map((s, index) => ({
                id: s.id,
                order: index
            }));
            reorderStatusMutation.mutate(updates);
            return;
        }

        // Project Dragging / Status Change
        if (type === 'PROJECT') {
            const startStatusId = source.droppableId;
            const finishStatusId = destination.droppableId;

            if (startStatusId !== finishStatusId) {
                // Status changed
                onStatusChange(draggableId, finishStatusId);
            } else {
                // Same column reordering (Optional: Implement if backend supports it)
                // For now, we don't have project ranking, so we just visual reorder?
                // actually, if we don't update state, it will snap back.
                // But typically users expect it. Since we lack 'rank' field, we can ignoring it or
                // just let it snap back (or implement rank later).
                // Given the user wants "smoothness", let's leave it as is.
                // If they reorder within column, it might snap back if we don't persist order.
                // But for now, moving between columns is the key.
            }
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" type="COLUMN" direction="horizontal">
                {(provided) => (
                    <div
                        className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] items-start"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {orderedStatuses.map((col, index) => (
                            <KanbanColumn
                                key={col.id}
                                id={col.id}
                                index={index}
                                title={col.label}
                                projects={projectsByStatus[col.id] || []}
                                transactions={transactions}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onAddTransaction={onAddTransaction}
                                onManageSelection={onManageSelection}
                                onPaymentDetails={onPaymentDetails}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
