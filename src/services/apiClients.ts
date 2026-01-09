import { supabase } from "../lib/supabase";
import type { Client, NewClient } from "../types";

export const getClients = async (): Promise<Client[]> => {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching clients:', error);
        throw error;
    }

    return data || [];
};

export const createClient = async (client: NewClient): Promise<Client> => {
    const { data, error } = await supabase
        .from('clients')
        .insert([client])
        .select()
        .single();

    if (error) {
        console.error('Error creating client:', error);
        throw error;
    }

    return data;
};

export const updateClient = async (id: string, updates: Partial<NewClient>): Promise<Client> => {
    const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating client:', error);
        throw error;
    }

    return data;
};

export const deleteClient = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting client:', error);
        throw error;
    }
};
