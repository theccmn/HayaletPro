import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function calculateDuration(startDate: string | Date, endDate: string | Date): string {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

    if (diffInMinutes <= 0) return '';

    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    let durationParts = [];
    if (hours > 0) durationParts.push(`${hours} Saat`);
    if (minutes > 0) durationParts.push(`${minutes} Dakika`);

    return durationParts.join(' ');
}
