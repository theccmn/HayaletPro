import { useAppSettings } from '../../../context/AppSettingsContext';

export const HeaderBlock = ({ content }: { content: any }) => {
    const { settings } = useAppSettings();
    const logoUrl = content.url || settings?.logo_url;

    return (
        <div
            className="p-4"
            style={{ backgroundColor: content.backgroundColor }}
        >
            {content.logoEnabled && (
                <div className={`flex mb-4 ${content.logoAlignment === 'center' ? 'justify-center' :
                    content.logoAlignment === 'right' ? 'justify-end' : 'justify-start'
                    }`}>
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
                    ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">
                            Logo
                        </div>
                    )}
                </div>
            )}

            {content.title && (
                <h1
                    className="text-2xl font-bold"
                    style={{
                        color: content.titleColor,
                        textAlign: content.logoAlignment as any
                    }}
                >
                    {content.title}
                </h1>
            )}
        </div>
    );
};
