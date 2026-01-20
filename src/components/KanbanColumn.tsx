import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { Project, Transaction } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
    id: string; // This will be the status (e.g., 'lead')
    title: string;
    projects: Project[];
    transactions?: Transaction[];
    index: number;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onAddTransaction: (project: Project) => void;
    onManageSelection: (project: Project) => void;
    onPaymentDetails: (project: Project) => void;
    color?: string;
}

export function KanbanColumn({ id, title, projects, transactions, index, onEdit, onDelete, onAddTransaction, onManageSelection, onPaymentDetails, color }: KanbanColumnProps) {
    return (
        <Draggable draggableId={id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`bg-muted/40 rounded-xl flex flex-col min-w-[320px] w-full h-full max-h-full border shadow-sm ${snapshot.isDragging ? 'opacity-50 ring-2 ring-primary' : ''
                        }`}
                >
                    <div
                        {...provided.dragHandleProps}
                        className={`flex items-center justify-between cursor-grab active:cursor-grabbing p-3 font-semibold text-sm rounded-t-xl border-b transition-colors ${color || 'bg-muted border-b'}`}
                        title="Sütunu taşı"
                    >
                        <h3>{title}</h3>
                        <span className="bg-background/50 text-foreground text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                            {projects.length}
                        </span>
                    </div>

                    <Droppable droppableId={id} type="PROJECT">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`flex-1 flex flex-col gap-3 p-3 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-muted/60' : ''
                                    }`}
                            >
                                {projects.map((project, i) => (
                                    <KanbanCard
                                        key={project.id}
                                        project={project}
                                        index={i}
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
                </div>
            )}
        </Draggable>
    );
}
