import { supabase } from "../lib/supabase";
import type { Package } from "../types";

export const getPackages = async (): Promise<Package[]> => {
    const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching packages:', error);
        throw error;
    }

    return data || [];
};

export const createPackage = async (pkg: Omit<Package, 'id' | 'created_at'>): Promise<Package> => {
    const { data, error } = await supabase
        .from('packages')
        .insert([pkg])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updatePackage = async (id: string, updates: Partial<Package>): Promise<Package> => {
    const { data, error } = await supabase
        .from('packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deletePackage = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
