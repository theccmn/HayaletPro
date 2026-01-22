import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TimeFilter } from '../../utils/dateFilters';
import { TimeFilterButtons } from './TimeFilterButtons';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    colorTheme: 'primary' | 'green' | 'blue' | 'red' | 'amber';
    timeFilter?: TimeFilter;
    onTimeFilterChange?: (filter: TimeFilter) => void;
    showTimeFilter?: boolean;
    hasWarning?: boolean;
    warningText?: string;
    onClick?: () => void;
    suffix?: string;
    isClickable?: boolean;
}

const colorThemes = {
    primary: {
        iconBg: 'bg-primary/10',
        iconText: 'text-primary',
        iconHoverBg: 'group-hover:bg-primary',
        iconHoverText: 'group-hover:text-white',
        valueText: '',
        bottomBar: 'bg-primary/50',
        border: '',
        bg: 'bg-card',
    },
    green: {
        iconBg: 'bg-green-100',
        iconText: 'text-green-600',
        iconHoverBg: 'group-hover:bg-green-600',
        iconHoverText: 'group-hover:text-white',
        valueText: 'text-green-600',
        bottomBar: 'bg-gradient-to-r from-green-500 to-emerald-500',
        border: '',
        bg: 'bg-card',
    },
    blue: {
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        iconHoverBg: 'group-hover:bg-blue-600',
        iconHoverText: 'group-hover:text-white',
        valueText: 'text-blue-600',
        bottomBar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        border: '',
        bg: 'bg-card',
    },
    red: {
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
        iconHoverBg: 'group-hover:bg-red-600',
        iconHoverText: 'group-hover:text-white',
        valueText: 'text-red-600',
        bottomBar: 'bg-gradient-to-r from-red-500 to-rose-500',
        border: 'border-red-200',
        bg: 'bg-red-50/50',
    },
    amber: {
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
        iconHoverBg: 'group-hover:bg-amber-600',
        iconHoverText: 'group-hover:text-white',
        valueText: 'text-amber-600',
        bottomBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
        border: '',
        bg: 'bg-card',
    },
};

export function StatCard({
    title,
    value,
    icon: Icon,
    colorTheme,
    timeFilter,
    onTimeFilterChange,
    showTimeFilter = true,
    hasWarning = false,
    warningText,
    onClick,
    suffix,
    isClickable = false,
}: StatCardProps) {
    const theme = colorThemes[hasWarning ? 'red' : colorTheme];

    const formattedValue = typeof value === 'number'
        ? `₺${value.toLocaleString('tr-TR')}`
        : value;

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all group',
                theme.bg,
                theme.border,
                isClickable && 'cursor-pointer hover:shadow-md',
                hasWarning && 'border-red-300'
            )}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3
                        className={cn(
                            'font-semibold tracking-tight text-sm',
                            hasWarning ? 'text-red-600' : 'text-muted-foreground'
                        )}
                    >
                        {title}
                    </h3>
                    {showTimeFilter && timeFilter && onTimeFilterChange && (
                        <TimeFilterButtons value={timeFilter} onChange={onTimeFilterChange} size="sm" />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {hasWarning && (
                        <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                        </div>
                    )}
                    <div
                        className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                            theme.iconBg,
                            theme.iconText,
                            !hasWarning && theme.iconHoverBg,
                            !hasWarning && theme.iconHoverText
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Value */}
            <div className="mt-4 flex items-baseline gap-2">
                <span
                    className={cn(
                        'text-3xl font-bold tracking-tighter transition-all duration-300',
                        hasWarning ? 'text-red-700' : theme.valueText
                    )}
                >
                    {formattedValue}
                </span>
                {suffix && (
                    <span
                        className={cn(
                            'text-xs font-medium',
                            hasWarning ? 'text-red-600' : 'text-muted-foreground'
                        )}
                    >
                        {suffix}
                    </span>
                )}
            </div>

            {/* Warning text */}
            {hasWarning && warningText && (
                <div className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    {warningText}
                </div>
            )}

            {/* Bottom bar */}
            <div className={cn('absolute bottom-0 left-0 right-0 h-1', theme.bottomBar)} />
        </div>
    );
}
