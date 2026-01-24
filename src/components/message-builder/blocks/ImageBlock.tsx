import { Image as ImageIcon } from 'lucide-react';

export const ImageBlock = ({ content }: { content: any }) => {
    if (!content.url) {
        return (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={48} className="mb-2 opacity-20" />
                <span className="text-sm">Görsel Yükle</span>
            </div>
        );
    }

    return (
        <div className={`flex ${content.fullWidth ? 'w-full' : 'max-w-md mx-auto'}`}>
            <img
                src={content.url}
                alt={content.alt || 'Görsel'}
                className="w-full h-auto rounded-lg"
            />
        </div>
    );
};
