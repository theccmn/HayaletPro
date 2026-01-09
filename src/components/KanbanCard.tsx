import { Draggable } from '@hello-pangea/dnd';
import type { Project } from '../types';
import { Calendar, MoreVertical, Pencil, Trash2, Wallet, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface KanbanCardProps {
    project: Project;
    index: number;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onAddTransaction: (project: Project) => void;
    onManageSelection: (project: Project) => void;
}

export function KanbanCard({ project, index, onEdit, onDelete, onAddTransaction, onManageSelection }: KanbanCardProps) {
    return (
        <Draggable draggableId={project.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-card text-card-foreground p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative mb-3 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary ring-opacity-50 opacity-90' : ''
                        }`}
                    style={{
                        ...provided.draggableProps.style,
                    }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-full">
                            {project.client_name}
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 -mr-2 -mt-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onManageSelection(project);
                                }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Fotoğraf Seçimi
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(project);
                                }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTransaction(project);
                                }}>
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Gelir/Gider Ekle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(project);
                                    }}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Sil
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <h4 className="font-semibold mb-1 leading-snug">{project.title}</h4>

                    <div className="flex items-center text-xs text-muted-foreground mt-3">
                        <Calendar className="mr-1 h-3 w-3" />
                        {project.start_date ? format(new Date(project.start_date), 'd MMM', { locale: tr }) : '-'}
                        <div className="ml-auto font-medium text-foreground">
                            {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
