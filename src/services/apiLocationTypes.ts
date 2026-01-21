import { supabase } from "../lib/supabase";
import type { LocationType } from "../types";

export const getLocationTypes = async (): Promise<LocationType[]> => {
    const { data, error } = await supabase
        .from('location_types')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching location types:', error);
        throw error;
    }

    return data || [];
};

export const createLocationType = async (type: Omit<LocationType, 'id' | 'created_at'>): Promise<LocationType> => {
    const { data, error } = await supabase
        .from('location_types')
        .insert([type])
        .select()
        .single();

    if (error) {
        console.error('Error creating location type:', error);
        throw error;
    }

    return data;
};

export const updateLocationType = async (id: string, updates: Partial<LocationType>): Promise<LocationType> => {
    const { data, error } = await supabase
        .from('location_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating location type:', error);
        throw error;
    }

    return data;
};

export const updateLocationTypeOrder = async (updates: { id: string; order_index: number }[]): Promise<void> => {
    const promises = updates.map(({ id, order_index }) =>
        supabase.from('location_types').update({ order_index }).eq('id', id)
    );

    const results = await Promise.all(promises);

    const error = results.find(r => r.error)?.error;
    if (error) {
        console.error('Error updating location type order:', error);
        throw error;
    }
};

export const deleteLocationType = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('location_types')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting location type:', error);
        throw error;
    }
};
