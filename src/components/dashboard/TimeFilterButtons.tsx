import { cn } from '../../lib/utils';
import type { TimeFilter } from '../../utils/dateFilters';
import { TIME_FILTER_LABELS, TIME_FILTER_FULL_LABELS } from '../../utils/dateFilters';

interface TimeFilterButtonsProps {
    value: TimeFilter;
    onChange: (filter: TimeFilter) => void;
    size?: 'sm' | 'md';
}

const filters: TimeFilter[] = ['day', 'week', 'month', 'year', 'all'];

export function TimeFilterButtons({ value, onChange, size = 'sm' }: TimeFilterButtonsProps) {
    return (
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {filters.map((filter) => (
                <button
                    key={filter}
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(filter);
                    }}
                    title={TIME_FILTER_FULL_LABELS[filter]}
                    className={cn(
                        'font-medium transition-all duration-200 rounded-md',
                        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
                        value === filter
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                >
                    {TIME_FILTER_LABELS[filter]}
                </button>
            ))}
        </div>
    );
}
