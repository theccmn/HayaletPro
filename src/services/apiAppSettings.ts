import { supabase } from '../lib/supabase';

export interface AppSettings {
    id: string;
    user_name: string;
    app_title: string;
    logo_url?: string;
    theme: 'light' | 'dark' | 'system';
}

export const getAppSettings = async () => {
    const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        // Tablo boşsa veya yoksa varsayılan dön
        if (error.code === 'PGRST116') {
            return {
                user_name: 'Kullanıcı',
                app_title: 'Hayalet Pro',
                theme: 'light'
            } as AppSettings;
        }
        throw new Error(error.message);
    }

    return data as AppSettings;
};

export const updateAppSettings = async (settings: Partial<AppSettings>) => {
    // Önce mevcut bir kayıt var mı kontrol et
    const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single();

    let result;

    if (existing) {
        // Varsa güncelle
        result = await supabase
            .from('app_settings')
            .update({
                ...settings,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();
    } else {
        // Yoksa ekle
        result = await supabase
            .from('app_settings')
            .insert([{
                ...settings,
                user_name: settings.user_name || 'Kullanıcı',
                app_title: settings.app_title || 'Hayalet Pro',
                theme: settings.theme || 'light'
            }])
            .select()
            .single();
    }

    if (result.error) {
        throw new Error(result.error.message);
    }

    return result.data as AppSettings;
};

export const uploadAppLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `app_logo_${Date.now()}.${fileExt}`;

    // Bucket adı: app-assets (Yoksa hata verebilir, kullanıcı oluşturmalı)
    const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        throw new Error('Logo yüklenirken hata oluştu: ' + uploadError.message);
    }

    const { data } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

    return data.publicUrl;
};
