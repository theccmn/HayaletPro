import { supabase } from '../lib/supabase';
import type { Workflow, WorkflowExecution } from '../types/workflow';
import { v4 as uuidv4 } from 'uuid';

// Get all workflows with template info
export const getWorkflows = async (): Promise<Workflow[]> => {
    const { data, error } = await supabase
        .from('workflows')
        .select(`
            *,
            message_templates(id, name)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Workflow[];
};

// Get single workflow by ID
export const getWorkflowById = async (id: string): Promise<Workflow> => {
    const { data, error } = await supabase
        .from('workflows')
        .select(`
            *,
            message_templates(id, name)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Workflow;
};

// Create new workflow
export const createWorkflow = async (workflow: Partial<Workflow>): Promise<Workflow> => {
    const { data, error } = await supabase
        .from('workflows')
        .insert([{
            id: uuidv4(),
            ...workflow,
            channels: workflow.channels || { email: false, whatsapp: false },
            is_active: workflow.is_active ?? true,
        }])
        .select(`
            *,
            message_templates(id, name)
        `)
        .single();

    if (error) throw error;
    return data as Workflow;
};

// Update workflow
export const updateWorkflow = async (id: string, updates: Partial<Workflow>): Promise<Workflow> => {
    const { data, error } = await supabase
        .from('workflows')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
            *,
            message_templates(id, name)
        `)
        .single();

    if (error) throw error;
    return data as Workflow;
};

// Delete workflow
export const deleteWorkflow = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Toggle workflow active status
export const toggleWorkflowStatus = async (id: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
        .from('workflows')
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;
};

// Get workflow executions (logs)
export const getWorkflowExecutions = async (workflowId?: string): Promise<WorkflowExecution[]> => {
    let query = supabase
        .from('workflow_executions')
        .select('*')
        .order('executed_at', { ascending: false });

    if (workflowId) {
        query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;
    return data as WorkflowExecution[];
};

// Log workflow execution
export const logWorkflowExecution = async (execution: Partial<WorkflowExecution>): Promise<WorkflowExecution> => {
    const { data, error } = await supabase
        .from('workflow_executions')
        .insert([{
            id: uuidv4(),
            ...execution,
            status: execution.status || 'pending',
        }])
        .select()
        .single();

    if (error) throw error;
    return data as WorkflowExecution;
};

// Update execution status
export const updateExecutionStatus = async (id: string, status: string, errorMessage?: string): Promise<void> => {
    const { error } = await supabase
        .from('workflow_executions')
        .update({
            status,
            error_message: errorMessage
        })
        .eq('id', id);

    if (error) throw error;
};

// Get workflows by trigger event (for triggering)
export const getActiveWorkflowsByEvent = async (triggerEvent: string): Promise<Workflow[]> => {
    const { data, error } = await supabase
        .from('workflows')
        .select(`
            *,
            message_templates(id, name, blocks)
        `)
        .eq('trigger_type', 'event')
        .eq('trigger_event', triggerEvent)
        .eq('is_active', true);

    if (error) throw error;
    return data as Workflow[];
};

// Generate WhatsApp link (wa.me)
export const generateWhatsAppLink = (phone: string, message: string): string => {
    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // If starts with 0, replace with country code (Turkey: 90)
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '90' + cleanPhone.substring(1);
    }

    // If doesn't start with +, add it
    if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
    }

    // Remove + for wa.me URL
    cleanPhone = cleanPhone.replace('+', '');

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
};
