import React from 'react';
import { useTemplateStore, type BlockType } from '../../stores/useTemplateStore';
import { Type, Image, Layout, MousePointerClick, Calendar, ArrowDown } from 'lucide-react';

const tools: { type: BlockType; icon: React.FC<any>; label: string; description: string }[] = [
    { type: 'header', icon: Layout, label: 'Başlık Bloğu', description: 'Logo ve slogan başlık bölümü' },
    { type: 'text', icon: Type, label: 'Metin Bloğu', description: 'Zengin metin ve değişkenler' },
    { type: 'image', icon: Image, label: 'Resim Bloğu', description: 'Marka görseli veya kapak' },
    { type: 'session', icon: Calendar, label: 'Seans Detayları', description: 'Tarih, saat ve konum bilgisi' },
    { type: 'cta', icon: MousePointerClick, label: 'Harekete Geçir', description: 'Eylem düğmeleri' },
    { type: 'footer', icon: ArrowDown, label: 'Alt Bilgi', description: 'İletişim ve sosyal medya' },
];

export const Toolbox = () => {
    const addBlock = useTemplateStore((state) => state.addBlock);

    return (
        <div className="p-4 h-full flex flex-col">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Bloklar</h2>
            <p className="text-xs text-gray-500 mb-4">Eklemek için tıklayın</p>

            <div className="grid grid-cols-1 gap-3 overflow-y-auto">
                {tools.map((tool) => (
                    <button
                        key={tool.type}
                        onClick={() => addBlock(tool.type)}
                        className="flex items-start gap-3 p-3 text-left border rounded-lg bg-white hover:border-indigo-500 hover:shadow-sm hover:bg-slate-50 transition-all group"
                    >
                        <div className="p-2 rounded-md bg-gray-50 text-gray-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                            <tool.icon size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900 text-sm">{tool.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{tool.description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
