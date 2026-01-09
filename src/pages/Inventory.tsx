import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInventory, deleteInventoryItem } from '../services/apiInventory';
import { InventoryDialog } from '../components/InventoryDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Box, Wrench, AlertCircle } from 'lucide-react';
import type { InventoryItem } from '../types';
import { cn } from '../lib/utils';

export default function Inventory() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    const queryClient = useQueryClient();
    const { data: inventory, isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: getInventory
    });

    const deleteMutation = useMutation({
        mutationFn: deleteInventoryItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
    });

    const filteredInventory = inventory?.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const totalValue = inventory?.reduce((sum, item) => sum + (Number(item.price) || 0), 0) || 0;
    const maintenanceCount = inventory?.filter(i => i.status === 'maintenance').length || 0;
    const categories = ['All', ...new Set(inventory?.map(i => i.category))];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Ofiste</span>;
            case 'rented': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Kirada</span>;
            case 'maintenance': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">Bakımda</span>;
            case 'lost': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Kayıp</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Envanter</h2>
                    <p className="text-muted-foreground">Stüdyo ekipmanlarını ve demirbaşları yönetin.</p>
                </div>
                <Button onClick={() => { setItemToEdit(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Ekipman
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <Box className="w-4 h-4 mr-2" /> Toplam Ekipman
                    </div>
                    <div className="text-2xl font-bold">{inventory?.length || 0} adet</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <Wrench className="w-4 h-4 mr-2" /> Bakımdaki Ürünler
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{maintenanceCount} adet</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" /> Toplam Değer
                    </div>
                    <div className="text-2xl font-bold">₺{totalValue.toLocaleString('tr-TR')}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Ekipman ara (isim, marka, kategori)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'Tüm Kategoriler' : c}</option>)}
                </select>
            </div>

            {/* Inventory List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventory?.map((item) => (
                    <div key={item.id} className="group relative rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-semibold bg-muted px-2 py-1 rounded uppercase tracking-wider text-muted-foreground">
                                        {item.category}
                                    </span>
                                    {getStatusBadge(item.status)}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setItemToEdit(item); setIsDialogOpen(true); }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) deleteMutation.mutate(item.id); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <h3 className="font-semibold text-lg leading-none mb-1">{item.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{item.brand} {item.model}</p>

                            <div className="border-t pt-4 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Seri No</span>
                                    <span className="font-mono text-xs">{item.serial_number || '-'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-muted-foreground block text-xs">Değer</span>
                                    <span className="font-medium">₺{item.price.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <InventoryDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                itemToEdit={itemToEdit}
            />
        </div>
    );
}
