import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInventory, deleteInventoryItem, getCategories } from '../services/apiInventory';
import { InventoryDialog } from '../components/InventoryDialog';
import { CategoryManagerDialog } from '../components/inventory/CategoryManagerDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, Edit, Trash2, Box, Wrench, AlertCircle, Settings, LayoutGrid, List, Download } from 'lucide-react';
import type { InventoryItem } from '../types';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Inventory() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'>('name');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const queryClient = useQueryClient();

    const { data: inventory } = useQuery({
        queryKey: ['inventory'],
        queryFn: getInventory
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['inventory-categories'],
        queryFn: getCategories,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteInventoryItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
    });

    // Group and Sort Logic
    const sortedCategories = useMemo(() => {
        if (!inventory || !categories) return [];

        // 1. Filter items first
        const filteredItems = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        // 2. Sort items
        const sortItems = (items: InventoryItem[]) => {
            return [...items].sort((a, b) => {
                switch (sortBy) {
                    case 'name': return a.name.localeCompare(b.name);
                    case 'price_asc': return a.price - b.price;
                    case 'price_desc': return b.price - a.price;
                    case 'date_asc': return (a.purchase_date || '').localeCompare(b.purchase_date || '');
                    case 'date_desc': return (b.purchase_date || '').localeCompare(a.purchase_date || '');
                    default: return 0;
                }
            });
        };

        // 3. Group by category (preserving category order)
        // Also include a "Other" category for items with categories not in our list
        const grouped = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            items: sortItems(filteredItems.filter(i => i.category === cat.name))
        }));

        // Handle items with unknown categories
        const knownCategoryNames = new Set(categories.map(c => c.name));
        const otherItems = filteredItems.filter(i => !knownCategoryNames.has(i.category));

        if (otherItems.length > 0) {
            grouped.push({
                id: 'others',
                name: 'Diğer / Kategorisiz',
                items: sortItems(otherItems)
            });
        }

        // Return only groups that have items (unless filtering to a specific one, but UI handles that via `categoryFilter`)
        return grouped.filter(g => g.items.length > 0);

    }, [inventory, categories, searchTerm, categoryFilter, sortBy]);


    const totalValue = inventory?.reduce((sum, item) => sum + (Number(item.price) || 0), 0) || 0;
    const maintenanceCount = inventory?.filter(i => i.status === 'maintenance').length || 0;

    const getStatusBadge = (status: string) => {
        // User requested removing 'Ofiste' specifically to make cards smaller
        if (status === 'available') return null;

        switch (status) {
            case 'rented': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Kirada</span>;
            case 'maintenance': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Bakımda</span>;
            case 'lost': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Kayıp</span>;
            default: return null;
        }
    };

    const handleExportExcel = () => {
        // Flatten all items from sorted categories
        const allItems = sortedCategories.flatMap(c => c.items);

        if (allItems.length === 0) {
            toast.error('Dışa aktarılacak veri yok');
            return;
        }

        const dataToExport = allItems.map(item => ({
            'Ekipman': item.name,
            'Marka': item.brand || '-',
            'Model': item.model || '-',
            'Kategori': item.category,
            'Seri No': item.serial_number || '-',
            'Alış Tarihi': item.purchase_date || '-',
            'Fiyat': item.price,
            'Durum': item.status === 'available' ? 'Ofiste' :
                item.status === 'rented' ? 'Kirada' :
                    item.status === 'maintenance' ? 'Bakımda' : 'Kayıp',
            'Notlar': item.notes || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Envanter Listesi");
        XLSX.writeFile(wb, `Envanter_Listesi_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Envanter</h2>
                    <p className="text-muted-foreground">Stüdyo ekipmanlarını ve demirbaşları yönetin.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="mr-2 h-4 w-4" /> Excel
                    </Button>
                    <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Kategoriler
                    </Button>
                    <Button onClick={() => { setItemToEdit(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" /> Yeni Ekipman
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                        <Box className="w-4 h-4 mr-2" /> Toplam Ekipman
                    </div>
                    <div className="text-2xl font-bold">{inventory?.length || 0} adet</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                        <Wrench className="w-4 h-4 mr-2" /> Bakımdaki Ürünler
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{maintenanceCount} adet</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" /> Toplam Değer
                    </div>
                    <div className="text-2xl font-bold">₺{totalValue.toLocaleString('tr-TR')}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Ekipman ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-1 md:flex-none"
                    >
                        <option value="All">Tüm Kategoriler</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-1 md:flex-none"
                    >
                        <option value="name">İsim (A-Z)</option>
                        <option value="price_desc">Fiyat (Azalan)</option>
                        <option value="price_asc">Fiyat (Artan)</option>
                        <option value="date_desc">Tarih (Yeni)</option>
                        <option value="date_asc">Tarih (Eski)</option>
                    </select>

                    <div className="flex bg-muted rounded-md p-1 border">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-sm transition-all",
                                viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-sm transition-all",
                                viewMode === 'grid' ? "text-muted-foreground hover:text-foreground" : "bg-background shadow-sm text-foreground"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Inventory List Grouped by Category */}
            <div className="space-y-8">
                {sortedCategories.map(category => {
                    const items = category.items;
                    if (items.length === 0) return null;

                    return (
                        <div key={category.id} className="space-y-3">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <h3 className="text-lg font-semibold text-muted-foreground">{category.name}</h3>
                                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                            </div>

                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {items.map((item) => (
                                        <div key={item.id} className="group relative rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all">
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    {/* Show badge ONLY if NOT available */}
                                                    <div className="min-h-[20px]">
                                                        {getStatusBadge(item.status)}
                                                    </div>

                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-card/80 backdrop-blur-sm rounded-md shadow-sm">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => { setItemToEdit(item); setIsDialogOpen(true); }}>
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) deleteMutation.mutate(item.id); }}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <h3 className="font-semibold text-base leading-tight mb-1 truncate" title={item.name}>{item.name}</h3>
                                                <p className="text-xs text-muted-foreground mb-3 truncate" title={`${item.brand} ${item.model}`}>{item.brand} {item.model}</p>

                                                <div className="border-t pt-3 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1 rounded">{item.serial_number || 'SN:-'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-semibold text-sm">₺{item.price.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-md border bg-card">
                                    {items.map((item, index) => (
                                        <div key={item.id} className={cn(
                                            "flex items-center justify-between p-3 hover:bg-muted/50 transition-colors group",
                                            index !== items.length - 1 && "border-b"
                                        )}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <span className="font-medium w-1/4 truncate" title={item.name}>{item.name}</span>
                                                <span className="text-sm text-muted-foreground w-1/6 truncate">{item.brand}</span>
                                                <span className="text-sm text-muted-foreground w-1/6 truncate">{item.model}</span>
                                                <span className="text-xs font-mono text-muted-foreground w-1/6">{item.serial_number || '-'}</span>
                                                <div className="w-1/6">
                                                    {getStatusBadge(item.status)}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className="font-medium text-sm w-24 text-right">₺{item.price.toLocaleString()}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setItemToEdit(item); setIsDialogOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) deleteMutation.mutate(item.id); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {sortedCategories.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        Kriterlere uygun ekipman bulunamadı.
                    </div>
                )}
            </div>

            <InventoryDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                itemToEdit={itemToEdit}
            />

            <CategoryManagerDialog
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
            />
        </div>
    );
}
