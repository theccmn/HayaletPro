import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClients } from '../services/apiClients';
import { getClientProjects, getClientTransactions, getClientStats } from '../services/apiClientDetails';
import { getStatuses } from '../services/apiStatuses';
import { deleteProject } from '../services/apiProjects';
import {
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Building2,
    User,
    Loader2,
    FolderOpen,
    TrendingUp,
    Clock,
    Pencil,
    FileText,
    MoreVertical,
    Wallet,
    Eye,
    ArrowUpDown,
    Trash2,
    EyeOff,
    AlertTriangle,
    MessageCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { ClientDialog } from '../components/ClientDialog';
import { ProjectDialog } from '../components/ProjectDialog';
import { TransactionDialog } from '../components/TransactionDialog';
import { SelectionManagerDialog } from '../components/SelectionManagerDialog';
import { PaymentDetailsDialog } from '../components/PaymentDetailsDialog';
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
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Project } from '../types';

export default function ClientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Project dialog states
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [projectForTransaction, setProjectForTransaction] = useState<Project | null>(null);
    const [projectForSelection, setProjectForSelection] = useState<Project | null>(null);
    const [projectForPayment, setProjectForPayment] = useState<Project | null>(null);

    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // Müşteri bilgileri
    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: getClients,
    });

    const client = clients?.find(c => c.id === id);

    // Müşteri projeleri
    const { data: projects, isLoading: projectsLoading } = useQuery({
        queryKey: ['clientProjects', id],
        queryFn: () => getClientProjects(id!),
        enabled: !!id,
    });

    // Müşteri transactionları
    const { data: transactions } = useQuery({
        queryKey: ['clientTransactions', id],
        queryFn: () => getClientTransactions(id!),
        enabled: !!id,
    });

    // Müşteri istatistikleri
    const { data: stats } = useQuery({
        queryKey: ['clientStats', id],
        queryFn: () => getClientStats(id!),
        enabled: !!id,
    });

    // Proje durumları
    const { data: statuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
    });

    const getStatusInfo = (statusId: string) => {
        const status = statuses?.find(s => s.id === statusId);
        return status || { label: 'Bilinmiyor', color: '#6b7280' };
    };

    // Proje için alınan ödeme hesapla
    const getProjectPayments = (projectId: string) => {
        const projectTransactions = transactions?.filter(t => t.project_id === projectId && t.type === 'income') || [];
        return projectTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'd MMMM yyyy', { locale: tr });
        } catch {
            return '-';
        }
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientProjects', id] });
            queryClient.invalidateQueries({ queryKey: ['clientStats', id] });
            queryClient.invalidateQueries({ queryKey: ['clientTransactions', id] });
            setProjectToDelete(null);
        },
        onError: (error) => {
            console.error('Silme hatası:', error);
        }
    });

    // Proje aksiyon handler'ları
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

    if (!client) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4 flex-1">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                        {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{client.name}</h1>
                        {client.company && (
                            <p className="text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-4 w-4" /> {client.company}
                            </p>
                        )}
                    </div>
                </div>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Düzenle
                </Button>
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Projeler</p>
                            <p className="text-2xl font-bold">{stats?.totalProjects || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Alınan Ödeme</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalPaid || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Kalan Ödeme</p>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.totalRemaining || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Toplam Değer</p>
                            <p className="text-2xl font-bold">{formatCurrency(stats?.totalProjectValue || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ana İçerik */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kişi Detayları */}
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" /> Kişi Detayları
                    </h2>
                    <div className="space-y-4">
                        {client.phone && (
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Phone className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Telefon</p>
                                    <a href={`tel:${client.phone}`} className="font-medium hover:text-primary transition-colors">
                                        {client.phone}
                                    </a>
                                </div>
                            </div>
                        )}
                        {client.email && (
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">E-posta</p>
                                    <a href={`mailto:${client.email}`} className="font-medium hover:text-primary transition-colors break-all">
                                        {client.email}
                                    </a>
                                </div>
                            </div>
                        )}
                        {client.address && (
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                    <MapPin className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Adres</p>
                                    <p className="font-medium">{client.address}</p>
                                </div>
                            </div>
                        )}
                        {client.notes && (
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground mb-1">Notlar</p>
                                <p className="text-sm">{client.notes}</p>
                            </div>
                        )}
                        {!client.phone && !client.email && !client.address && !client.notes && (
                            <p className="text-muted-foreground text-sm">Henüz iletişim bilgisi eklenmemiş.</p>
                        )}
                    </div>

                    {/* Hızlı Aksiyonlar */}
                    <div className="mt-6 pt-4 border-t flex gap-2">
                        {client.phone && (
                            <Button variant="outline" size="sm" className="flex-1" asChild>
                                <a href={`tel:${client.phone}`}>
                                    <Phone className="mr-2 h-3 w-3" /> Ara
                                </a>
                            </Button>
                        )}
                        {client.phone && (
                            <Button variant="outline" size="sm" className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50" asChild>
                                <a
                                    href={`https://wa.me/${client.phone.replace(/\D/g, '').replace(/^0/, '90')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="mr-2 h-3 w-3" /> WhatsApp
                                </a>
                            </Button>
                        )}
                        {client.email && (
                            <Button variant="outline" size="sm" className="flex-1" asChild>
                                <a href={`mailto:${client.email}`}>
                                    <Mail className="mr-2 h-3 w-3" /> E-posta
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Projeler */}
                <div className="lg:col-span-2 rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" /> Projeler
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowCompleted(!showCompleted)}
                                title={showCompleted ? "Tamamlananları Gizle" : "Tamamlananları Göster"}
                                className={`h-8 w-8 ${showCompleted ? "bg-primary/10 text-primary" : ""}`}
                            >
                                {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Link to="/projects">
                                <Button variant="outline" size="sm">
                                    Tüm Projeler
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {projectsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : projects?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Henüz proje bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {projects?.filter((project) => {
                                // Tamamlanan projeleri filtrele
                                if (!showCompleted) {
                                    const status = statuses?.find(s => s.id === project.status_id);
                                    if (status?.label?.toLowerCase() === 'tamamlandı') return false;
                                }
                                return true;
                            }).map((project) => {
                                const status = getStatusInfo(project.status_id);
                                const paid = getProjectPayments(project.id);
                                const total = project.price || 0;
                                const remaining = total - paid;
                                const progress = total > 0 ? (paid / total) * 100 : 0;
                                const isPaymentComplete = total > 0 && remaining <= 0;

                                // Gecikmiş ödeme kontrolü
                                let isOverdue = false;
                                if (project.project_installments) {
                                    let remainingPaid = paid;
                                    const sortedInstallments = [...project.project_installments].sort((a: any, b: any) =>
                                        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                                    );

                                    isOverdue = sortedInstallments.some(inst => {
                                        if (remainingPaid >= inst.amount) {
                                            remainingPaid -= inst.amount;
                                            return false; // Paid, not overdue
                                        }
                                        // Not fully paid. Check if overdue.
                                        // Note: We do NOT reset remainingPaid here, so if there was 
                                        // partial money left, it could pay a later smaller installment.
                                        return new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                    });
                                }

                                return (
                                    <div
                                        key={project.id}
                                        className={`rounded-lg border p-4 hover:bg-muted/50 transition-colors ${isOverdue
                                            ? 'ring-2 ring-red-400 border-red-300 bg-red-50/50 dark:bg-red-950/20'
                                            : isPaymentComplete
                                                ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold truncate">{project.title}</h3>
                                                    <span
                                                        className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                                                        style={{
                                                            backgroundColor: `${status.color}20`,
                                                            color: status.color
                                                        }}
                                                    >
                                                        {status.label}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-pulse">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Ödeme Gecikti
                                                        </span>
                                                    )}
                                                </div>
                                                {project.start_date && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(project.start_date)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600">
                                                    {formatCurrency(paid)}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    / {formatCurrency(total)}
                                                </p>
                                            </div>
                                            {/* Project Actions Dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePaymentDetailsClick(project)}>
                                                        <Wallet className="mr-2 h-4 w-4" />
                                                        Ödeme Planı
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSelectionClick(project)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Fotoğraf Seçimi
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleTransactionClick(project)}>
                                                        <ArrowUpDown className="mr-2 h-4 w-4" />
                                                        Gelir/Gider Ekle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Düzenle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(project)}
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Sil
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Ödeme İlerleme Çubuğu */}
                                        {total > 0 && (
                                            <div className="mt-3">
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>Ödeme Durumu</span>
                                                    <span>{remaining > 0 ? `${formatCurrency(remaining)} kalan` : 'Tamamlandı'}</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Düzenleme Dialog */}
            <ClientDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                clientToEdit={client}
            />

            {/* Project Dialogs */}
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
        </div>
    );
}
