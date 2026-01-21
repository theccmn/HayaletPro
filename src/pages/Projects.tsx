import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProject, getProjects, updateProjectStatus } from '../services/apiProjects';
import type { Project } from '../types';
import { Plus, LayoutGrid, List as ListIcon, Loader2, Calendar, MoreVertical, Pencil, Trash2, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Wallet, Settings2, Kanban as KanbanIcon, CheckCircle2, ZoomIn, ZoomOut, Clock, Search, AlertTriangle, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProjectDialog } from '../components/ProjectDialog';
import { KanbanBoard } from '../components/KanbanBoard';
import { getStatuses } from '../services/apiStatuses';
import { TypeManagerDialog } from '../components/TypeManagerDialog';
import { StatusManagerDialog } from '../components/StatusManagerDialog';
import { SelectionManagerDialog } from '../components/SelectionManagerDialog';
import { PaymentDetailsDialog } from '../components/PaymentDetailsDialog';
import { getTransactions } from '../services/apiFinance';
import { useNavigate } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { TransactionDialog } from '../components/TransactionDialog';


const ProjectActions = ({
    project,
    onEdit,
    onDelete,
    onAddTransaction,
    onManageSelection,
    onPaymentDetails
}: {
    project: Project;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onAddTransaction: (project: Project) => void;
    onManageSelection: (project: Project) => void;
    onPaymentDetails: (project: Project) => void;
}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPaymentDetails(project)}>
                <Wallet className="mr-2 h-4 w-4" />
                Ödeme Planı
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageSelection(project)}>
                <Eye className="mr-2 h-4 w-4" />
                Fotoğraf Seçimi
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddTransaction(project)}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Gelir/Gider Ekle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(project)}>
                <Pencil className="mr-2 h-4 w-4" />
                Düzenle
            </DropdownMenuItem>
            <DropdownMenuItem
                onClick={() => onDelete(project)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Sil
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

export default function Projects() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
    const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>('md');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'name_asc' | 'status'>('date_desc');
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
    const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterByStatus, setFilterByStatus] = useState<string | null>(null);

    // State for Dialogs
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [projectForTransaction, setProjectForTransaction] = useState<Project | null>(null);
    const [projectForSelection, setProjectForSelection] = useState<Project | null>(null);
    const [projectForPayment, setProjectForPayment] = useState<Project | null>(null);

    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

    const queryClient = useQueryClient();

    const { data: projects, isLoading: isLoadingProjects, error } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: statuses, isLoading: isLoadingStatuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
    });

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    const isLoading = isLoadingProjects || isLoadingStatuses;

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setProjectToDelete(null);
        },
        onError: (error) => {
            console.error('Silme hatası:', error);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            updateProjectStatus(id, status),
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['projects'] });
            const previousProjects = queryClient.getQueryData<Project[]>(['projects']);
            queryClient.setQueryData<Project[]>(['projects'], (old) => {
                if (!old) return [];
                return old.map((project) =>
                    project.id === id ? { ...project, status_id: status } : project
                );
            });
            return { previousProjects };
        },
        onError: (err, _, context) => {
            if (context?.previousProjects) {
                queryClient.setQueryData(['projects'], context.previousProjects);
            }
            console.error('Durum güncelleme hatası:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const handleCreateClick = () => {
        setProjectToEdit(null);
        setIsProjectDialogOpen(true);
    };

    const handleEditClick = (project: Project) => {
        setProjectToEdit(project);
        setIsProjectDialogOpen(true);
    };

    const handleDeleteClick = (project: Project) => {
        setProjectToDelete(project);
    };

    const handleTransactionClick = (project: Project) => {
        setProjectForTransaction(project);
        setIsTransactionDialogOpen(true);
    };

    const handleSelectionClick = (project: Project) => {
        setProjectForSelection(project);
        setIsSelectionDialogOpen(true);
    };

    const handlePaymentDetailsClick = (project: Project) => {
        setProjectForPayment(project);
        setIsPaymentDialogOpen(true);
    };


    const confirmDelete = () => {
        if (projectToDelete) {
            deleteMutation.mutate(projectToDelete.id);
        }
    };

    const handleStatusChange = (projectId: string, newStatus: string) => {
        updateStatusMutation.mutate({ id: projectId, status: newStatus });
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-red-500">
                Hata: {(error as Error).message}
            </div>
        );
    }

    const getStatusLabel = (statusId: string) => {
        if (!statuses) return 'Yükleniyor...';
        const status = statuses.find(s => s.id === statusId);
        return status ? status.label : 'Bilinmiyor';
    };

    const getStatusColor = (statusId: string) => {
        if (!statuses) return 'bg-gray-100 text-gray-700';
        const status = statuses.find(s => s.id === statusId);
        return status ? status.color : 'bg-gray-100 text-gray-700';
    };

    const filteredProjects = projects?.filter(p => {
        // Filter by specific status
        if (filterByStatus) {
            if (p.status_id !== filterByStatus) return false;
        } else {
            // Filter by completion status (only when no specific filter)
            if (!showCompleted) {
                const status = statuses?.find(s => s.id === p.status_id);
                if (status?.label?.toLowerCase() === 'tamamlandı') return false;
            }
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = p.title.toLowerCase().includes(query);
            const matchesClient = p.client_name.toLowerCase().includes(query);
            if (!matchesName && !matchesClient) return false;
        }

        return true;
    });

    const sortedProjects = filteredProjects ? [...filteredProjects].sort((a, b) => {
        switch (sortBy) {
            case 'date_desc':
                return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
            case 'date_asc':
                return new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
            case 'price_desc':
                return (b.price || 0) - (a.price || 0);
            case 'price_asc':
                return (a.price || 0) - (b.price || 0);
            case 'name_asc':
                return a.title.localeCompare(b.title);
            case 'status':
                const statusA = statuses?.find(s => s.id === a.status_id);
                const statusB = statuses?.find(s => s.id === b.status_id);
                return (statusA?.order || 0) - (statusB?.order || 0);
            default:
                return 0;
        }
    }) : [];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
                    <p className="text-muted-foreground">Tüm stüdyo çekimlerinizi buradan yönetin.</p>
                </div>
                {/* Search Bar */}
                <div className="flex-1 max-w-sm ml-4 lg:ml-8">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Projelerde ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-9 w-full rounded-full border border-input bg-background px-9 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1">
                                <ArrowUpDown className="h-4 w-4" />
                                <span className="hidden sm:inline">Sırala</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortBy('date_desc')}>
                                <Calendar className="mr-2 h-4 w-4" /> Tarih (Yeni - Eski)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('date_asc')}>
                                <ArrowUp className="mr-2 h-4 w-4" /> Tarih (Eski - Yeni)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('price_desc')}>
                                <ArrowDown className="mr-2 h-4 w-4" /> Fiyat (Yüksek - Düşük)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('price_asc')}>
                                <ArrowUp className="mr-2 h-4 w-4" /> Fiyat (Düşük - Yüksek)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('name_asc')}>
                                <ArrowDown className="mr-2 h-4 w-4" /> İsim (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('status')}>
                                <KanbanIcon className="mr-2 h-4 w-4" /> Durum (Kanban Sırası)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="border rounded-lg p-1 bg-background flex">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                            title="Izgara Görünümü"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                            title="Liste Görünümü"
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={cn("p-2 rounded-md transition-all", viewMode === 'kanban' ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                            title="Kanban Görünümü"
                        >
                            <KanbanIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Card Size Controls - Slider & Buttons */}
                    {viewMode === 'grid' && (
                        <div className="flex flex-col items-center justify-center gap-1 bg-background border rounded-lg p-2 h-16 w-32 shadow-sm">
                            <div className="w-full px-1">
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="1"
                                    value={cardSize === 'sm' ? 1 : cardSize === 'md' ? 2 : 3}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setCardSize(val === 1 ? 'sm' : val === 2 ? 'md' : 'lg');
                                    }}
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                            <div className="flex w-full justify-between items-center px-1">
                                <button
                                    onClick={() => setCardSize(cardSize === 'md' ? 'sm' : cardSize === 'lg' ? 'md' : 'sm')}
                                    disabled={cardSize === 'sm'}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                    title="Küçült"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-medium text-muted-foreground select-none">
                                    {cardSize === 'sm' ? 'Küçük' : cardSize === 'md' ? 'Orta' : 'Büyük'}
                                </span>
                                <button
                                    onClick={() => setCardSize(cardSize === 'sm' ? 'md' : cardSize === 'md' ? 'lg' : 'lg')}
                                    disabled={cardSize === 'lg'}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                    title="Büyült"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowCompleted(!showCompleted)}
                        title={showCompleted ? "Tamamlananları Gizle" : "Tamamlananları Göster"}
                        className={showCompleted ? "bg-primary/10 text-primary" : ""}
                    >
                        {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>

                    <Button variant="outline" size="icon" onClick={() => setIsStatusManagerOpen(true)} title="Durumları Yönet">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setIsTypeManagerOpen(true)} title="Türleri Yönet">
                        <Tag className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleCreateClick}>
                        <Plus className="mr-2 h-4 w-4" /> Yeni Proje
                    </Button>
                </div>
            </div>

            {/* Status İstatistik Kartları - Sadece grid ve list görünümlerinde */}
            {viewMode !== 'kanban' && statuses && statuses.length > 0 && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${statuses.length}, 1fr)` }}>
                    {statuses.map(status => {
                        const count = projects?.filter(p => p.status_id === status.id).length || 0;
                        const isSelected = filterByStatus === status.id;

                        return (
                            <div
                                key={status.id}
                                onClick={() => setFilterByStatus(isSelected ? null : status.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border shadow-sm transition-all hover:shadow-md cursor-pointer",
                                    status.color || 'bg-gray-100 text-gray-700',
                                    isSelected && "ring-2 ring-offset-2 ring-primary scale-[1.02]"
                                )}
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50">
                                    <span className="text-xl font-bold">
                                        {count}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold">
                                    {status.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {projects?.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <LayoutGrid className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Henüz proje yok</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        Yeni bir proje oluşturarak başlayın.
                    </p>
                    <Button onClick={handleCreateClick}>
                        <Plus className="mr-2 h-4 w-4" /> Proje Oluştur
                    </Button>
                </div>
            ) : viewMode === 'kanban' ? (
                <KanbanBoard
                    projects={sortedProjects}
                    statuses={statuses || []}
                    transactions={transactions}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onAddTransaction={handleTransactionClick}
                    onManageSelection={handleSelectionClick}
                    onPaymentDetails={handlePaymentDetailsClick}
                />
            ) : (
                <div className={cn(
                    "grid gap-4",
                    viewMode === 'grid'
                        ? cardSize === 'sm'
                            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                            : cardSize === 'lg'
                                ? "grid-cols-1 md:grid-cols-2"
                                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "grid-cols-1"
                )}>
                    {sortedProjects.map((project) => {
                        // Ödeme durumu hesaplama
                        const projectIncome = transactions
                            ?.filter(t => t.type === 'income' && t.project_id === project.id)
                            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
                        const isPaymentComplete = (project.price || 0) > 0 && projectIncome >= (project.price || 0);

                        // Gecikmiş ödeme kontrolü
                        let isOverdue = false;
                        if (project.project_installments && transactions) {
                            let remainingPaid = projectIncome;
                            isOverdue = project.project_installments.some(inst => {
                                if (remainingPaid >= inst.amount) {
                                    remainingPaid -= inst.amount;
                                    return false;
                                } else {
                                    remainingPaid = 0;
                                    return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                }
                            });
                        }

                        return (
                            <div
                                key={project.id}
                                onClick={(e) => {
                                    // Prevent navigation if clicking on dropdown triggers or buttons
                                    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) return;
                                    navigate(`/projects/${project.id}`)
                                }}
                                className={cn(
                                    "group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer",
                                    isOverdue
                                        ? "border-red-300 bg-red-50/50 dark:bg-red-950/20 ring-2 ring-red-400"
                                        : isPaymentComplete
                                            ? "border-green-200 bg-green-50/50"
                                            : "",
                                    viewMode === 'list' ? "flex items-center p-4 gap-4" : "p-0 overflow-hidden flex flex-col"
                                )}
                            >
                                {viewMode === 'grid' ? (
                                    <>
                                        {/* Type Header */}
                                        {project.project_types && (
                                            <div className={cn("w-full px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-center border-b", project.project_types.color)}>
                                                {project.project_types.label}
                                            </div>
                                        )}

                                        {/* Status Header/Strip */}
                                        <div className={cn("w-full px-4 py-1 text-xs font-bold text-center border-b", getStatusColor(project.status_id))}>
                                            {getStatusLabel(project.status_id)}
                                        </div>

                                        <div className="p-5 flex flex-col gap-4 flex-1">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold leading-none tracking-tight text-lg">{project.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{project.client_name}</p>
                                                </div>
                                                <ProjectActions
                                                    project={project}
                                                    onEdit={handleEditClick}
                                                    onDelete={handleDeleteClick}
                                                    onAddTransaction={handleTransactionClick}
                                                    onManageSelection={handleSelectionClick}
                                                    onPaymentDetails={handlePaymentDetailsClick}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-sm mt-auto">
                                                <div className="flex items-center text-muted-foreground">
                                                    <Calendar className="mr-1 h-3.5 w-3.5" />
                                                    {project.start_date ? format(new Date(project.start_date), 'd MMM yyyy', { locale: tr }) : '-'}
                                                </div>
                                                <div className="font-medium">
                                                    {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                                                </div>
                                            </div>

                                            {/* Footer Alerts */}
                                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t min-h-[40px]">
                                                {/* @ts-ignore */}
                                                {(project.photo_selections?.status === 'completed' || (Array.isArray(project.photo_selections) && project.photo_selections[0]?.status === 'completed')) && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 animate-in fade-in zoom-in" title="Müşteri seçimini tamamladı">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span className="hidden xl:inline">Seçim Tamam</span>
                                                    </div>
                                                )}
                                                {/* @ts-ignore */}
                                                {(() => {
                                                    const sel = Array.isArray(project.photo_selections) ? project.photo_selections[0] : project.photo_selections;
                                                    const isExpired = sel?.settings?.expiration_date && new Date() > new Date(new Date(sel.settings.expiration_date).setHours(23, 59, 59, 999));

                                                    if (isExpired && sel?.status !== 'completed') {
                                                        return (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-in fade-in zoom-in" title="Seçim süresi doldu">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="hidden xl:inline">Süre Doldu</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                {(() => {
                                                    if (!project.project_installments || !transactions) return null;

                                                    const projectIncome = transactions
                                                        .filter(t => t.type === 'income' && t.project_id === project.id)
                                                        .reduce((sum, t) => sum + (t.amount || 0), 0);

                                                    let remainingPaid = projectIncome;
                                                    const isOverdue = project.project_installments.some(inst => {
                                                        if (remainingPaid >= inst.amount) {
                                                            remainingPaid -= inst.amount;
                                                            return false;
                                                        } else {
                                                            remainingPaid = 0;
                                                            return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                                        }
                                                    });

                                                    if (isOverdue) {
                                                        return (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-in fade-in zoom-in animate-pulse" title="Gecikmiş Ödeme Var">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                <span className="hidden xl:inline">Ödeme Gecikti</span>
                                                            </div>
                                                        );
                                                    }

                                                    // Payment Completed Check
                                                    if ((project.price || 0) > 0 && projectIncome >= (project.price || 0)) {
                                                        return (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200 animate-in fade-in zoom-in" title="Ödeme Tamamlandı">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span className="hidden xl:inline">Ödeme Tamam</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Left Column: Type & Status */}
                                        <div className="flex flex-col gap-1.5 shrink-0 w-24 items-center self-start pt-1">
                                            {project.project_types && (
                                                <div className={cn("w-full py-1 rounded-sm text-[9px] font-extrabold uppercase tracking-widest text-center border shadow-sm", project.project_types.color)}>
                                                    {project.project_types.label}
                                                </div>
                                            )}
                                            <div className={cn("w-full py-0.5 rounded-full text-[10px] font-bold text-center border shadow-sm", getStatusColor(project.status_id))}>
                                                {getStatusLabel(project.status_id)}
                                            </div>
                                        </div>

                                        {/* Title & Client */}
                                        <div className="flex-1 min-w-0 pl-2">
                                            <h3 className="font-semibold truncate text-base">{project.title}</h3>
                                            <p className="text-sm text-muted-foreground truncate">{project.client_name}</p>
                                        </div>

                                        {/* Tags */}
                                        <div className="hidden xl:flex items-center gap-2 shrink-0">
                                            {/* @ts-ignore */}
                                            {(project.photo_selections?.status === 'completed' || (Array.isArray(project.photo_selections) && project.photo_selections[0]?.status === 'completed')) && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200" title="Müşteri seçimini tamamladı">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span className="hidden lg:inline">Seçildi</span>
                                                </div>
                                            )}
                                            {(() => {
                                                const income = transactions
                                                    ?.filter(t => t.type === 'income' && t.project_id === project.id)
                                                    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
                                                const price = project.price || 0;

                                                if (price > 0 && income >= price) {
                                                    return (
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200" title="Ödeme Tamamlandı">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span className="hidden lg:inline">Ödendi</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {/* Date/Price */}
                                        <div className="hidden md:flex items-center text-sm text-muted-foreground w-32">
                                            <Calendar className="mr-1 h-3.5 w-3.5" />
                                            {project.start_date ? format(new Date(project.start_date), 'd MMM yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="hidden md:block font-medium w-24 text-right">
                                            {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                                        </div>

                                        <ProjectActions
                                            project={project}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                            onAddTransaction={handleTransactionClick}
                                            onManageSelection={handleSelectionClick}
                                            onPaymentDetails={handlePaymentDetailsClick}
                                        />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )
            }

            <ProjectDialog
                isOpen={isProjectDialogOpen}
                onClose={() => setIsProjectDialogOpen(false)}
                projectToEdit={projectToEdit}
            />

            <TransactionDialog
                isOpen={isTransactionDialogOpen}
                onClose={() => setIsTransactionDialogOpen(false)}
                defaultProjectId={projectForTransaction?.id}
            />

            <SelectionManagerDialog
                isOpen={isSelectionDialogOpen}
                onClose={() => setIsSelectionDialogOpen(false)}
                project={projectForSelection}
            />

            <PaymentDetailsDialog
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                project={projectForPayment}
            />

            <StatusManagerDialog
                isOpen={isStatusManagerOpen}
                onClose={() => setIsStatusManagerOpen(false)}
            />

            <TypeManagerDialog
                isOpen={isTypeManagerOpen}
                onClose={() => setIsTypeManagerOpen(false)}
            />

            {projectForTransaction && (
                <TransactionDialog
                    isOpen={isTransactionDialogOpen}
                    onClose={() => {
                        setIsTransactionDialogOpen(false);
                        setProjectForTransaction(null);
                    }}
                    defaultProjectId={projectForTransaction.id}
                />
            )}

            <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Projeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. "{projectToDelete?.title}" projesi kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
