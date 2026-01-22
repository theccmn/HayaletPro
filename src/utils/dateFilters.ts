import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    isWithinInterval,
    addDays,
    isBefore,
    parseISO,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Project, Transaction, Installment } from '../types';

export type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all';

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
    day: 'G',
    week: 'H',
    month: 'A',
    year: 'Y',
    all: 'T',
};

export const TIME_FILTER_FULL_LABELS: Record<TimeFilter, string> = {
    day: 'Gün',
    week: 'Hafta',
    month: 'Ay',
    year: 'Yıl',
    all: 'Toplam',
};

/**
 * Returns the start and end date for a given time filter
 */
export function getDateRange(filter: TimeFilter): { start: Date; end: Date } {
    const now = new Date();

    switch (filter) {
        case 'day':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'week':
            return { start: startOfWeek(now, { locale: tr }), end: endOfWeek(now, { locale: tr }) };
        case 'month':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'year':
            return { start: startOfYear(now), end: endOfYear(now) };
        case 'all':
        default:
            return { start: new Date(0), end: new Date(9999, 11, 31) };
    }
}

/**
 * Filters transactions by date range
 */
export function filterTransactionsByDate(
    transactions: Transaction[],
    filter: TimeFilter
): Transaction[] {
    if (filter === 'all') return transactions;

    const { start, end } = getDateRange(filter);

    return transactions.filter((t) => {
        const date = parseISO(t.date);
        return isWithinInterval(date, { start, end });
    });
}

/**
 * Filters projects by start_date within date range
 */
export function filterProjectsByDate(
    projects: Project[],
    filter: TimeFilter
): Project[] {
    if (filter === 'all') return projects;

    const { start, end } = getDateRange(filter);

    return projects.filter((p) => {
        if (!p.start_date) return false;
        const date = parseISO(p.start_date);
        return isWithinInterval(date, { start, end });
    });
}

export interface PaymentInfo {
    projectId: string;
    projectTitle: string;
    clientName: string;
    amount: number;
    dueDate: string;
    isOverdue: boolean;
    installmentId: string;
}

/**
 * Gets all upcoming payments within a time filter
 */
export function getUpcomingPayments(
    projects: Project[],
    transactions: Transaction[],
    filter: TimeFilter
): PaymentInfo[] {
    const payments: PaymentInfo[] = [];
    const now = new Date();
    const todayStart = startOfDay(now);
    const { end } = getDateRange(filter);

    projects.forEach((project) => {
        if (!project.project_installments || project.project_installments.length === 0) return;

        // Calculate total paid for this project
        const projectIncome = transactions
            .filter((t) => t.type === 'income' && t.project_id === project.id)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        let remainingPaid = projectIncome;

        project.project_installments.forEach((inst) => {
            const amount = inst.amount;
            const dueDate = parseISO(inst.due_date);

            if (remainingPaid >= amount) {
                remainingPaid -= amount;
                return; // Already paid
            }

            remainingPaid = 0;

            // Check if within filter range and not in past (unless overdue)
            const isOverdue = isBefore(dueDate, todayStart);
            const isWithinRange = isWithinInterval(dueDate, { start: todayStart, end }) || isOverdue;

            if (filter === 'all' || isWithinRange) {
                payments.push({
                    projectId: project.id,
                    projectTitle: project.title,
                    clientName: project.client_name,
                    amount: inst.amount,
                    dueDate: inst.due_date,
                    isOverdue,
                    installmentId: inst.id,
                });
            }
        });
    });

    // Sort by due date (overdue first, then by date)
    return payments.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
}

/**
 * Gets only overdue payments
 */
export function getOverduePayments(
    projects: Project[],
    transactions: Transaction[]
): PaymentInfo[] {
    return getUpcomingPayments(projects, transactions, 'all').filter((p) => p.isOverdue);
}

/**
 * Gets total amount for upcoming payments
 */
export function getUpcomingPaymentTotal(
    projects: Project[],
    transactions: Transaction[],
    filter: TimeFilter
): number {
    const payments = getUpcomingPayments(projects, transactions, filter);
    return payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Gets projects starting within the next N days
 */
export function getUpcomingProjects(projects: Project[], days: number = 7): Project[] {
    const now = new Date();
    const futureDate = addDays(now, days);

    return projects.filter((p) => {
        if (!p.start_date) return false;
        const startDate = parseISO(p.start_date);
        return isWithinInterval(startDate, { start: startOfDay(now), end: endOfDay(futureDate) });
    });
}

/**
 * Calculate net profit for a time filter
 */
export function calculateNetProfit(transactions: Transaction[], filter: TimeFilter): number {
    const filtered = filterTransactionsByDate(transactions, filter);

    const income = filtered
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expense = filtered
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    return income - expense;
}

/**
 * Calculate total income for a time filter
 */
export function calculateTotalIncome(transactions: Transaction[], filter: TimeFilter): number {
    const filtered = filterTransactionsByDate(transactions, filter);
    return filtered
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
}

/**
 * Count projects within a time filter
 */
export function countProjects(projects: Project[], filter: TimeFilter): number {
    return filterProjectsByDate(projects, filter).length;
}
