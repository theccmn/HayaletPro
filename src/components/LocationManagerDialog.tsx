import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLocation, deleteLocation, getLocations } from '../services/apiLocations';
import { Plus, Trash2, MapPin } from 'lucide-react';
import type { Location } from '../types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";

interface LocationManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LocationManagerDialog({ isOpen, onClose }: LocationManagerDialogProps) {
    const queryClient = useQueryClient();
    const [newLocationName, setNewLocationName] = useState('');
    const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: getLocations,
        staleTime: 0
    });

    const createMutation = useMutation({
        mutationFn: createLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            toast.success('Mekan eklendi');
        },
        onError: (error) => {
            toast.error('Mekan eklenirken hata: ' + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            toast.success('Mekan silindi');
        },
        onError: (error) => {
            toast.error('Silme hatası: ' + error.message);
        }
    });

    const handleCreate = () => {
        if (!newLocationName.trim()) return;
        createMutation.mutate({
            name: newLocationName,
            order_index: (locations?.length || 0)
        });
        setNewLocationName('');
    };

    const handleDelete = (id: string) => {
        setLocationToDelete(id);
    };

    const confirmDelete = () => {
        if (locationToDelete) {
            deleteMutation.mutate(locationToDelete);
            setLocationToDelete(null);
        }
    };

    return (
        <>
            <Dialog isOpen={isOpen} onClose={onClose} title="Mekan Yönetimi" description="Çekim mekanlarını ekleyin veya silin.">
                <div className="mt-4 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Yeni mekan adı..."
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <Button onClick={handleCreate} disabled={!newLocationName.trim()}>
                            <Plus className="h-4 w-4 mr-2" /> Ekle
                        </Button>
                    </div>

                    <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                        {locations?.map((location) => (
                            <div key={location.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{location.name}</span>
                                </div>
                                <button
                                    type="button"
                                    className="h-8 w-8 flex items-center justify-center rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(location.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {(!locations || locations.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Henüz mekan eklenmedi</p>
                        </div>
                    )}
                </div>
            </Dialog>

            <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mekanı Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu mekanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
