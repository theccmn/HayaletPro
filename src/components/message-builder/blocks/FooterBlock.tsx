import { Facebook, Twitter, Instagram } from 'lucide-react';

export const FooterBlock = ({ content }: { content: any }) => {
    return (
        <div className="p-6 border-t mt-4 bg-gray-50 text-center">
            {content.showSocial && (
                <div className="flex justify-center gap-4 mb-4">
                    <div className="p-2 bg-white rounded-full text-gray-500">
                        <Facebook size={16} />
                    </div>
                    <div className="p-2 bg-white rounded-full text-gray-500">
                        <Instagram size={16} />
                    </div>
                    <div className="p-2 bg-white rounded-full text-gray-500">
                        <Twitter size={16} />
                    </div>
                </div>
            )}
            <p className="text-sm text-gray-500">
                {content.text}
            </p>
        </div>
    );
};
