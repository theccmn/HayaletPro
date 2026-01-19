import { supabase } from "../lib/supabase";
import type { Project, Transaction } from "../types";

// Müşteriye ait projeleri getir
export const getClientProjects = async (clientId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*, project_installments(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching client projects:', error);
        throw error;
    }

    return data || [];
};

// Müşteriye ait tüm projelerin transactionlarını getir
export const getClientTransactions = async (clientId: string): Promise<Transaction[]> => {
    // Önce müşterinin proje id'lerini al
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId);

    if (projectsError) {
        console.error('Error fetching client project ids:', projectsError);
        throw projectsError;
    }

    if (!projects || projects.length === 0) {
        return [];
    }

    const projectIds = projects.map(p => p.id);

    // Bu projelere ait transaction'ları getir
    const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
            *,
            projects (
                title
            )
        `)
        .in('project_id', projectIds)
        .order('date', { ascending: false });

    if (transactionsError) {
        console.error('Error fetching client transactions:', transactionsError);
        throw transactionsError;
    }

    return transactions || [];
};

// Müşteri istatistiklerini hesapla
export interface ClientStats {
    totalProjects: number;
    totalProjectValue: number;
    totalPaid: number;
    totalRemaining: number;
    lastProjectDate: string | null;
}

export const getClientStats = async (clientId: string): Promise<ClientStats> => {
    // Projeleri ve transaction'ları al
    const projects = await getClientProjects(clientId);
    const transactions = await getClientTransactions(clientId);

    // Toplam proje değeri
    const totalProjectValue = projects.reduce((sum, p) => sum + (p.price || 0), 0);

    // Toplam alınan ödeme (income type transactions)
    const totalPaid = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Son proje tarihi
    const lastProjectDate = projects.length > 0
        ? projects[0].created_at || null
        : null;

    return {
        totalProjects: projects.length,
        totalProjectValue,
        totalPaid,
        totalRemaining: totalProjectValue - totalPaid,
        lastProjectDate
    };
};
