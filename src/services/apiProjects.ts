import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export const getProjects = async () => {
    const { data, error } = await supabase
        .from('projects')
        .select('*, clients!projects_client_id_fkey(phone), photo_selections(status), project_installments(*), project_types(*), location_types(*), locations(*)')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    // Map nested client phone to project phone
    const projectsWithPhone = data.map((p: any) => ({
        ...p,
        phone: p.clients?.phone || p.phone
    }));

    return projectsWithPhone as Project[];
};

export const getProject = async (id: string) => {
    const { data, error } = await supabase
        .from('projects')
        .select('*, clients(*), photo_selections(*), project_installments(*), project_types(*), location_types(*), locations(*)')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    // Map nested client details to top level compatibility if needed
    // But mostly we will use data.clients for full details
    return data as Project & { clients: any };
};

export const createProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select('*, clients(*), photo_selections(*), project_installments(*), project_types(*), location_types(*), locations(*)')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    // Workflow tetikleme - arka planda çalışsın
    import('./workflowTrigger').then(({ triggerProjectCreatedWorkflows }) => {
        triggerProjectCreatedWorkflows(data).catch(err => console.error('[Workflow] Tetikleme hatası (createProject):', err));
    });

    return data as Project;
};

export const updateProjectStatus = async (id: string, statusId: string, oldStatusId?: string) => {
    const { data, error } = await supabase
        .from('projects')
        .update({ status_id: statusId })
        .eq('id', id)
        .select('*, clients(*), photo_selections(*), project_installments(*), project_types(*), location_types(*), locations(*)')
        .single();

    if (error) {
        console.error('Error updating project status:', error);
        throw error;
    }

    // Workflow tetikleme - arka planda çalışsın
    if (oldStatusId && oldStatusId !== statusId) {
        import('./workflowTrigger').then(({ triggerStatusChangeWorkflows }) => {
            triggerStatusChangeWorkflows({
                project: data,
                oldStatusId,
                newStatusId: statusId
            }).catch(err => console.error('[Workflow] Tetikleme hatası:', err));
        });
    }

    return data;
};

export const updateProject = async (id: string, project: Partial<Omit<Project, 'id' | 'created_at'>>) => {
    // 1. Mevcut projeyi çek (status değişikliğini kontrol etmek için)
    const { data: currentProject, error: fetchError } = await supabase
        .from('projects')
        .select('status_id')
        .eq('id', id)
        .single();

    if (fetchError) {
        console.error('Error fetching current project:', fetchError);
        // Hata olsa bile update'i denemeye devam edebiliriz veya durdurabiliriz.
        // Güvenli olması için devam edelim ama workflow çalışmayabilir.
    }

    // 2. Projeyi güncelle
    const { data, error } = await supabase
        .from('projects')
        .update(project)
        .eq('id', id)
        .select('*, clients(*), photo_selections(*), project_installments(*), project_types(*), location_types(*), locations(*)')
        .single();

    if (error) {
        console.error('Error updating project:', error);
        throw error;
    }

    // 3. Workflow tetikleme - arka planda çalışsın
    const oldStatusId = currentProject?.status_id;
    const newStatusId = project.status_id;

    if (newStatusId && oldStatusId && oldStatusId !== newStatusId) {
        import('./workflowTrigger').then(({ triggerStatusChangeWorkflows }) => {
            triggerStatusChangeWorkflows({
                project: data,
                oldStatusId,
                newStatusId
            }).catch(err => console.error('[Workflow] Tetikleme hatası (updateProject):', err));
        });
    }

    return data;
};

export const deleteProject = async (id: string) => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
};
