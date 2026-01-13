import { supabase } from '../lib/supabase';

export interface ContractSettings {
    id: string;
    template_content: string;
    logo_url: string | null;
    font_family: string;
    font_size_body: number;
    font_size_title: number;
    font_size_heading: number;
    company_name: string;
    company_address: string;
    company_owner: string;
    created_at: string;
    updated_at: string;
}

export const getContractSettings = async (): Promise<ContractSettings | null> => {
    const { data, error } = await supabase
        .from('contract_settings')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching contract settings:', error);
        return null;
    }

    return data as ContractSettings;
};

export const updateContractSettings = async (
    id: string,
    settings: Partial<Omit<ContractSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<ContractSettings | null> => {
    const { data, error } = await supabase
        .from('contract_settings')
        .update({
            ...settings,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating contract settings:', error);
        throw error;
    }

    return data as ContractSettings;
};

export const uploadContractLogo = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('contract-logos')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('contract-logos')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

export const deleteContractLogo = async (url: string): Promise<void> => {
    // Extract filename from URL
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];

    const { error } = await supabase.storage
        .from('contract-logos')
        .remove([fileName]);

    if (error) {
        console.error('Error deleting logo:', error);
        throw error;
    }
};

// Font options for the contract
export const CONTRACT_FONTS = [
    { value: 'Times New Roman', label: 'Times New Roman (Klasik)' },
    { value: 'Arial', label: 'Arial (Modern)' },
    { value: 'Georgia', label: 'Georgia (Zarif)' },
    { value: 'Roboto', label: 'Roboto (Temiz)' },
    { value: 'Nunito', label: 'Nunito (Yumuşak)' },
];

// Placeholder descriptions for the template editor
export const CONTRACT_PLACEHOLDERS = [
    { key: '{{MUSTERI_ADI}}', description: 'Müşteri tam adı' },
    { key: '{{MUSTERI_ADRES}}', description: 'Müşteri adresi' },
    { key: '{{HIZMET_BEDELI}}', description: 'Toplam tutar (formatlanmış)' },
    { key: '{{ODEME_PLANI}}', description: 'Taksit listesi' },
    { key: '{{TESLIMAT_ICERIGI}}', description: 'Paket özellikleri listesi' },
    { key: '{{TARIH}}', description: 'Bugünün tarihi' },
    { key: '{{FIRMA_ADI}}', description: 'Stüdyo adı' },
    { key: '{{FIRMA_ADRES}}', description: 'Stüdyo adresi' },
    { key: '{{FIRMA_SAHIBI}}', description: 'Firma sahibi adı' },
];
