
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackages, deletePackage } from '../services/apiPackages';
import { getSetting, updateSetting } from '../services/apiSettings';
import { getTemplates, deleteTemplate } from '../services/apiTemplates';
import type { MessageTemplate } from '../services/apiTemplates';
import { PackageDialog } from '../components/PackageDialog';
import { ContractSettingsDialog } from '../components/ContractSettingsDialog';
import { GoogleCalendarSettings } from '../components/GoogleCalendarSettings';
import { MailSettings } from '../components/MailSettings';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Edit, Trash2, Package as PackageIcon, Settings as SettingsIcon, Database, Save, CheckCircle, FileText, Mail, Loader2 } from 'lucide-react';
import type { Package } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Settings() {
    const [activeTab, setActiveTab] = useState<'packages' | 'integrations' | 'contract' | 'templates'>('packages');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Package | null>(null);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        if (activeTab === 'templates') {
            loadTemplates();
        }
    }, [activeTab]);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('Şablonlar yüklenirken hata oluştu');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
            try {
                await deleteTemplate(id);
                toast.success('Şablon silindi');
                loadTemplates();
            } catch (error) {
                toast.error('Silme işlemi başarısız');
            }
        }
    };


    // Integrations State
    const [driveApiKey, setDriveApiKey] = useState('');
    const [showSavedkey, setShowSavedKey] = useState(false);

    const queryClient = useQueryClient();
    const { data: packages } = useQuery({
        queryKey: ['packages'],
        queryFn: getPackages
    });

    useEffect(() => {
        const loadSettings = async () => {
            const key = await getSetting('google_drive_api_key');
            if (key) setDriveApiKey(key);
        };
        loadSettings();
    }, []);

    const handleSaveKey = async () => {
        if (!driveApiKey.trim()) {
            toast.error('Lütfen geçerli bir API anahtarı girin.');
            return;
        }
        try {
            await updateSetting('google_drive_api_key', driveApiKey);
            toast.success('Google Drive API anahtarı başarıyla kaydedildi.');
            setShowSavedKey(true);
            setTimeout(() => setShowSavedKey(false), 2000);
        } catch (error) {
            console.error('Failed to save API key:', error);
            toast.error('Ayarlar kaydedilirken bir hata oluştu.');
        }
    };

    const deleteMutation = useMutation({
        mutationFn: deletePackage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
        }
    });

    const renderPackagesTab = () => (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-medium">Hizmet Paketleri</h3>
                    <p className="text-sm text-muted-foreground">Proje oluştururken seçilebilecek hazır paketleri yönetin.</p>
                </div>
                <Button onClick={() => { setItemToEdit(null); setIsDialogOpen(true); }} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Paket
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages?.map(pkg => (
                    <div key={pkg.id} className="group relative border rounded-xl p-5 hover:border-primary/50 transition-colors bg-card">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-semibold text-lg">{pkg.name}</h4>
                                <div className="text-primary font-bold">₺{pkg.price.toLocaleString('tr-TR')}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-card shadow-sm border rounded-lg p-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setItemToEdit(pkg); setIsDialogOpen(true); }}>
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => { if (confirm('Bu paketi silmek istediğinize emin misiniz?')) deleteMutation.mutate(pkg.id); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                        <div className="space-y-1">
                            {pkg.features?.map((feature, i) => (
                                <div key={i} className="text-xs bg-muted/50 px-2 py-1 rounded text-muted-foreground flex items-center">
                                    <div className="w-1 h-1 rounded-full bg-primary mr-2" />
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderIntegrationsTab = () => (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h3 className="text-lg font-medium">Entegrasyon Ayarları</h3>
                <p className="text-sm text-muted-foreground">Harici servis bağlantılarını buradan yönetin.</p>
            </div>

            <div className="grid gap-6 max-w-2xl">
                {/* Google Calendar Settings */}
                <GoogleCalendarSettings />

                {/* Mail Settings */}
                <MailSettings />

                {/* Google Drive Settings */}
                <div className="p-6 border rounded-xl bg-card space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Database size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold">Google Drive API</h4>
                            <p className="text-xs text-muted-foreground">Fotoğraf seçim modülü için gereklidir.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>API Anahtarı (API Key)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="password"
                                value={driveApiKey}
                                onChange={(e) => setDriveApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="font-mono"
                            />
                            <Button onClick={handleSaveKey} className="min-w-[100px]">
                                {showSavedkey ? <CheckCircle size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
                                {showSavedkey ? 'Kaydedildi' : 'Kaydet'}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Bu anahtar güvenli bir şekilde veritabanında saklanır.
                            Google Cloud Console üzerinden "Drive API" servisini aktif edip bir API Key almalısınız.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContractTab = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h3 className="text-lg font-medium">Sözleşme Şablonu</h3>
                <p className="text-sm text-muted-foreground">Proje oluştururken kullanılan sözleşme şablonunu ve görsel ayarlarını düzenleyin.</p>
            </div>

            <div className="p-6 border rounded-xl bg-card space-y-4 max-w-2xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold">Sözleşme Şablonu Ayarları</h4>
                        <p className="text-xs text-muted-foreground">Logo, yazı tipi, firma bilgileri ve şablon metnini düzenleyin.</p>
                    </div>
                </div>
                <Button onClick={() => setIsContractDialogOpen(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Şablonu Düzenle
                </Button>
            </div>
        </div>
    );

    const renderTemplatesTab = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Mesaj Şablonları</h3>
                    <p className="text-sm text-muted-foreground">E-posta ve mesaj şablonlarınızı buradan yönetin.</p>
                </div>
                <Button onClick={() => window.location.href = '/templates/new'} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Şablon
                </Button>
            </div>

            {loadingTemplates ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.length === 0 && (
                        <div className="col-span-full text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                            Henüz şablon oluşturulmamış.
                        </div>
                    )}
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="border rounded-xl p-5 bg-card hover:border-primary/50 transition-colors group relative"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3">
                                    <Mail size={20} />
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-white border rounded-lg shadow-sm">
                                    <button
                                        onClick={() => window.location.href = `/templates/${template.id}`}
                                        className="text-gray-500 hover:text-indigo-600 p-1.5 hover:bg-gray-50 rounded-l-lg border-r"
                                        title="Düzenle"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                                        className="text-gray-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-r-lg"
                                        title="Sil"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="font-semibold text-lg mb-1 truncate" title={template.name}>{template.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                                {template.description || 'Açıklama yok'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className={`px-2 py-0.5 rounded-full ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {template.is_active ? 'Aktif' : 'Pasif'}
                                </span>
                                <span>• {new Date(template.updated_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-1">
                <h2 className="text-2xl font-bold tracking-tight mb-6 px-2">Ayarlar</h2>
                <button
                    onClick={() => setActiveTab('packages')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        activeTab === 'packages' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <PackageIcon className="h-4 w-4" />
                    Paket Yönetimi
                </button>
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        activeTab === 'integrations' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <SettingsIcon className="h-4 w-4" />
                    Entegrasyonlar
                </button>
                <button
                    onClick={() => setActiveTab('contract')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        activeTab === 'contract' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <FileText className="h-4 w-4" />
                    Sözleşme Şablonu
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        activeTab === 'templates' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <Mail className="h-4 w-4" />
                    Mesaj Şablonları
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 bg-card rounded-xl border shadow-sm p-6 min-h-[500px]">
                {activeTab === 'packages' && renderPackagesTab()}
                {activeTab === 'integrations' && renderIntegrationsTab()}
                {activeTab === 'contract' && renderContractTab()}
                {activeTab === 'templates' && renderTemplatesTab()}
            </div>

            <PackageDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                itemToEdit={itemToEdit}
            />

            <ContractSettingsDialog
                isOpen={isContractDialogOpen}
                onClose={() => setIsContractDialogOpen(false)}
            />
        </div>
    );
}
