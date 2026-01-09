import { supabase } from "../lib/supabase";
import type { InventoryItem, NewInventoryItem } from "../types";

export const getInventory = async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching inventory:', error);
        throw error;
    }

    return data || [];
};

export const createInventoryItem = async (item: NewInventoryItem): Promise<InventoryItem> => {
    const { data, error } = await supabase
        .from('inventory')
        .insert([item])
        .select()
        .single();

    if (error) {
        console.error('Error creating inventory item:', error);
        throw error;
    }

    return data;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data, error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating inventory item:', error);
        throw error;
    }

    return data;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting inventory item:', error);
        throw error;
    }
};
