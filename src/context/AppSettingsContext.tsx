import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppSettings, updateAppSettings, type AppSettings } from '../services/apiAppSettings';
import { toast } from 'sonner';

interface AppSettingsContextType {
    settings: AppSettings | undefined;
    isLoading: boolean;
    updateSettings: (settings: Partial<AppSettings>) => void;
    isUpdating: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['appSettings'],
        queryFn: getAppSettings,
    });

    const mutation = useMutation({
        mutationFn: updateAppSettings,
        onSuccess: (newSettings) => {
            queryClient.setQueryData(['appSettings'], newSettings);
            toast.success('Ayarlar güncellendi');
        },
        onError: (error) => {
            toast.error('Ayarlar güncellenirken bir hata oluştu: ' + error.message);
        }
    });

    // Tema değişikliğini uygula
    useEffect(() => {
        if (settings?.theme) {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');

            if (settings.theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(settings.theme);
            }
        }
    }, [settings?.theme]);

    return (
        <AppSettingsContext.Provider
            value={{
                settings,
                isLoading,
                updateSettings: mutation.mutate,
                isUpdating: mutation.isPending
            }}
        >
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    const context = useContext(AppSettingsContext);
    if (context === undefined) {
        throw new Error('useAppSettings must be used within an AppSettingsProvider');
    }
    return context;
}
