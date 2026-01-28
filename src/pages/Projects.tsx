import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProject, getProjects, updateProjectStatus } from '../services/apiProjects';
import type { Project } from '../types';
import { Plus, LayoutGrid, List as ListIcon, Loader2, Calendar, MoreVertical, Pencil, Trash2, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Wallet, Settings2, Kanban as KanbanIcon, CheckCircle2, ZoomIn, ZoomOut, Clock, Search, AlertTriangle, Tag, Map, MapPin, MousePointerClick } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { cn, calculateDuration } from '../lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProjectDialog } from '../components/ProjectDialog';
import { KanbanBoard } from '../components/KanbanBoard';
import { getStatuses } from '../services/apiStatuses';
import { TypeManagerDialog } from '../components/TypeManagerDialog';
import { StatusManagerDialog } from '../components/StatusManagerDialog';
import { SelectionManagerDialog } from '../components/SelectionManagerDialog';
import { PaymentDetailsDialog } from '../components/PaymentDetailsDialog';
import { LocationTypeManagerDialog } from '../components/LocationTypeManagerDialog';
import { LocationManagerDialog } from '../components/LocationManagerDialog';
import { getTransactions } from '../services/apiFinance';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { filterProjectsByDate, type TimeFilter } from '../utils/dateFilters';
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
    const [searchParams] = useSearchParams();
    const timeFilter = searchParams.get('timeFilter') as TimeFilter | null;

    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
    const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>('md');
    const [sortBy, setSortBy] = useState<string>('date_desc');
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
    const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
    const [isLocationTypeManagerOpen, setIsLocationTypeManagerOpen] = useState(false);
    const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
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
        mutationFn: ({ id, status, oldStatus }: { id: string; status: string; oldStatus?: string }) =>
            updateProjectStatus(id, status, oldStatus),
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

    const handleStatusChange = (projectId: string, newStatus: string, oldStatus?: string) => {
        updateStatusMutation.mutate({ id: projectId, status: newStatus, oldStatus });
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

    const filteredProjects = projects?.filter(_p => {
        // Time Filter (URL param)
        if (timeFilter) {
            // Re-use logic from dateFilters via utility
            // But since we need to filter inside this loop along with other conditions, 
            // checking it here is cleaner or we can pre-filter `projects`.
            // Let's pre-filter mostly, but here we can just use the utility for the single item check 
            // OR simpler: check if it's in the filtered list.

            // Performance-wise, let's filter purely by ID inclusion or better yet:
            // Modify logic to check date range manually or use utility on the side.
            // Since `filterProjectsByDate` takes an array, let's use it outside or check dates here.

            // Easiest approach given we are inside .filter(): check date manually using date-fns isWithinInterval 
            // matching the utility logic. BUT we imported the utility. 
            // Let's stick to the utility. Since we can't easily use array-filter utility inside item-filter,
            // let's do this: 
            // 1. If timeFilter is set, first verify this project is in the valid date range.
            // Actually, let's move the `projects?.filter` to `(timeFilter ? filterProjectsByDate(projects, timeFilter) : projects)?.filter...` 
            // checks.
            return true;
        }
        return true;
    }).filter(p => {
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

    // Apply Time Filter strictly
    const timeFilteredProjects = timeFilter && filteredProjects
        ? filterProjectsByDate(filteredProjects, timeFilter)
        : filteredProjects;

    // Sort
    const sortedProjects = timeFilteredProjects ? [...timeFilteredProjects].sort((a, b) => {
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
            case 'name_desc':
                return b.title.localeCompare(a.title);
            case 'client_asc':
                return a.client_name.localeCompare(b.client_name);
            case 'client_desc':
                return b.client_name.localeCompare(a.client_name);
            case 'type_asc':
                return (a.project_types?.label || '').localeCompare(b.project_types?.label || '');
            case 'type_desc':
                return (b.project_types?.label || '').localeCompare(a.project_types?.label || '');
            case 'package_asc':
                {
                    const pkgA = a.details ? (a.details.split('|')[0].replace('Paket:', '').trim()) : '';
                    const pkgB = b.details ? (b.details.split('|')[0].replace('Paket:', '').trim()) : '';
                    return pkgA.localeCompare(pkgB);
                }
            case 'package_desc':
                {
                    const pkgA = a.details ? (a.details.split('|')[0].replace('Paket:', '').trim()) : '';
                    const pkgB = b.details ? (b.details.split('|')[0].replace('Paket:', '').trim()) : '';
                    return pkgB.localeCompare(pkgA);
                }
            case 'status':
            case 'status_asc':
                {
                    const statusA = statuses?.find(s => s.id === a.status_id);
                    const statusB = statuses?.find(s => s.id === b.status_id);
                    return (statusA?.order || 0) - (statusB?.order || 0);
                }
            case 'status_desc':
                {
                    const statusA = statuses?.find(s => s.id === a.status_id);
                    const statusB = statuses?.find(s => s.id === b.status_id);
                    return (statusB?.order || 0) - (statusA?.order || 0);
                }
            case 'alerts_asc':
            case 'alerts_desc':
                {
                    const getAlertWeight = (p: Project) => {
                        let weight = 0;

                        // 1. Payment Overdue (Highest Priority)
                        const pIncome = transactions?.filter(t => t.type === 'income' && t.project_id === p.id)
                            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

                        // Payment status
                        let isOverdue = false;
                        if (p.project_installments && transactions) {
                            let remainingPaid = pIncome;
                            const sortedInstallments = [...p.project_installments].sort((x: any, y: any) =>
                                new Date(x.due_date).getTime() - new Date(y.due_date).getTime()
                            );
                            isOverdue = sortedInstallments.some(inst => {
                                if (remainingPaid >= inst.amount) {
                                    remainingPaid -= inst.amount;
                                    return false;
                                }
                                return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                            });
                        }
                        if (isOverdue) weight += 50;

                        // 2. Delivery Overdue
                        const status = statuses?.find(s => s.id === p.status_id);
                        const isProjectCompleted = status?.label?.toLowerCase() === 'tamamlandı' || status?.label?.toLowerCase() === 'iptal';

                        let isDeliveryOverdue = false;
                        let isDeliveryApproaching = false;

                        if (p.delivery_date && !isProjectCompleted) {
                            const deliveryDate = new Date(p.delivery_date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const diffTime = deliveryDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (diffDays < 0) isDeliveryOverdue = true;
                            else if (diffDays <= 7) isDeliveryApproaching = true;
                        }
                        if (isDeliveryOverdue) weight += 40;
                        if (isDeliveryApproaching) weight += 20;

                        // 3. Selection Status
                        // @ts-ignore
                        const selection = Array.isArray(p.photo_selections) ? p.photo_selections[0] : p.photo_selections;
                        const selStatus = selection?.status;
                        const isExpired = selection?.settings?.expiration_date && new Date() > new Date(new Date(selection.settings.expiration_date).setHours(23, 59, 59, 999));

                        if (isExpired && selStatus !== 'completed') weight += 35;
                        if (selStatus === 'selecting' || selStatus === 'waiting' || selStatus === 'viewed') weight += 10;
                        if (selStatus === 'completed') weight += 5;

                        return weight;
                    };

                    const weightA = getAlertWeight(a);
                    const weightB = getAlertWeight(b);

                    return sortBy === 'alerts_asc' ? weightA - weightB : weightB - weightA;
                }
            default:
                return 0;
        }
    }) : [];

    const toggleSort = (field: string) => {
        if (sortBy === `${field}_asc`) {
            setSortBy(`${field}_desc`);
        } else {
            setSortBy(`${field}_asc`);
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy === `${field}_asc`) return <ArrowUp className="ml-1 h-3 w-3" />;
        if (sortBy === `${field}_desc`) return <ArrowDown className="ml-1 h-3 w-3" />;
        return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
                    <p className="text-muted-foreground">
                        {timeFilter
                            ? `${timeFilter === 'all' ? 'Tüm zamanların' :
                                timeFilter === 'day' ? 'Bugünün' :
                                    timeFilter === 'week' ? 'Bu haftanın' :
                                        timeFilter === 'month' ? 'Bu ayın' :
                                            timeFilter === 'year' ? 'Bu yılın' : ''} projeleri görüntüleniyor.`
                            : 'Tüm stüdyo çekimlerinizi buradan yönetin.'}
                    </p>
                    {timeFilter && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => navigate('/projects')}
                        >
                            Filtreyi Temizle
                        </Button>
                    )}
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
                    <Button variant="outline" size="icon" onClick={() => setIsLocationTypeManagerOpen(true)} title="Mekan Türlerini Yönet">
                        <Map className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setIsLocationManagerOpen(true)} title="Mekanları Yönet">
                        <MapPin className="h-4 w-4" />
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
                viewMode === 'list' ? (
                    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 border-b backdrop-blur-sm">
                                <tr>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('name')}>
                                        <div className="flex items-center">Proje <SortIcon field="name" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('client')}>
                                        <div className="flex items-center">Müşteri <SortIcon field="client" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('type')}>
                                        <div className="flex items-center">Tür <SortIcon field="type" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('date')}>
                                        <div className="flex items-center">Tarih <SortIcon field="date" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('price')}>
                                        <div className="flex items-center">Tutar <SortIcon field="price" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('package')}>
                                        <div className="flex items-center">Paket <SortIcon field="package" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('status')}>
                                        <div className="flex items-center">Durum <SortIcon field="status" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider cursor-pointer hover:text-foreground hover:bg-slate-100 transition-colors" onClick={() => toggleSort('alerts')}>
                                        <div className="flex items-center">Uyarılar <SortIcon field="alerts" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider text-right">#</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sortedProjects.map((project) => {
                                    // Ödeme durumu hesaplama
                                    const projectIncome = transactions
                                        ?.filter(t => t.type === 'income' && t.project_id === project.id)
                                        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

                                    // Gecikme hesaplama
                                    let isOverdue = false;
                                    if (project.project_installments && transactions) {
                                        let remainingPaid = projectIncome;
                                        const sortedInstallments = [...project.project_installments].sort((a: any, b: any) =>
                                            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                                        );

                                        isOverdue = sortedInstallments.some(inst => {
                                            if (remainingPaid >= inst.amount) {
                                                remainingPaid -= inst.amount;
                                                return false;
                                            }
                                            return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                        });
                                    }

                                    // Teslim tarihi kontrolü
                                    const status = statuses?.find(s => s.id === project.status_id);
                                    const isProjectCompleted = status?.label?.toLowerCase() === 'tamamlandı' || status?.label?.toLowerCase() === 'iptal';

                                    let isDeliveryOverdue = false;
                                    let isDeliveryApproaching = false;

                                    if (project.delivery_date && !isProjectCompleted) {
                                        const deliveryDate = new Date(project.delivery_date);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const diffTime = deliveryDate.getTime() - today.getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                        if (diffDays < 0) isDeliveryOverdue = true;
                                        else if (diffDays <= 7) isDeliveryApproaching = true;
                                    }

                                    return (
                                        <tr
                                            key={project.id}
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) return;
                                                navigate(`/projects/${project.id}`)
                                            }}
                                            className={cn(
                                                "group hover:bg-slate-50 transition-colors cursor-pointer",
                                                isOverdue ? "bg-red-50 hover:bg-red-100" : ""
                                            )}
                                        >
                                            <td className="px-4 py-3 font-bold text-slate-700">
                                                {project.title}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700">{project.client_name}</div>
                                                {project.phone && <div className="text-xs text-muted-foreground">{project.phone}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {project.project_types ? (
                                                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border", project.project_types.color)}>
                                                        {project.project_types.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                                                {project.start_date ? format(new Date(project.start_date), 'd MMM yyyy', { locale: tr }) : '-'}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800 hidden sm:table-cell">
                                                {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate" title={project.details}>
                                                {project.details ? (project.details.split('|')[0].replace('Paket:', '').trim()) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", getStatusColor(project.status_id))}>
                                                    {getStatusLabel(project.status_id)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {(() => {
                                                        // @ts-ignore
                                                        const selection = Array.isArray(project.photo_selections) ? project.photo_selections[0] : project.photo_selections;
                                                        const status = selection?.status;

                                                        if (status === 'completed') {
                                                            return (
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200" title="Müşteri seçimini tamamladı">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                                    <span className="hidden lg:inline truncate">Seçim Tamam</span>
                                                                </div>
                                                            );
                                                        }

                                                        if (status === 'selecting' || status === 'waiting' || status === 'viewed') {
                                                            return (
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200" title="Müşteri Seçiyor">
                                                                    <MousePointerClick className="w-2.5 h-2.5" />
                                                                    <span className="hidden lg:inline truncate">Müşteri Seçiyor</span>
                                                                </div>
                                                            );
                                                        }

                                                        return null;
                                                    })()}
                                                    {isOverdue && (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold border border-red-200" title="Ödeme Gecikti">
                                                            <AlertTriangle className="w-2.5 h-2.5" />
                                                            <span className="hidden lg:inline truncate">Ödeme Gecikti</span>
                                                        </div>
                                                    )}
                                                    {isDeliveryOverdue && (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200" title="Teslim Tarihi Geçti">
                                                            <AlertTriangle className="w-2.5 h-2.5" />
                                                            <span className="hidden lg:inline truncate">Teslim Gecikti</span>
                                                        </div>
                                                    )}
                                                    {isDeliveryApproaching && (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200" title="Teslim Tarihi Yaklaşıyor">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            <span className="hidden lg:inline truncate">Teslim Yaklaşıyor</span>
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        // @ts-ignore
                                                        const sel = Array.isArray(project.photo_selections) ? project.photo_selections[0] : project.photo_selections;
                                                        const isExpired = sel?.settings?.expiration_date && new Date() > new Date(new Date(sel.settings.expiration_date).setHours(23, 59, 59, 999));

                                                        if (isExpired && sel?.status !== 'completed') {
                                                            return (
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold border border-red-200" title="Seçim süresi doldu">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    <span className="hidden lg:inline truncate">Süre Doldu</span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <ProjectActions
                                                    project={project}
                                                    onEdit={handleEditClick}
                                                    onDelete={handleDeleteClick}
                                                    onAddTransaction={handleTransactionClick}
                                                    onManageSelection={handleSelectionClick}
                                                    onPaymentDetails={handlePaymentDetailsClick}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                                const sortedInstallments = [...project.project_installments].sort((a: any, b: any) =>
                                    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                                );

                                isOverdue = sortedInstallments.some(inst => {
                                    if (remainingPaid >= inst.amount) {
                                        remainingPaid -= inst.amount;
                                        return false;
                                    }
                                    // Not fully paid. Check if overdue without clearing remainingPaid
                                    return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                });
                            }

                            // Teslim tarihi kontrolü
                            const status = statuses?.find(s => s.id === project.status_id);
                            const isProjectCompleted = status?.label?.toLowerCase() === 'tamamlandı' || status?.label?.toLowerCase() === 'iptal';

                            let isDeliveryOverdue = false;
                            let isDeliveryApproaching = false;

                            if (project.delivery_date && !isProjectCompleted) {
                                const deliveryDate = new Date(project.delivery_date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const diffTime = deliveryDate.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                if (diffDays < 0) isDeliveryOverdue = true;
                                else if (diffDays <= 7) isDeliveryApproaching = true;
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
                                                : isDeliveryOverdue
                                                    ? "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 ring-2 ring-orange-400"
                                                    : "",
                                        "p-0 overflow-hidden flex flex-col"
                                    )}
                                >
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
                                            <div className="flex items-center text-muted-foreground text-xs">
                                                <Calendar className="mr-1 h-3.5 w-3.5" />
                                                <span>
                                                    {project.start_date ? format(new Date(project.start_date), 'd MMM yyyy', { locale: tr }) : '-'}
                                                    {project.start_date && project.end_date && (
                                                        <span className="ml-1 text-muted-foreground/70">
                                                            ({calculateDuration(project.start_date, project.end_date)})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="font-medium">
                                                {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                                            </div>
                                        </div>

                                        {/* Footer Alerts */}
                                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t min-h-[40px]">
                                            {/* @ts-ignore */}
                                            {/* @ts-ignore */}
                                            {(() => {
                                                const selection = Array.isArray(project.photo_selections) ? project.photo_selections[0] : project.photo_selections;
                                                const status = selection?.status;

                                                if (status === 'completed') {
                                                    return (
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 animate-in fade-in zoom-in" title="Müşteri seçimini tamamladı">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span className="hidden xl:inline">Seçim Tamam</span>
                                                        </div>
                                                    );
                                                }

                                                if (status === 'selecting' || status === 'waiting' || status === 'viewed') {
                                                    return (
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 animate-in fade-in zoom-in" title="Müşteri seçim yapıyor">
                                                            <MousePointerClick className="w-3 h-3" />
                                                            <span className="hidden xl:inline">Müşteri Seçiyor</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {isDeliveryOverdue && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 animate-in fade-in zoom-in animate-pulse" title="Teslim Tarihi Geçti">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span className="hidden xl:inline">Teslim Gecikti</span>
                                                </div>
                                            )}
                                            {isDeliveryApproaching && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 animate-in fade-in zoom-in" title="Teslim Tarihi Yaklaşıyor">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="hidden xl:inline">Teslim Yaklaşıyor</span>
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
                                                const sortedInstallments = [...project.project_installments].sort((a: any, b: any) =>
                                                    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                                                );

                                                const isOverdue = sortedInstallments.some(inst => {
                                                    if (remainingPaid >= inst.amount) {
                                                        remainingPaid -= inst.amount;
                                                        return false;
                                                    }
                                                    return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
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


                                    {/* Location Type Strip */}
                                    {(() => {
                                        // @ts-ignore
                                        const locType = Array.isArray(project.location_types) ? project.location_types[0] : project.location_types;
                                        if (!locType) return null;
                                        return (
                                            <div className={cn("w-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-center border-t", locType.color)}>
                                                {locType.label}
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                )
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

            <LocationTypeManagerDialog
                isOpen={isLocationTypeManagerOpen}
                onClose={() => setIsLocationTypeManagerOpen(false)}
            />

            <LocationManagerDialog
                isOpen={isLocationManagerOpen}
                onClose={() => setIsLocationManagerOpen(false)}
            />

            {
                projectForTransaction && (
                    <TransactionDialog
                        isOpen={isTransactionDialogOpen}
                        onClose={() => {
                            setIsTransactionDialogOpen(false);
                            setProjectForTransaction(null);
                        }}
                        defaultProjectId={projectForTransaction.id}
                    />
                )
            }

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
