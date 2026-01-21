import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, deleteProject } from '../services/apiProjects';
import { getTransactions } from '../services/apiFinance';
import { getStatuses } from '../services/apiStatuses';
import { getPackages } from '../services/apiPackages';
import {
    ArrowLeft,
    Calendar,
    CreditCard,
    Pencil,
    Trash2,
    User,
    Phone,
    Mail,
    CheckCircle2,
    Clock,
    FileText,
    Building2,
    MoreVertical,
    Wallet, // Restored
    Eye,
    ArrowUpDown, // Restored
    Tag,
    MapPin
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ProjectDialog } from '../components/ProjectDialog';
import { PaymentDetailsDialog } from '../components/PaymentDetailsDialog';
import { TransactionDialog } from '../components/TransactionDialog';
import { SelectionManagerDialog } from '../components/SelectionManagerDialog';
import type { Transaction } from '../types';
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

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<any | null>(null);

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: () => getProject(id!),
        enabled: !!id,
    });

    const { data: statuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
    });

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    const { data: packages } = useQuery({
        queryKey: ['packages'],
        queryFn: getPackages,
    });

    const getStatusInfo = (statusId: string) => {
        const status = statuses?.find(s => s.id === statusId);
        return status || { label: 'Bilinmiyor', color: 'bg-gray-100' };
    };

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            navigate('/projects');
        },
    });

    if (isLoading || !project) {
        return <div className="p-8 text-center">Yükleniyor...</div>;
    }

    const projectTransactions: Transaction[] = transactions?.filter((t: Transaction) => t.project_id === project.id && t.type === 'income') || [];
    const paidAmount = projectTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalAmount = project.price || 0;
    const remainingAmount = totalAmount - paidAmount;
    const statusInfo = getStatusInfo(project.status_id);
    const client = project.clients;

    const isCompleted = statusInfo.label?.toLowerCase() === 'tamamlandı';

    const confirmDelete = () => {
        if (projectToDelete) {
            deleteMutation.mutate(projectToDelete.id);
        }
    };

    return (
        <div className={cn(
            "flex flex-col gap-6 animate-in fade-in-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 min-h-[calc(100vh-4rem)]",
            isCompleted ? "bg-green-50/40" : ""
        )}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{project.title}</h1>
                            <div className={cn("px-3 py-1 rounded-full text-xs font-bold border shadow-sm", statusInfo.color)}>
                                {statusInfo.label}
                            </div>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            {client?.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {client.company}</span>}
                            {client?.company && <span>•</span>}
                            <User className="w-3 h-3" /> {client ? client.name : project.client_name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsSelectionDialogOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" /> Fotoğraf Seçimi
                    </Button>
                    <Button variant="outline" onClick={() => setIsProjectDialogOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Düzenle
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setProjectToDelete(project)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Top Stats Cards (Financials Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Proje Toplamı</span>
                    </div>
                    <div className="text-2xl font-bold">
                        {totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                    </div>
                    {project.project_types && (
                        <div className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-2", project.project_types.color)}>
                            {project.project_types.label}
                        </div>
                    )}
                </div>

                <div className="p-5 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Tahsil Edilen</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        {paidAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Kaydedilen tüm ödemeler
                    </div>
                </div>

                <div className="p-5 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Kalan Tutar</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                        {remainingAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Toplam tutar eksi tahsilat
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Client & Summary */}
                <div className="space-y-6">
                    {/* Project Summary */}
                    <div className="border rounded-xl bg-card/80 backdrop-blur-sm p-5 shadow-sm">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <Tag className="w-4 h-4" /> Proje Özeti
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Başlangıç</span>
                                <span className="font-medium">{project.start_date ? format(new Date(project.start_date), 'd MMMM yyyy', { locale: tr }) : '-'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Bitiş</span>
                                <span className={cn(
                                    "font-medium flex items-center gap-1.5",
                                    !isCompleted ? "text-green-600" : ""
                                )}>
                                    {isCompleted ? (
                                        <>
                                            {project.end_date ? format(new Date(project.end_date), 'd MMMM yyyy', { locale: tr }) : '-'}
                                            <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Bitti</span>
                                        </>
                                    ) : (
                                        "Devam ediyor"
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Teslim Tarihi</span>
                                <span className="font-medium">
                                    {project.delivery_date ? format(new Date(project.delivery_date), 'd MMMM yyyy', { locale: tr }) : '-'}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Mekan Türü</span>
                                <span className="font-medium">
                                    {project.location_types ? (
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: project.location_types.color || '#e5e7eb' }}
                                            />
                                            {project.location_types.label}
                                        </div>
                                    ) : '-'}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Mekan</span>
                                <div className="font-medium text-right">
                                    {project.locations ? (
                                        <div>{project.locations.name}</div>
                                    ) : null}
                                    {project.location_name && (
                                        <div className="text-xs text-muted-foreground">{project.location_name}</div>
                                    )}
                                    {!project.locations && !project.location_name && '-'}
                                </div>
                            </div>
                        </div>
                        <div className="pt-2">
                            <div className="text-muted-foreground mb-1">Paket İçeriği ve Detaylar</div>
                            <div className="p-3 bg-muted/50 rounded-lg text-sm">
                                {(() => {
                                    // 1. Try to find matching standard package
                                    // Current format from Dialog: "Paket: Standard Paket"
                                    const packageNameMatch = project.details?.match(/^Paket:\s*(.+)$/);
                                    const packageName = packageNameMatch ? packageNameMatch[1] : null;
                                    const matchedPackage = packageName ? packages?.find(p => p.name === packageName) : null;

                                    if (matchedPackage) {
                                        return (
                                            <div>
                                                <div className="font-semibold mb-2 text-primary">{matchedPackage.name}</div>
                                                <ul className="space-y-1.5">
                                                    {matchedPackage.features?.map((feature: string, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2 text-muted-foreground text-xs">
                                                            <div className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    }

                                    // 2. Try to handle "Özel Paket" format
                                    // Format: "Özel Paket: feat1, feat2, feat3"
                                    const customPackageMatch = project.details?.match(/^Özel Paket:\s*(.+)$/);
                                    if (customPackageMatch) {
                                        const features = customPackageMatch[1].split(',').map(s => s.trim());
                                        return (
                                            <div>
                                                <div className="font-semibold mb-2 text-primary">Özel Paket</div>
                                                <ul className="space-y-1.5">
                                                    {features.map((feature: string, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2 text-muted-foreground text-xs">
                                                            <div className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    }

                                    // 3. Fallback to raw text
                                    return (
                                        <div className="leading-relaxed whitespace-pre-wrap font-medium text-xs">
                                            {project.details || '-'}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Client Card */}
                    {client && (
                        <div className="border rounded-xl bg-card/80 backdrop-blur-sm p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <User className="w-4 h-4" /> Müşteri Bilgileri
                                </h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium">{client.name}</div>
                                        <div className="text-xs text-muted-foreground">{client.company}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4 pt-4 border-t">
                                    {client.phone && (
                                        <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                                            <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {client.phone}
                                        </a>
                                    )}
                                    {client.email && (
                                        <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                                            <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {client.email}
                                        </a>
                                    )}
                                    {client.address && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {client.address}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-4">
                                    {client.phone && (
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => window.open(`tel:${client.phone}`)}>
                                            Ara
                                        </Button>
                                    )}
                                    {client.phone && (
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => window.open(`https://wa.me/${client.phone?.replace(/[^0-9]/g, '')}`)}>
                                            WhatsApp
                                        </Button>
                                    )}
                                    {client.email && (
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => window.open(`mailto:${client.email}`)}>
                                            Mail
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Center/Right Column: Payments & Installments */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Payments Section */}
                    <div className="border rounded-xl bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
                        <div className="p-5 border-b flex items-center justify-between bg-muted/20">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> Ödemeler ve Taksitler
                            </h3>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-8" onClick={() => setIsTransactionDialogOpen(true)}>
                                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" /> İşlem Ekle
                                </Button>
                                <Button size="sm" className="h-8" onClick={() => setIsPaymentDialogOpen(true)}>
                                    <Wallet className="w-3.5 h-3.5 mr-1.5" /> Planı Yönet
                                </Button>
                            </div>
                        </div>

                        <div className="p-5">
                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Ödeme İlerlemesi</span>
                                    <span className="font-medium">%{totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}</span>
                                </div>
                                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all" style={{ width: `${totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0}%` }} />
                                </div>
                            </div>

                            {/* Installments List Preview */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Taksit Planı</h4>
                                {project.project_installments && project.project_installments.length > 0 ? (
                                    <div className="grid gap-2">
                                        {project.project_installments.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map((inst: any) => {
                                            return (
                                                <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{format(new Date(inst.due_date), 'd MMM yyyy', { locale: tr })}</div>
                                                            <div className="text-xs text-muted-foreground">{inst.notes || 'Taksit ödemesi'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-bold">
                                                        {inst.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">
                                        Henüz ödeme planı oluşturulmamış.
                                    </div>
                                )}
                            </div>

                            {/* Recent Transactions Preview */}
                            {projectTransactions.length > 0 && (
                                <div className="mt-8 pt-6 border-t">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Son İşlemler</h4>
                                    <div className="space-y-2">
                                        {projectTransactions.slice(0, 3).map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between text-sm py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    <span>{t.date ? format(new Date(t.date), 'd MMM', { locale: tr }) : '-'}</span>
                                                    <span className="text-muted-foreground">•</span>
                                                    <span className="text-muted-foreground">{t.description || 'Ödeme'}</span>
                                                </div>
                                                <span className="font-medium text-green-600">
                                                    +{t.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <ProjectDialog
                isOpen={isProjectDialogOpen}
                onClose={() => setIsProjectDialogOpen(false)}
                projectToEdit={project}
            />

            {
                project && (
                    <PaymentDetailsDialog
                        isOpen={isPaymentDialogOpen}
                        onClose={() => setIsPaymentDialogOpen(false)}
                        project={project}
                    />
                )
            }

            <TransactionDialog
                isOpen={isTransactionDialogOpen}
                onClose={() => setIsTransactionDialogOpen(false)}
                defaultProjectId={project.id}
            />

            <SelectionManagerDialog
                isOpen={isSelectionDialogOpen}
                onClose={() => setIsSelectionDialogOpen(false)}
                project={project}
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
