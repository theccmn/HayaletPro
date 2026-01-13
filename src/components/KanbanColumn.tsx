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
}

export function KanbanColumn({ id, title, projects, transactions, index, onEdit, onDelete, onAddTransaction, onManageSelection, onPaymentDetails }: KanbanColumnProps) {
    return (
        <Draggable draggableId={id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`bg-muted/50 rounded-lg p-4 flex flex-col gap-4 min-w-[280px] w-full h-full max-h-full ${snapshot.isDragging ? 'opacity-50' : ''
                        }`}
                >
                    <div
                        {...provided.dragHandleProps}
                        className="flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-muted/80 p-1 rounded-md transition-colors"
                        title="Sütunu taşı"
                    >
                        <h3 className="font-semibold text-sm">{title}</h3>
                        <span className="bg-background text-muted-foreground text-xs px-2 py-0.5 rounded-full border">
                            {projects.length}
                        </span>
                    </div>

                    <Droppable droppableId={id} type="PROJECT">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`flex-1 flex flex-col min-h-[50px] transition-colors rounded-md ${snapshot.isDraggingOver ? 'bg-muted/50' : ''
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
