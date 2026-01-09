import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProject, getProjects, updateProjectStatus } from '../services/apiProjects';
import type { Project } from '../types';
import { Plus, LayoutGrid, List as ListIcon, Loader2, Calendar, MoreVertical, Pencil, Trash2, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Wallet, Settings2, Kanban as KanbanIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProjectDialog } from '../components/ProjectDialog';
import { KanbanBoard } from '../components/KanbanBoard';
import { getStatuses } from '../services/apiStatuses';
import { StatusManagerDialog } from '../components/StatusManagerDialog';
import { SelectionManagerDialog } from '../components/SelectionManagerDialog';
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
    onManageSelection
}: {
    project: Project;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onAddTransaction: (project: Project) => void;
    onManageSelection: (project: Project) => void;
}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onManageSelection(project)}>
                <Eye className="mr-2 h-4 w-4" />
                Fotoğraf Seçimi
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddTransaction(project)}>
                <Wallet className="mr-2 h-4 w-4" />
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
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('kanban');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'name_asc'>('date_desc');
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // State for Dialogs
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [projectForTransaction, setProjectForTransaction] = useState<Project | null>(null);
    const [projectForSelection, setProjectForSelection] = useState<Project | null>(null);

    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);

    const queryClient = useQueryClient();

    const { data: projects, isLoading: isLoadingProjects, error } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: statuses, isLoading: isLoadingStatuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
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
        if (showCompleted) return true;
        const status = statuses?.find(s => s.id === p.status_id);
        return status?.label?.toLowerCase() !== 'tamamlandı';
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
                    <Button onClick={handleCreateClick}>
                        <Plus className="mr-2 h-4 w-4" /> Yeni Proje
                    </Button>
                </div>
            </div>

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
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onAddTransaction={handleTransactionClick}
                    onManageSelection={handleSelectionClick}
                />
            ) : (
                <div className={cn(
                    "grid gap-4",
                    viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                )}>
                    {sortedProjects.map((project) => (
                        <div
                            key={project.id}
                            className={cn(
                                "group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md",
                                viewMode === 'list' ? "flex items-center p-4 gap-4" : "p-6"
                            )}
                        >
                            {viewMode === 'grid' ? (
                                <>
                                    <div className="flex items-start justify-between">
                                        <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", getStatusColor(project.status_id))}>
                                            {getStatusLabel(project.status_id)}
                                        </div>
                                        <ProjectActions
                                            project={project}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                            onAddTransaction={handleTransactionClick}
                                            onManageSelection={handleSelectionClick}
                                        />
                                    </div>

                                    <div className="mt-4 space-y-1">
                                        <h3 className="font-semibold leading-none tracking-tight">{project.title}</h3>
                                        <p className="text-sm text-muted-foreground">{project.client_name}</p>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between text-sm">
                                        <div className="flex items-center text-muted-foreground">
                                            <Calendar className="mr-1 h-3.5 w-3.5" />
                                            {project.start_date ? format(new Date(project.start_date), 'd MMM yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="font-medium">
                                            {project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '₺0'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={cn("shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold w-24 text-center", getStatusColor(project.status_id))}>
                                        {getStatusLabel(project.status_id)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{project.title}</h3>
                                        <p className="text-sm text-muted-foreground truncate">{project.client_name}</p>
                                    </div>
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
                                    />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

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

            <StatusManagerDialog
                isOpen={isStatusManagerOpen}
                onClose={() => setIsStatusManagerOpen(false)}
            />

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
