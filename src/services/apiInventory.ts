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

// --- Category Management ---

export const getCategories = async (): Promise<import("../types").InventoryCategory[]> => {
    const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }

    return data || [];
};

export const createCategory = async (name: string, order_index: number): Promise<import("../types").InventoryCategory> => {
    const { data, error } = await supabase
        .from('inventory_categories')
        .insert([{ name, order_index }])
        .select()
        .single();

    if (error) {
        console.error('Error creating category:', error);
        throw error;
    }
    return data;
};

export const updateCategory = async (id: string, updates: Partial<import("../types").InventoryCategory>): Promise<void> => {
    const { error } = await supabase
        .from('inventory_categories')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating category:', error);
        throw error;
    }
};

export const deleteCategory = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

// --- Project Inventory Management ---

export const getProjectInventoryItems = async (projectId: string): Promise<import("../types").ProjectInventoryItem[]> => {
    const { data, error } = await supabase
        .from('project_inventory_items')
        .select(`
            *,
            inventory_item:inventory(*)
        `)
        .eq('project_id', projectId);

    if (error) {
        console.error('Error fetching project inventory:', error);
        throw error;
    }
    return data || [];
};

export const addProjectInventoryItem = async (projectId: string, inventoryItemId: string, quantity: number = 1): Promise<import("../types").ProjectInventoryItem> => {
    const { data, error } = await supabase
        .from('project_inventory_items')
        .insert([{ project_id: projectId, inventory_item_id: inventoryItemId, quantity }])
        .select(`
            *,
            inventory_item:inventory(*)
        `)
        .single();

    if (error) {
        console.error('Error adding inventory to project:', error);
        throw error;
    }
    return data;
};

export const removeProjectInventoryItem = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('project_inventory_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing inventory from project:', error);
        throw error;
    }
};
