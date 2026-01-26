import { Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { cn, calculateDuration } from '../lib/utils';
import type { Project, Transaction } from '../types';
import { Calendar, MoreVertical, Pencil, Trash2, Wallet, Eye, CheckCircle2 } from 'lucide-react';
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
    transactions?: Transaction[];
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onAddTransaction: (project: Project) => void;
    onManageSelection: (project: Project) => void;
    onPaymentDetails: (project: Project) => void;
}

export function KanbanCard({ project, index, transactions, onEdit, onDelete, onAddTransaction, onManageSelection, onPaymentDetails }: KanbanCardProps) {
    const navigate = useNavigate();

    // Calculate payment status
    const projectIncome = transactions
        ?.filter(t => t.type === 'income' && t.project_id === project.id)
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const isPaymentComplete = (project.price || 0) > 0 && projectIncome >= (project.price || 0);

    return (
        <Draggable draggableId={project.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className={cn(
                        "group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col overflow-hidden",
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-primary ring-opacity-50 opacity-90' : ''
                    )}
                    style={{
                        ...provided.draggableProps.style,
                    }}
                >
                    {project.project_types && (
                        <div className={cn("w-full px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-center border-b", project.project_types.color)}>
                            {project.project_types.label}
                        </div>
                    )}

                    <div className="p-3 flex flex-col gap-2 flex-1 relative">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-wrap gap-1.5 items-center pr-6">
                                <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded-md line-clamp-1 max-w-[100px]">
                                    {project.client_name}
                                </span>
                                {/* @ts-ignore */}
                                {(project.photo_selections?.status === 'completed' || (Array.isArray(project.photo_selections) && project.photo_selections[0]?.status === 'completed')) && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200" title="Seçim Tamam">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                    </div>
                                )}
                                {isPaymentComplete && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold border border-green-200" title="Ödeme Tamam">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                    </div>
                                )}
                            </div>

                            <div className="absolute top-3 right-3">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
                                            onPaymentDetails(project);
                                        }}>
                                            <Wallet className="mr-2 h-4 w-4" />
                                            Ödeme Planı
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
                        </div>

                        <h4 className="font-semibold text-sm leading-tight">{project.title}</h4>

                        <div className="flex items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                            <Calendar className="mr-1 h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[120px]">
                                {project.start_date ? format(new Date(project.start_date), 'd MMM', { locale: tr }) : '-'}
                                {project.start_date && project.end_date && (
                                    <span className="ml-1 opacity-70">
                                        ({calculateDuration(project.start_date, project.end_date)})
                                    </span>
                                )}
                            </span>
                            <div className="ml-auto font-medium text-foreground">
                                {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
