import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjectInventoryItems, addProjectInventoryItem, removeProjectInventoryItem, getCategories, getInventory } from '../../services/apiInventory';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Loader2, Plus, Trash2, Download, Package } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ProjectInventoryManagerProps {
    projectId: string;
    projectTitle: string;
}

export function ProjectInventoryManager({ projectId, projectTitle }: ProjectInventoryManagerProps) {
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');

    // Queries
    const { data: projectItems = [], isLoading } = useQuery({
        queryKey: ['project-inventory', projectId],
        queryFn: () => getProjectInventoryItems(projectId),
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['inventory-categories'],
        queryFn: getCategories,
        enabled: isAddDialogOpen,
    });

    const { data: allInventory = [] } = useQuery({
        queryKey: ['inventory'],
        queryFn: getInventory,
        enabled: isAddDialogOpen && !!selectedCategory,
    });

    // Filter available items for selection based on category and status
    const availableItems = useMemo(() => {
        if (!selectedCategory) return [];
        // Filter by category AND status=available (or check if already added, though logic allows multiple same items theoretically, usually unique serials matter)
        return allInventory.filter(i =>
            i.category === selectedCategory &&
            i.status === 'available'
            // Exclude items already in this project? Maybe not, if quantity is a thing. But for unique equipment, yes.
            // Let's assume unique items for now, or allow re-adding if logic permits. 
            // Better to filter out items already in the project to avoid duplicates if that's the desired logical flow for "Equipment"
            && !projectItems.some(pi => pi.inventory_item_id === i.id)
        );
    }, [allInventory, selectedCategory, projectItems]);


    // Mutations
    const addMutation = useMutation({
        mutationFn: async () => {
            if (!selectedItemId) throw new Error("No item selected");
            return addProjectInventoryItem(projectId, selectedItemId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-inventory', projectId] });
            // Also invalidate inventory to update status if we change it in future (currently just linking)
            toast.success('Ekipman projeye eklendi');
            setIsAddDialogOpen(false);
            setSelectedItemId('');
        },
        onError: () => toast.error('Eklenirken hata oluştu')
    });

    const removeMutation = useMutation({
        mutationFn: removeProjectInventoryItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-inventory', projectId] });
            toast.success('Ekipman projeden çıkarıldı');
        }
    });

    const handleExportExcel = () => {
        if (projectItems.length === 0) {
            toast.error('Dışa aktarılacak veri yok');
            return;
        }

        const dataToExport = projectItems.map(item => ({
            'Kategori': item.inventory_item?.category || '-',
            'Ekipman': item.inventory_item?.name || '-',
            'Marka': item.inventory_item?.brand || '-',
            'Model': item.inventory_item?.model || '-',
            'Seri No': item.inventory_item?.serial_number || '-',
            'Notlar': item.notes || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Proje Ekipman Listesi");
        XLSX.writeFile(wb, `${projectTitle}_Ekipman_Listesi.xlsx`);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center">
                    <Package className="mr-2 h-5 w-5" /> Proje Ekipmanları
                </h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={projectItems.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Excel İndir
                    </Button>
                    <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Ekipman Ekle
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : projectItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Bu projeye henüz ekipman eklenmemiş.
                    </div>
                ) : (
                    <div className="divide-y">
                        {projectItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-medium">{item.inventory_item?.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {item.inventory_item?.brand} {item.inventory_item?.model}
                                        {item.inventory_item?.serial_number && ` - SN: ${item.inventory_item.serial_number}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                                        {item.inventory_item?.category}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                        onClick={() => {
                                            if (confirm('Bu ekipmanı projeden çıkarmak istediğinize emin misiniz?')) {
                                                removeMutation.mutate(item.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Item Dialog */}
            <Dialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                title="Projeye Ekipman Ekle"
                description="Listeden kategori ve ekipman seçiniz."
            >
                <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Kategori Seçin</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedItemId('');
                            }}
                        >
                            <option value="">Kategori Seçiniz...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>

                    {selectedCategory && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ekipman Seçin (Sadece Ofiste Olanlar)</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                            >
                                <option value="">Ekipman Seçiniz...</option>
                                {availableItems.length === 0 ? (
                                    <option disabled>Bu kategoride uygun ekipman yok</option>
                                ) : (
                                    availableItems.map(i => (
                                        <option key={i.id} value={i.id}>
                                            {i.name} ({i.brand} {i.model}) {i.serial_number ? `- SN:${i.serial_number}` : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>İptal</Button>
                        <Button onClick={() => addMutation.mutate()} disabled={!selectedItemId || addMutation.isPending}>
                            {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ekle
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
