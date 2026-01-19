import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, deleteClient } from '../services/apiClients';
import { Plus, Search, Loader2, MoreVertical, Pencil, Trash2, Phone, Mail, MapPin, Building2, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientDialog } from '../components/ClientDialog';
import type { Client } from '../types';
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

export default function Clients() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const queryClient = useQueryClient();

    const { data: clients, isLoading, error } = useQuery({
        queryKey: ['clients'],
        queryFn: getClients,
    });

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

    const filteredClients = clients?.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>
                    <p className="text-muted-foreground">Müşteri portföyünüzü ve iletişim bilgilerinizi yönetin.</p>
                </div>
                <Button onClick={handleCreateClick}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Müşteri ara (isim, firma, e-posta...)"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredClients?.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Müşteri bulunamadı</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {searchTerm ? 'Aramanızla eşleşen sonuç yok.' : 'Henüz hiç müşteri eklemediniz.'}
                    </p>
                    {!searchTerm && (
                        <Button onClick={handleCreateClick}>
                            <Plus className="mr-2 h-4 w-4" /> Müşteri Ekle
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredClients?.map((client) => (
                        <div
                            key={client.id}
                            className="group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md p-6 cursor-pointer"
                            onClick={() => navigate(`/clients/${client.id}`)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold leading-none">{client.name}</h3>
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

                            <div className="mt-4 pt-4 border-t flex items-center gap-2">
                                {client.phone && (
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                        <a href={`tel:${client.phone}`}>
                                            <Phone className="mr-2 h-3 w-3" /> Ara
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
                    ))}
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
