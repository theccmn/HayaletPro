import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getSetting } from '../services/apiSettings';

interface Props {
    children: React.ReactNode;
}

export function GoogleAuthProviderWrapper({ children }: Props) {
    const [clientId, setClientId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadClientId = async () => {
            try {
                const id = await getSetting('google_calendar_client_id');
                setClientId(id);
            } catch (error) {
                console.error("Failed to load Google Client ID", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadClientId();
    }, []);

    if (isLoading) {
        return <>{children}</>; // Or a loading spinner if preferred, but for now allow app to render
    }

    if (!clientId) {
        // If no client ID, render children without provider
        // Components using useGoogleLogin will fail gracefully or should check for provider context
        // Ideally, we should handle this better, but strict mode of provider throws error if no client ID.
        // For Settings page to input ID, we probably need the Provider to be present optimally,
        // but user can't login without ID anyway.
        return <GoogleOAuthProvider clientId="dummy_id_to_prevent_crash_initial">{children}</GoogleOAuthProvider>;
    }

    return (
        <GoogleOAuthProvider clientId={clientId}>
            {children}
        </GoogleOAuthProvider>
    );
}
