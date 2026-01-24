import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTemplateStore, type BlockType } from '../../stores/useTemplateStore';
import { Layout, Type, Image, Calendar, MousePointerClick, ArrowDown } from 'lucide-react';

const tools: { type: BlockType; icon: React.FC<any>; label: string; description: string }[] = [
    { type: 'header', icon: Layout, label: 'Başlık Bloğu', description: 'Logo ve slogan' },
    { type: 'text', icon: Type, label: 'Metin Bloğu', description: 'Zengin metin' },
    { type: 'image', icon: Image, label: 'Resim Bloğu', description: 'Görsel yükle' },
    { type: 'session', icon: Calendar, label: 'Seans Detayları', description: 'Randevu bilgileri' },
    { type: 'cta', icon: MousePointerClick, label: 'Buton', description: 'Yönlendirme' },
    { type: 'footer', icon: ArrowDown, label: 'Alt Bilgi', description: 'İmza ve sosyal' },
];

export const AddBlockButton = () => {
    const addBlock = useTemplateStore((state) => state.addBlock);
    const [isOpen, setIsOpen] = useState(false);

    const handleAdd = (type: BlockType) => {
        addBlock(type);
        setIsOpen(false);
        // Scroll to bottom logic could be added here
    };

    return (
        <div className="relative mt-4 mb-12">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all font-medium group"
                >
                    <Plus className="mr-2 group-hover:scale-110 transition-transform" />
                    Blok Ekle
                </button>
            ) : (
                <div className="bg-white border rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h3 className="text-sm font-semibold text-gray-900">Bir blok seçin</h3>
                        <button onClick={() => setIsOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">Kapat</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {tools.map((tool) => (
                            <button
                                key={tool.type}
                                onClick={() => handleAdd(tool.type)}
                                className="flex items-start gap-3 p-3 text-left border rounded-lg hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50 transition-all"
                            >
                                <div className="p-2 rounded-md bg-white border text-gray-500">
                                    <tool.icon size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 text-sm">{tool.label}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">{tool.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
