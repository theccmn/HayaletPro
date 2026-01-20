import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, deleteClient } from '../services/apiClients';
import { getProjects } from '../services/apiProjects';
import { getStatuses } from '../services/apiStatuses';
import { getTransactions } from '../services/apiFinance';
import { Plus, Search, Loader2, MoreVertical, Pencil, Trash2, Phone, Mail, MapPin, Building2, User, Eye, EyeOff, ArrowUpDown, Calendar, Wallet, FolderKanban, Users, UserCheck, UserX, MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientDialog } from '../components/ClientDialog';
import type { Client } from '../types';
import { cn } from '../lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
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

type SortOption = 'name_asc' | 'name_desc' | 'upcoming_project' | 'upcoming_payment' | 'project_count';

export default function Clients() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [showPassive, setShowPassive] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('name_asc');

    const queryClient = useQueryClient();

    const { data: clients, isLoading: isLoadingClients, error } = useQuery({
        queryKey: ['clients'],
        queryFn: getClients,
    });

    const { data: projects, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: statuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
    });

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    const isLoading = isLoadingClients || isLoadingProjects;

    const deleteMutation = useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setClientToDelete(null);
        },
        onError: (error) => {
            console.error('Silme hatası:', error);
        }
    });

    // Helper: Tamamlandı status ID'sini bul
    const completedStatusId = useMemo(() => {
        return statuses?.find(s => s.label?.toLowerCase() === 'tamamlandı')?.id;
    }, [statuses]);

    // Helper: Müşterinin aktif olup olmadığını kontrol et
    const isClientActive = (clientId: string): boolean => {
        if (!projects || !completedStatusId) return true; // Veri yoksa aktif say

        const clientProjects = projects.filter(p => p.client_id === clientId);

        // Hiç projesi yoksa pasif
        if (clientProjects.length === 0) return false;

        // En az bir tamamlanmamış projesi varsa aktif
        return clientProjects.some(p => p.status_id !== completedStatusId);
    };

    // Helper: Müşterinin proje sayısını al
    const getClientProjectCount = (clientId: string): number => {
        if (!projects) return 0;
        return projects.filter(p => p.client_id === clientId).length;
    };

    // Helper: Müşterinin yaklaşan proje tarihini al
    const getClientNextProjectDate = (clientId: string): Date | null => {
        if (!projects || !completedStatusId) return null;

        const now = new Date();
        const clientProjects = projects
            .filter(p => p.client_id === clientId && p.status_id !== completedStatusId && p.start_date)
            .map(p => new Date(p.start_date!))
            .filter(d => d >= now)
            .sort((a, b) => a.getTime() - b.getTime());

        return clientProjects[0] || null;
    };

    // Helper: Müşterinin yaklaşan ödeme tarihini al
    const getClientNextPaymentDate = (clientId: string): Date | null => {
        if (!projects || !transactions) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const clientProjects = projects.filter(p => p.client_id === clientId);

        let nextPaymentDate: Date | null = null;

        for (const project of clientProjects) {
            if (!project.project_installments) continue;

            // Proje için yapılan toplam ödeme
            const projectIncome = transactions
                .filter(t => t.type === 'income' && t.project_id === project.id)
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            let remainingPaid = projectIncome;

            for (const inst of project.project_installments) {
                if (remainingPaid >= inst.amount) {
                    remainingPaid -= inst.amount;
                } else {
                    const dueDate = new Date(inst.due_date);
                    if (!nextPaymentDate || dueDate < nextPaymentDate) {
                        nextPaymentDate = dueDate;
                    }
                    break;
                }
            }
        }

        return nextPaymentDate;
    };

    // İstatistikler
    const stats = useMemo(() => {
        if (!clients) return { total: 0, active: 0, passive: 0 };

        let active = 0;
        let passive = 0;

        clients.forEach(client => {
            if (isClientActive(client.id)) {
                active++;
            } else {
                passive++;
            }
        });

        return { total: clients.length, active, passive };
    }, [clients, projects, completedStatusId]);

    const handleCreateClick = () => {
        setClientToEdit(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (client: Client) => {
        setClientToEdit(client);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (client: Client) => {
        setClientToDelete(client);
    };

    const confirmDelete = () => {
        if (clientToDelete) {
            deleteMutation.mutate(clientToDelete.id);
        }
    };

    // Filtreleme ve Sıralama
    const filteredAndSortedClients = useMemo(() => {
        if (!clients) return [];

        // 1. Aktif/Pasif Filtreleme
        let result = clients.filter(client => {
            const isActive = isClientActive(client.id);
            if (!showPassive && !isActive) return false;
            return true;
        });

        // 2. Arama Filtreleme
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            result = result.filter(client =>
                client.name.toLowerCase().includes(query) ||
                client.company?.toLowerCase().includes(query) ||
                client.email?.toLowerCase().includes(query) ||
                client.phone?.includes(searchTerm)
            );
        }

        // 3. Sıralama
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name_asc':
                    return a.name.localeCompare(b.name, 'tr');
                case 'name_desc':
                    return b.name.localeCompare(a.name, 'tr');
                case 'upcoming_project': {
                    const dateA = getClientNextProjectDate(a.id);
                    const dateB = getClientNextProjectDate(b.id);
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return dateA.getTime() - dateB.getTime();
                }
                case 'upcoming_payment': {
                    const dateA = getClientNextPaymentDate(a.id);
                    const dateB = getClientNextPaymentDate(b.id);
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return dateA.getTime() - dateB.getTime();
                }
                case 'project_count':
                    return getClientProjectCount(b.id) - getClientProjectCount(a.id);
                default:
                    return 0;
            }
        });

        return result;
    }, [clients, projects, transactions, searchTerm, showPassive, sortBy, completedStatusId]);

    const getSortLabel = (sort: SortOption): string => {
        switch (sort) {
            case 'name_asc': return 'İsim (A-Z)';
            case 'name_desc': return 'İsim (Z-A)';
            case 'upcoming_project': return 'Yaklaşan Proje';
            case 'upcoming_payment': return 'Yaklaşan Ödeme';
            case 'project_count': return 'Proje Sayısı';
            default: return 'Sırala';
        }
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

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>
                    <p className="text-muted-foreground">Müşteri portföyünüzü ve iletişim bilgilerinizi yönetin.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Sıralama Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1">
                                <ArrowUpDown className="h-4 w-4" />
                                <span className="hidden sm:inline">{getSortLabel(sortBy)}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortBy('name_asc')}>
                                <User className="mr-2 h-4 w-4" /> İsim (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('name_desc')}>
                                <User className="mr-2 h-4 w-4" /> İsim (Z-A)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSortBy('upcoming_project')}>
                                <Calendar className="mr-2 h-4 w-4" /> Yaklaşan Proje
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('upcoming_payment')}>
                                <Wallet className="mr-2 h-4 w-4" /> Yaklaşan Ödeme
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSortBy('project_count')}>
                                <FolderKanban className="mr-2 h-4 w-4" /> Proje Sayısı
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Pasif Müşterileri Göster/Gizle */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassive(!showPassive)}
                        title={showPassive ? "Pasif Müşterileri Gizle" : "Pasif Müşterileri Göster"}
                        className={cn("h-9 w-9", showPassive ? "bg-primary/10 text-primary" : "")}
                    >
                        {showPassive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>

                    <Button onClick={handleCreateClick}>
                        <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri
                    </Button>
                </div>
            </div>

            {/* Mini Stat Kartları */}
            <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200/80">
                        <Users className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                        <span className="text-xl font-bold text-slate-800">{stats.total}</span>
                        <span className="text-xs text-slate-500 font-medium ml-1">Toplam</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 shadow-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-200/80">
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                        <span className="text-xl font-bold text-green-700">{stats.active}</span>
                        <span className="text-xs text-green-600 font-medium ml-1">Aktif</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-200 shadow-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-200/80">
                        <UserX className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                        <span className="text-xl font-bold text-red-600">{stats.passive}</span>
                        <span className="text-xs text-red-500 font-medium ml-1">Pasif</span>
                    </div>
                </div>
            </div>

            {/* Arama */}

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Müşteri ara (isim, firma, e-posta...)"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredAndSortedClients?.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Müşteri bulunamadı</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {searchTerm ? 'Aramanızla eşleşen sonuç yok.' : !showPassive && stats.passive > 0 ? 'Tüm aktif müşteriler görüntüleniyor. Pasif müşterileri görmek için göz simgesine tıklayın.' : 'Henüz hiç müşteri eklemediniz.'}
                    </p>
                    {!searchTerm && stats.total === 0 && (
                        <Button onClick={handleCreateClick}>
                            <Plus className="mr-2 h-4 w-4" /> Müşteri Ekle
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredAndSortedClients?.map((client) => {
                        const isActive = isClientActive(client.id);
                        const projectCount = getClientProjectCount(client.id);
                        const nextProject = getClientNextProjectDate(client.id);
                        const nextPayment = getClientNextPaymentDate(client.id);
                        const isPaymentOverdue = nextPayment && nextPayment < new Date();

                        return (
                            <div
                                key={client.id}
                                className={cn(
                                    "group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md p-6 cursor-pointer",
                                    !isActive && "opacity-60 border-dashed bg-muted/30"
                                )}
                                onClick={() => navigate(`/clients/${client.id}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-lg",
                                            isActive ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-500"
                                        )}>
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold leading-none">{client.name}</h3>
                                                {/* Aktif/Pasif Badge */}
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                    isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-500"
                                                )}>
                                                    {isActive ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </div>
                                            {client.company && (
                                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Building2 className="h-3 w-3" /> {client.company}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground -mr-2 -mt-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(client)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteClick(client)}
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4 opacity-70" />
                                            <span>{client.phone}</span>
                                        </div>
                                    )}
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground break-all">
                                            <Mail className="h-4 w-4 opacity-70" />
                                            <span>{client.email}</span>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4 opacity-70 mt-0.5" />
                                            <span className="line-clamp-2">{client.address}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Proje ve Ödeme Bilgileri */}
                                <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2">
                                    {/* Proje Sayısı */}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                                        <FolderKanban className="h-3 w-3" />
                                        <span>{projectCount} proje</span>
                                    </div>

                                    {/* Yaklaşan Ödeme Uyarısı */}
                                    {isPaymentOverdue && (
                                        <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full animate-pulse">
                                            <Wallet className="h-3 w-3" />
                                            <span>Gecikmiş ödeme</span>
                                        </div>
                                    )}

                                    {/* Yaklaşan Proje */}
                                    {nextProject && !isPaymentOverdue && (
                                        <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                            <Calendar className="h-3 w-3" />
                                            <span>{nextProject.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Hızlı Eylemler */}
                                <div className="mt-3 flex items-center gap-2">
                                    {client.phone && (
                                        <Button variant="outline" size="sm" className="flex-1" asChild>
                                            <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()}>
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
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MessageCircle className="mr-2 h-3 w-3" /> WhatsApp
                                            </a>
                                        </Button>
                                    )}
                                    {client.email && (
                                        <Button variant="outline" size="sm" className="flex-1" asChild>
                                            <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}>
                                                <Mail className="mr-2 h-3 w-3" /> E-posta
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ClientDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                clientToEdit={clientToEdit}
            />

            <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Müşteriyi silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{clientToDelete?.name}" adlı müşteri ve ilgili tüm veriler silinecektir. Bu işlem geri alınamaz.
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
