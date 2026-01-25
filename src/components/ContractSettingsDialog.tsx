import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
    Trash2,
    Save,
    Loader2,
    Image as ImageIcon,
    Type,
    Copy,
    Check,
    Eye,
    Edit
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false, // Prevent overwriting edits on window focus
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
    const [highlightColor, setHighlightColor] = useState('#000000');
    const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('editor');

    // Mock data for preview
    const MOCK_DATA = {
        client: 'Cem Ceminay',
        address: 'Güzelyurt Mh. 4500. Sk. No:5 Manisa',
        price: '15.000 ₺',
        plan: '• 1. Ödeme: 5.000 ₺ - 15 Ocak 2026 (Kapora)\n• 2. Ödeme: 10.000 ₺ - 15 Şubat 2026',
        delivery: '• 2 Saat Çekim\n• 30 Düzenlenmiş Fotoğraf\n• Dijital Teslim',
        date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    };

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
            setHighlightColor(settings.highlight_color || '#000000');
            setHighlightedFields(settings.highlighted_fields || []);
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
                highlight_color: highlightColor,
                highlighted_fields: highlightedFields
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contractSettings'] });
            toast.success('Sözleşme ayarları başarıyla kaydedildi.');
            setLogoFile(null);
            onClose();
        },
        onError: (error) => {
            console.error('Save error:', error);
            toast.error('Ayarlar kaydedilirken bir hata oluştu.');
        }
    });

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setLogoUrl(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPlaceholder(text);
        setTimeout(() => setCopiedPlaceholder(null), 2000);
    };

    const toggleHighlightedField = (field: string) => {
        setHighlightedFields(prev =>
            prev.includes(field)
                ? prev.filter(f => f !== field)
                : [...prev, field]
        );
    };

    const getPreviewText = () => {
        let text = templateContent || '';

        // Helper to wrap value if highlighted
        const wrap = (key: string, value: string) => {
            if (highlightedFields.includes(key)) {
                return `%%%HL%%%${value}%%%HL_END%%%`;
            }
            return value;
        };

        text = text
            .replace(/\{\{MUSTERI_ADI\}\}/g, wrap('{{MUSTERI_ADI}}', MOCK_DATA.client))
            .replace(/\{\{MUSTERI_ADRES\}\}/g, wrap('{{MUSTERI_ADRES}}', MOCK_DATA.address))
            .replace(/\{\{HIZMET_BEDELI\}\}/g, wrap('{{HIZMET_BEDELI}}', MOCK_DATA.price))
            .replace(/\{\{ODEME_PLANI\}\}/g, wrap('{{ODEME_PLANI}}', MOCK_DATA.plan))
            .replace(/\{\{TESLIMAT_ICERIGI\}\}/g, wrap('{{TESLIMAT_ICERIGI}}', MOCK_DATA.delivery))
            .replace(/\{\{TARIH\}\}/g, wrap('{{TARIH}}', MOCK_DATA.date))
            .replace(/\{\{FIRMA_ADI\}\}/g, wrap('{{FIRMA_ADI}}', companyName || 'HAYALET FOTOĞRAF VE FİLM'))
            .replace(/\{\{FIRMA_ADRES\}\}/g, wrap('{{FIRMA_ADRES}}', companyAddress || 'Sakarya Mh. 1113. Sk. 3-A Şehzadeler/Manisa'))
            .replace(/\{\{FIRMA_SAHIBI\}\}/g, wrap('{{FIRMA_SAHIBI}}', companyOwner || 'Cengiz Çimen'));

        return text;
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
            title="Sözleşme Ayarları"
            className="max-w-5xl max-h-[90vh] overflow-y-auto"
        >
            <div className="space-y-6">
                {/* Top Sections: Company + Logo + Font */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {/* Company Inputs */}
                        <div className="grid grid-cols-1 gap-2 p-4 bg-muted/30 rounded-lg border">
                            <Label className="font-semibold mb-2">Firma Bilgileri</Label>
                            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Firma Adı" />
                            <Input value={companyOwner} onChange={e => setCompanyOwner(e.target.value)} placeholder="Firma Sahibi" />
                            <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Adres" />
                        </div>

                        {/* Font Inputs */}
                        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                            <Label className="font-semibold flex items-center gap-2"><Type className="w-4 h-4" /> Yazı Tipi</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Font</Label>
                                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full text-sm border rounded h-9 px-2 bg-transparent">
                                        {CONTRACT_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                    </select>
                                </div>
                                <div><Label className="text-xs">Başlık</Label><Input type="number" value={fontSizeTitle || ''} onChange={e => setFontSizeTitle(e.target.value === '' ? 0 : parseInt(e.target.value))} className="h-9" /></div>
                                <div><Label className="text-xs">Alt Başlık</Label><Input type="number" value={fontSizeHeading || ''} onChange={e => setFontSizeHeading(e.target.value === '' ? 0 : parseInt(e.target.value))} className="h-9" /></div>
                                <div><Label className="text-xs">Gövde</Label><Input type="number" value={fontSizeBody || ''} onChange={e => setFontSizeBody(e.target.value === '' ? 0 : parseInt(e.target.value))} className="h-9" /></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Logo */}
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <Label className="font-semibold mb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Logo</Label>
                            <div className="flex items-center gap-4">
                                {logoPreview ? (
                                    <div className="relative group">
                                        <img src={logoPreview} alt="Logo" className="h-16 object-contain border rounded bg-white" />
                                        <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                ) : (
                                    <div className="h-16 w-24 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">Yok</div>
                                )}
                                <label className="cursor-pointer">
                                    <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                                    <div className="text-sm px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">Değiştir</div>
                                </label>
                            </div>
                        </div>

                        {/* Highlight Settings */}
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <Label className="font-semibold mb-3 flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: highlightColor }}></div>
                                Otomatik Vurgu
                            </Label>
                            <div className="flex items-center gap-3 mb-3">
                                <Label className="text-xs whitespace-nowrap">Vurgu Rengi:</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="color"
                                        value={highlightColor}
                                        onChange={(e) => setHighlightColor(e.target.value)}
                                        className="w-10 h-8 p-1 cursor-pointer"
                                    />
                                    <span className="text-xs text-muted-foreground">{highlightColor}</span>
                                </div>
                            </div>
                            <div className="space-y-1 max-h-[120px] overflow-y-auto border rounded p-2 bg-background">
                                {CONTRACT_PLACEHOLDERS.map((ph) => (
                                    <label key={ph.key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={highlightedFields.includes(ph.key)}
                                            onChange={() => toggleHighlightedField(ph.key)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                        />
                                        <span className="font-mono">{ph.key}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="editor" className="flex items-center gap-2">
                            <Edit className="w-4 h-4" /> Editör
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Önizleme
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="min-h-[400px]">
                        <div className="flex gap-4 h-full">
                            <div className="flex-1">
                                <textarea
                                    value={templateContent}
                                    onChange={(e) => setTemplateContent(e.target.value)}
                                    className="w-full h-[400px] p-4 text-sm font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Sözleşme metni..."
                                />
                            </div>
                            <div className="w-64 space-y-2 max-h-[400px] overflow-y-auto border-l pl-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Dinamik Alanlar</p>
                                {CONTRACT_PLACEHOLDERS.map((ph) => (
                                    <div
                                        key={ph.key}
                                        className="p-2 border rounded bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors group"
                                        onClick={() => copyToClipboard(ph.key)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <code className="text-xs font-bold text-primary">{ph.key}</code>
                                            {copiedPlaceholder === ph.key ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">{ph.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="preview">
                        <div className="border rounded-lg shadow-sm bg-white p-8 min-h-[600px] max-h-[600px] overflow-y-auto">
                            {logoPreview && (
                                <div className="mb-6 flex justify-center">
                                    <img src={logoPreview} alt="Logo" className="max-h-24 max-w-[200px] object-contain" />
                                </div>
                            )}
                            <div
                                className="preview-content"
                                style={{
                                    fontFamily: fontFamily || 'Times New Roman',
                                    color: '#000000'
                                }}
                            >
                                {(() => {
                                    let isHighlighted = false;
                                    return getPreviewText().split('\n').map((line, i) => {
                                        const trimmedLine = line.trim();
                                        const isHeader = trimmedLine.length > 0 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && trimmedLine.length < 100;
                                        const isMainHeader = i === 0 || trimmedLine.includes('SÖZLEŞME');

                                        // Render line with highlight support
                                        const renderLineContent = (text: string) => {
                                            const parts = text.split(/(%%%HL%%%|%%%HL_END%%%)/g);
                                            return parts.map((part, idx) => {
                                                if (part === '%%%HL%%%') { isHighlighted = true; return null; }
                                                if (part === '%%%HL_END%%%') { isHighlighted = false; return null; }

                                                if (isHighlighted) {
                                                    return <span key={idx} style={{ color: highlightColor, fontWeight: 'bold' }}>{part}</span>;
                                                }
                                                return <span key={idx}>{part}</span>;
                                            });
                                        };

                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    minHeight: '1.2em',
                                                    fontSize: isMainHeader ? `${fontSizeTitle || 16}px` : (isHeader ? `${fontSizeHeading || 14}px` : `${fontSizeBody || 12}px`),
                                                    fontWeight: (isHeader || isMainHeader) ? 'bold' : 'normal',
                                                    textAlign: isMainHeader ? 'center' : 'left',
                                                    marginTop: (isHeader || isMainHeader) ? '1.5em' : '0',
                                                    marginBottom: (isHeader || isMainHeader) ? '4px' : '2px',
                                                    lineHeight: 1.5,
                                                    display: 'block', // Ensure div behaves as block
                                                    whiteSpace: 'pre-wrap' // Preserve spaces
                                                }}
                                            >
                                                {renderLineContent(line)}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Değişiklikleri Kaydet
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Dialog>
    );
}
