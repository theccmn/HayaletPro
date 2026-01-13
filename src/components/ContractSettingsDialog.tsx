import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
    getContractSettings,
    updateContractSettings,
    uploadContractLogo,
    deleteContractLogo,
    CONTRACT_FONTS,
    CONTRACT_PLACEHOLDERS,
} from '../services/apiContract';
import {
    FileText,
    Upload,
    Trash2,
    Save,
    Loader2,
    Image as ImageIcon,
    Type,
    Info,
    Copy,
    Check
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ContractSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ContractSettingsDialog({ isOpen, onClose }: ContractSettingsDialogProps) {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['contractSettings'],
        queryFn: getContractSettings,
        enabled: isOpen,
    });

    // Local state for editing
    const [templateContent, setTemplateContent] = useState('');
    const [fontFamily, setFontFamily] = useState('Times New Roman');
    const [fontSizeBody, setFontSizeBody] = useState(12);
    const [fontSizeTitle, setFontSizeTitle] = useState(16);
    const [fontSizeHeading, setFontSizeHeading] = useState(14);
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyOwner, setCompanyOwner] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

    // Sync state with fetched settings
    useEffect(() => {
        if (settings) {
            setTemplateContent(settings.template_content || '');
            setFontFamily(settings.font_family || 'Times New Roman');
            setFontSizeBody(settings.font_size_body || 12);
            setFontSizeTitle(settings.font_size_title || 16);
            setFontSizeHeading(settings.font_size_heading || 14);
            setCompanyName(settings.company_name || '');
            setCompanyAddress(settings.company_address || '');
            setCompanyOwner(settings.company_owner || '');
            setLogoUrl(settings.logo_url);
            setLogoPreview(settings.logo_url);
        }
    }, [settings]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!settings?.id) throw new Error('No settings found');

            let finalLogoUrl = logoUrl;

            // Upload new logo if selected
            if (logoFile) {
                // Delete old logo if exists
                if (logoUrl) {
                    try {
                        await deleteContractLogo(logoUrl);
                    } catch (e) {
                        console.warn('Could not delete old logo:', e);
                    }
                }
                finalLogoUrl = await uploadContractLogo(logoFile);
            }

            return updateContractSettings(settings.id, {
                template_content: templateContent,
                font_family: fontFamily,
                font_size_body: fontSizeBody,
                font_size_title: fontSizeTitle,
                font_size_heading: fontSizeHeading,
                company_name: companyName,
                company_address: companyAddress,
                company_owner: companyOwner,
                logo_url: finalLogoUrl,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contractSettings'] });
            setLogoFile(null);
            onClose();
        },
    });

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = async () => {
        if (logoUrl && settings?.id) {
            try {
                await deleteContractLogo(logoUrl);
                await updateContractSettings(settings.id, { logo_url: null });
                setLogoUrl(null);
                setLogoPreview(null);
                setLogoFile(null);
                queryClient.invalidateQueries({ queryKey: ['contractSettings'] });
            } catch (e) {
                console.error('Error removing logo:', e);
            }
        } else {
            setLogoPreview(null);
            setLogoFile(null);
        }
    };

    const copyPlaceholder = (placeholder: string) => {
        navigator.clipboard.writeText(placeholder);
        setCopiedPlaceholder(placeholder);
        setTimeout(() => setCopiedPlaceholder(null), 2000);
    };

    if (isLoading) {
        return (
            <Dialog isOpen={isOpen} onClose={onClose} title="Sözleşme Ayarları" className="max-w-4xl">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Dialog>
        );
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Sözleşme Şablonu Ayarları"
            description="Sözleşme şablonunu, logo ve yazı tipi ayarlarını düzenleyin."
            className="max-w-5xl max-h-[90vh] overflow-y-auto"
        >
            <div className="space-y-6">
                {/* Company Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                    <div>
                        <Label htmlFor="companyName">Firma Adı</Label>
                        <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="HAYALET FOTOĞRAF VE FİLM"
                        />
                    </div>
                    <div>
                        <Label htmlFor="companyOwner">Firma Sahibi</Label>
                        <Input
                            id="companyOwner"
                            value={companyOwner}
                            onChange={(e) => setCompanyOwner(e.target.value)}
                            placeholder="Cengiz Çimen"
                        />
                    </div>
                    <div>
                        <Label htmlFor="companyAddress">Firma Adresi</Label>
                        <Input
                            id="companyAddress"
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            placeholder="Sakarya Mh. 1113. Sk. 3-A Şehzadeler/Manisa"
                        />
                    </div>
                </div>

                {/* Logo Section */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                    <Label className="flex items-center gap-2 mb-3">
                        <ImageIcon className="w-4 h-4" />
                        Logo
                    </Label>
                    <div className="flex items-center gap-4">
                        {logoPreview ? (
                            <div className="relative group">
                                <img
                                    src={logoPreview}
                                    alt="Logo"
                                    className="h-20 w-auto max-w-[200px] object-contain border rounded"
                                />
                                <button
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <div className="h-20 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                                Logo Yok
                            </div>
                        )}
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoSelect}
                                className="hidden"
                            />
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                                <Upload className="w-4 h-4" />
                                Logo Yükle
                            </div>
                        </label>
                    </div>
                </div>

                {/* Font Settings */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                    <Label className="flex items-center gap-2 mb-3">
                        <Type className="w-4 h-4" />
                        Yazı Tipi Ayarları
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="fontFamily" className="text-xs">Font Ailesi</Label>
                            <select
                                id="fontFamily"
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {CONTRACT_FONTS.map((font) => (
                                    <option key={font.value} value={font.value}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="fontSizeTitle" className="text-xs">Başlık (px)</Label>
                            <Input
                                id="fontSizeTitle"
                                type="number"
                                value={fontSizeTitle}
                                onChange={(e) => setFontSizeTitle(parseInt(e.target.value) || 16)}
                                min={10}
                                max={32}
                            />
                        </div>
                        <div>
                            <Label htmlFor="fontSizeHeading" className="text-xs">Alt Başlık (px)</Label>
                            <Input
                                id="fontSizeHeading"
                                type="number"
                                value={fontSizeHeading}
                                onChange={(e) => setFontSizeHeading(parseInt(e.target.value) || 14)}
                                min={10}
                                max={24}
                            />
                        </div>
                        <div>
                            <Label htmlFor="fontSizeBody" className="text-xs">Gövde (px)</Label>
                            <Input
                                id="fontSizeBody"
                                type="number"
                                value={fontSizeBody}
                                onChange={(e) => setFontSizeBody(parseInt(e.target.value) || 12)}
                                min={8}
                                max={18}
                            />
                        </div>
                    </div>
                </div>

                {/* Placeholders Reference */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <Label className="flex items-center gap-2 mb-3 text-blue-700">
                        <Info className="w-4 h-4" />
                        Kullanılabilir Alanlar (Tıklayarak Kopyala)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {CONTRACT_PLACEHOLDERS.map((p) => (
                            <button
                                key={p.key}
                                onClick={() => copyPlaceholder(p.key)}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 text-xs rounded border transition-all",
                                    copiedPlaceholder === p.key
                                        ? "bg-green-100 border-green-300 text-green-700"
                                        : "bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
                                )}
                                title={p.description}
                            >
                                {copiedPlaceholder === p.key ? (
                                    <Check className="w-3 h-3" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                                {p.key}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template Editor */}
                <div>
                    <Label className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        Sözleşme Şablonu
                    </Label>
                    <textarea
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        className="flex min-h-[400px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                        placeholder="Sözleşme şablonunu buraya yazın..."
                        style={{ fontFamily: 'monospace' }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Yukarıdaki alanları (örn: {"{{MUSTERI_ADI}}"}) kullanarak dinamik içerik ekleyebilirsiniz.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        İptal
                    </Button>
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Kaydet
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
