import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Workflow as WorkflowIcon,
    Mail,
    MessageCircle,
    Pencil,
    Trash2,
    Clock,
    Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { WorkflowDialog } from '../components/WorkflowDialog';
import {
    getWorkflows,
    deleteWorkflow,
    toggleWorkflowStatus
} from '../services/apiWorkflows';
import type { Workflow } from '../types/workflow';
import {
    TRIGGER_EVENT_OPTIONS,
    SCHEDULE_TYPE_OPTIONS,
    SCHEDULE_OFFSET_OPTIONS
} from '../types/workflow';
import { cn } from '../lib/utils';


type FilterType = 'all' | 'active' | 'paused';

const Workflows = () => {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const data = await getWorkflows();
            setWorkflows(data);
        } catch (error) {
            console.error('Error fetching workflows:', error);
            toast.error('İş akışları yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleToggleStatus = async (workflow: Workflow) => {
        try {
            await toggleWorkflowStatus(workflow.id, !workflow.is_active);
            setWorkflows(prev =>
                prev.map(w =>
                    w.id === workflow.id
                        ? { ...w, is_active: !w.is_active }
                        : w
                )
            );
            toast.success(
                workflow.is_active
                    ? 'İş akışı duraklatıldı'
                    : 'İş akışı aktifleştirildi'
            );
        } catch (error) {
            console.error('Error toggling workflow:', error);
            toast.error('Durum değiştirilemedi');
        }
    };

    const handleDelete = async () => {
        if (!deletingWorkflow) return;

        try {
            await deleteWorkflow(deletingWorkflow.id);
            setWorkflows(prev => prev.filter(w => w.id !== deletingWorkflow.id));
            toast.success('İş akışı silindi');
        } catch (error) {
            console.error('Error deleting workflow:', error);
            toast.error('İş akışı silinemedi');
        } finally {
            setDeletingWorkflow(null);
        }
    };

    const handleEdit = (workflow: Workflow) => {
        setEditingWorkflow(workflow);
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingWorkflow(null);
    };

    const handleDialogSuccess = () => {
        fetchWorkflows();
        handleDialogClose();
    };

    const getTriggerLabel = (workflow: Workflow): string => {
        if (workflow.trigger_type === 'event') {
            const event = TRIGGER_EVENT_OPTIONS.find(e => e.value === workflow.trigger_event);
            return event?.label || workflow.trigger_event || 'Bilinmeyen';
        } else {
            const scheduleType = SCHEDULE_TYPE_OPTIONS.find(s => s.value === workflow.schedule_type);
            const offset = SCHEDULE_OFFSET_OPTIONS.find(o => o.value === workflow.schedule_offset);
            return `${offset?.label || ''} ${scheduleType?.label || ''}`.trim();
        }
    };

    const filteredWorkflows = workflows.filter(workflow => {
        const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'active') return matchesSearch && workflow.is_active;
        if (filter === 'paused') return matchesSearch && !workflow.is_active;
        return matchesSearch;
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Bugün';
        if (diffDays === 1) return 'Dün';
        if (diffDays < 7) return `${diffDays} gün önce`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
        return date.toLocaleDateString('tr-TR');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">İş Akışları</h1>
                    <p className="text-muted-foreground">
                        Otomatik mesaj gönderimlerini yönetin
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    İş Akışı Oluştur
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="İş akışlarını ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                    <Button
                        variant={filter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('all')}
                    >
                        Tümü
                    </Button>
                    <Button
                        variant={filter === 'active' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('active')}
                        className="gap-1.5"
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Aktif
                    </Button>
                    <Button
                        variant={filter === 'paused' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('paused')}
                        className="gap-1.5"
                    >
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        Duraklatılmış
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">İş Akışı Adı</TableHead>
                            <TableHead>Tetikleyici</TableHead>
                            <TableHead>Kanallar</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead>Oluşturulma</TableHead>
                            <TableHead className="text-right w-[120px]">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        Yükleniyor...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredWorkflows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <WorkflowIcon className="h-8 w-8" />
                                        <p>Henüz iş akışı bulunmuyor</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsDialogOpen(true)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            İlk İş Akışını Oluştur
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredWorkflows.map((workflow) => (
                                <TableRow key={workflow.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{workflow.name}</span>
                                            {workflow.description && (
                                                <span className="text-sm text-muted-foreground line-clamp-1">
                                                    {workflow.description}
                                                </span>
                                            )}
                                            {!workflow.template_id && (
                                                <span className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                                    ⚠️ Şablon seçilmedi
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {workflow.trigger_type === 'event' ? (
                                                <Zap className="h-4 w-4 text-amber-500" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-blue-500" />
                                            )}
                                            <span className="text-sm">{getTriggerLabel(workflow)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {workflow.channels?.email && (
                                                <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                                    <Mail className="h-3 w-3" />
                                                </div>
                                            )}
                                            {workflow.channels?.whatsapp && (
                                                <div className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                                    <MessageCircle className="h-3 w-3" />
                                                </div>
                                            )}
                                            {!workflow.channels?.email && !workflow.channels?.whatsapp && (
                                                <span className="text-xs text-muted-foreground">Kanal yok</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={workflow.is_active ? "default" : "secondary"}
                                            className={cn(
                                                workflow.is_active
                                                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                                                    : "bg-gray-100 text-gray-600"
                                            )}
                                        >
                                            {workflow.is_active ? 'Aktif' : 'Duraklatılmış'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDate(workflow.created_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            <Switch
                                                checked={workflow.is_active}
                                                onCheckedChange={() => handleToggleStatus(workflow)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(workflow)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeletingWorkflow(workflow)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Workflow Dialog */}
            <WorkflowDialog
                isOpen={isDialogOpen}
                onClose={handleDialogClose}
                onSuccess={handleDialogSuccess}
                workflow={editingWorkflow}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingWorkflow} onOpenChange={() => setDeletingWorkflow(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>İş akışını silmek istediğinizden emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{deletingWorkflow?.name}" iş akışı kalıcı olarak silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Workflows;
