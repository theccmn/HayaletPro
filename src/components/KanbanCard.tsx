import { Draggable } from '@hello-pangea/dnd';
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
                    className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative mb-3 ${isPaymentComplete
                            ? 'bg-green-50/50 border-green-200 text-card-foreground'
                            : 'bg-card text-card-foreground'
                        } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary ring-opacity-50 opacity-90' : ''}`}
                    style={{
                        ...provided.draggableProps.style,
                    }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-full">
                                {project.client_name}
                            </span>
                            {/* @ts-ignore */}
                            {(project.photo_selections?.status === 'completed' || (Array.isArray(project.photo_selections) && project.photo_selections[0]?.status === 'completed')) && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 animate-in fade-in zoom-in" title="Müşteri seçimini tamamladı">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="text-[10px]">Seçildi</span>
                                </div>
                            )}
                            {isPaymentComplete && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200 animate-in fade-in zoom-in" title="Ödeme Tamamlandı">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="text-[10px]">Ödendi</span>
                                </div>
                            )}
                        </div>
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
