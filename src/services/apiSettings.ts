import { supabase } from '../lib/supabase';

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export const getSetting = async (key: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    // If error is code 'PGRST116', it means no rows found (key doesn't exist)
    if (error.code !== 'PGRST116') {
      console.error(`Error fetching setting ${key}:`, error);
    }
    return null;
  }

  return data?.value || null;
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw error;
  }
};
