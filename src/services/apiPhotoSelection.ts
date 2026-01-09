
import { supabase } from "../lib/supabase";

export interface PhotoSelection {
    id: string;
    project_id: string;
    folder_id: string;
    access_token: string;
    selection_data: SelectedPhoto[];
    settings: SelectionSettings;
    status: 'waiting' | 'viewed' | 'selecting' | 'completed';
    created_at: string;
}

export interface SelectedPhoto {
    id: string; // Drive File ID
    selected: boolean;
    comment?: string;
    isStarred?: boolean;
    extraSelections?: Record<string, boolean>; // { "cover": true, "poster": false }
}

export interface SelectionSettings {
    limit: number;
    extra_limits: ExtraLimitType[];
}

export interface ExtraLimitType {
    id: string;
    label: string;
    limit: number;
}

// Admin: Create a new selection session
export const createSelection = async (projectId: string, folderId: string, settings: SelectionSettings, customToken?: string) => {
    const accessToken = customToken || Math.random().toString(36).substring(2, 10).toUpperCase();

    // Extract Folder ID if a full URL is provided
    let finalFolderId = folderId;
    if (folderId.includes('drive.google.com')) {
        const match = folderId.match(/folders\/([a-zA-Z0-9_-]+)/) || folderId.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) {
            finalFolderId = match[1];
        }
    }

    const { data, error } = await supabase
        .from('photo_selections')
        .insert({
            project_id: projectId,
            folder_id: finalFolderId,
            access_token: accessToken,
            settings: settings,
            status: 'waiting'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Admin: Delete selection
export const deleteSelection = async (projectId: string) => {
    const { error } = await supabase
        .from('photo_selections')
        .delete()
        .eq('project_id', projectId);

    if (error) throw error;
};

// Client: Get session by token
export const getSelectionByToken = async (token: string) => {
    const { data, error } = await supabase
        .from('photo_selections')
        .select('*, projects(title, client_name)') // Join project info
        .eq('access_token', token)
        .single();

    if (error) throw error;
    return data;
};

// Client: Save progress or Complete
export const updateSelectionData = async (id: string, selectionData: SelectedPhoto[], status?: string) => {
    const payload: any = { selection_data: selectionData, updated_at: new Date().toISOString() };
    if (status) payload.status = status;

    const { error } = await supabase
        .from('photo_selections')
        .update(payload)
        .eq('id', id);

    if (error) throw error;
};

// Admin: Get selection for a project
export const getSelectionByProjectId = async (projectId: string) => {
    const { data, error } = await supabase
        .from('photo_selections')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

    if (error) throw error;
    return data;
};

// Admin: Update existing selection settings
export const updateSelectionSettings = async (selectionId: string, folderId: string, settings: SelectionSettings, customToken?: string) => {
    // Extract Folder ID if a full URL is provided
    let finalFolderId = folderId;
    if (folderId.includes('drive.google.com')) {
        const match = folderId.match(/folders\/([a-zA-Z0-9_-]+)/) || folderId.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) {
            finalFolderId = match[1];
        }
    }

    const payload: any = {
        folder_id: finalFolderId,
        settings: settings
    };

    if (customToken) {
        payload.access_token = customToken;
    }

    const { error } = await supabase
        .from('photo_selections')
        .update(payload)
        .eq('id', selectionId);

    if (error) throw error;
};
