import React, { type ReactNode, useState } from 'react';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { createTemplate, updateTemplate, getTemplateById } from '../../services/apiTemplates';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Edit2 } from 'lucide-react';

interface BuilderLayoutProps {
    sidebar: ReactNode;
    preview: ReactNode;
    toolbar?: ReactNode;
    templateId?: string;
}

export const BuilderLayout = ({ sidebar, preview, toolbar, templateId }: BuilderLayoutProps) => {
    const blocks = useTemplateStore((state) => state.blocks);
    const reorderBlocks = useTemplateStore((state) => state.reorderBlocks);
    const [isSaving, setIsSaving] = useState(false);
    const [templateName, setTemplateName] = useState('Yeni Mesaj Şablonu');
    const [templateDescription, setTemplateDescription] = useState('');
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
    const navigate = useNavigate();

    // Load template if editing
    React.useEffect(() => {
        if (templateId) {
            const loadTemplate = async () => {
                try {
                    const data = await getTemplateById(templateId);
                    if (data) {
                        setTemplateName(data.name);
                        setTemplateDescription(data.description || '');
                        // Assuming data.blocks is the array of blocks
                        if (Array.isArray(data.blocks)) {
                            reorderBlocks(data.blocks);
                        }
                    }
                } catch (error) {
                    console.error('Error loading template:', error);
                    toast.error('Şablon yüklenemedi');
                }
            };
            loadTemplate();
        }
    }, [templateId, reorderBlocks]);

    const handleSaveClick = () => {
        // If it's a new template (no ID) and name is default or empty, ask for name
        if (!templateId && (templateName === 'Yeni Mesaj Şablonu' || !templateName.trim())) {
            setIsSettingsDialogOpen(true);
        } else {
            handleSaveProcess();
        }
    };

    const handleSaveProcess = async () => {
        setIsSaving(true);
        try {
            const templateData = {
                name: templateName,
                description: templateDescription,
                blocks: blocks,
                updated_at: new Date().toISOString()
            };

            if (templateId) {
                await updateTemplate(templateId, templateData);
                toast.success('Şablon güncellendi');
            } else {
                const newTemplate = await createTemplate(templateData);
                toast.success('Şablon oluşturuldu');
                // Navigate to edit mode to prevent creating duplicates on subsequent saves
                if (newTemplate) {
                    navigate(`/templates/${newTemplate.id}`, { replace: true });
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Şablon kaydedilirken bir hata oluştu');
        } finally {
            setIsSaving(false);
            setIsSettingsDialogOpen(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 flex-col">
            {/* Header */}
            <header className="h-16 border-b bg-white px-4 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" onClick={() => window.history.back()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-2 group">
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0 text-lg placeholder-gray-400 focus:outline-none max-w-[300px]"
                                placeholder="Şablon Adı Giriniz"
                            />
                            <button
                                onClick={() => setIsSettingsDialogOpen(true)}
                                className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-indigo-50 rounded"
                                title="Başlık ve açıklamayı düzenle"
                            >
                                <Edit2 size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{templateId ? 'Düzenleniyor' : 'Taslak'}</span>
                            <span>•</span>
                            <span>{isSaving ? 'Kaydediliyor...' : 'Kaydedildi'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {toolbar}
                    <div className="w-px h-6 bg-gray-200 mx-2"></div>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    {/* Publish removed */}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Tools & Settings */}
                <div className="w-96 flex-shrink-0 border-r bg-white flex flex-col overflow-hidden">
                    {sidebar}
                </div>

                {/* Main Content - Preview Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex-1 overflow-auto p-8 bg-gray-100 flex justify-center">
                        {preview}
                    </div>
                </div>
            </div>

            {/* Template Settings Dialog */}
            {isSettingsDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Şablon Ayarları</h2>
                            <button onClick={() => setIsSettingsDialogOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="sr-only">Kapat</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Şablon Adı</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                                    placeholder="Örn: Müşteri Karşılama"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    value={templateDescription}
                                    onChange={(e) => setTemplateDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow min-h-[80px] resize-none"
                                    placeholder="Şablonun ne için kullanıldığını açıklayın..."
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsSettingsDialogOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveProcess}
                                disabled={!templateName.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
