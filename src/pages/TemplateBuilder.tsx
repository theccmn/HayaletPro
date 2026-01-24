import { useState } from 'react';
import { BuilderLayout } from '../components/message-builder/BuilderLayout';
import { Toolbox } from '../components/message-builder/Toolbox';
import { Canvas } from '../components/message-builder/Canvas';
import { PropertiesPanel } from '../components/message-builder/PropertiesPanel';
import { Monitor, Smartphone } from 'lucide-react';
import { useTemplateStore } from '../stores/useTemplateStore';


import { useParams } from 'react-router-dom';

const TemplateBuilder = () => {
    // const navigate = useNavigate(); // Navigation is now handled in BuilderLayout
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const selectedBlockId = useTemplateStore((state) => state.selectedBlockId);
    const { id } = useParams();

    return (
        <div className="h-full flex flex-col">
            <BuilderLayout
                templateId={id}
                sidebar={selectedBlockId ? <PropertiesPanel /> : <Toolbox />}
                toolbar={
                    <div className="flex items-center justify-center w-full gap-2">
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setViewMode('desktop')}
                                className={`p-1.5 rounded ${viewMode === 'desktop' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Masaüstü Görünüm"
                            >
                                <Monitor size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('mobile')}
                                className={`p-1.5 rounded ${viewMode === 'mobile' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Mobil Görünüm"
                            >
                                <Smartphone size={18} />
                            </button>
                        </div>
                    </div>
                }
                preview={
                    <div className={`transition-all duration-300 ${viewMode === 'mobile' ? 'w-[375px]' : 'w-[800px]'}`}>
                        <Canvas />
                    </div>
                }
            />
        </div>
    );
};

export default TemplateBuilder;
