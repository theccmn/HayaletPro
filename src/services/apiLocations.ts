import { supabase } from "../lib/supabase";
import type { Location } from "../types";

export const getLocations = async (): Promise<Location[]> => {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }

    return data || [];
};

export const createLocation = async (location: Omit<Location, 'id' | 'created_at'>): Promise<Location> => {
    const { data, error } = await supabase
        .from('locations')
        .insert([location])
        .select()
        .single();

    if (error) {
        console.error('Error creating location:', error);
        throw error;
    }

    return data;
};

export const updateLocation = async (id: string, updates: Partial<Location>): Promise<Location> => {
    const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating location:', error);
        throw error;
    }

    return data;
};

export const deleteLocation = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting location:', error);
        throw error;
    }
};
