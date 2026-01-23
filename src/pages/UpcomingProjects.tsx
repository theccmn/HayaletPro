import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../services/apiProjects';
import { getUpcomingProjects } from '../utils/dateFilters';
import { ArrowLeft, Calendar, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import type { Project } from '../types';

export default function UpcomingProjects() {
    const navigate = useNavigate();

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    // Projects starting within 7 days
    const upcomingProjects = projects ? getUpcomingProjects(projects, 7) : [];

    // Projects with upcoming end dates (within 7 days)
    const projectsEndingSoon = projects?.filter((p) => {
        if (!p.end_date) return false;
        const endDate = parseISO(p.end_date);
        const daysUntil = differenceInDays(endDate, new Date());
        return daysUntil >= 0 && daysUntil <= 7;
    }) || [];

    const renderProjectCard = (project: Project, type: 'start' | 'end') => {
        const date = type === 'start' ? project.start_date : project.end_date;
        if (!date) return null;

        const parsedDate = parseISO(date);
        const daysFromNow = differenceInDays(parsedDate, new Date());

        return (
            <div
                key={`${project.id}-${type}`}
                className="flex items-center justify-between p-4 rounded-xl border bg-card transition-all hover:shadow-md hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{project.title}</h3>
                        {daysFromNow === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Bugün
                            </span>
                        )}
                        {daysFromNow === 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Yarın
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{project.client_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                            {format(parsedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
                            {daysFromNow > 1 && (
                                <span className="ml-1 text-blue-600">({daysFromNow} gün kaldı)</span>
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        type === 'start' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    )}>
                        {type === 'start' ? 'Başlangıç' : 'Bitiş'}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>
        );
    };

    const hasAnyProjects = upcomingProjects.length > 0 || projectsEndingSoon.length > 0;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
                    <p className="text-muted-foreground">7 gün içinde başlayacak veya bitecek projeler.</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-card p-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-muted-foreground">Başlayacak Projeler</h3>
                    </div>
                    <div className="mt-2 text-2xl font-bold">{upcomingProjects.length}</div>
                    <div className="text-sm text-muted-foreground">proje</div>
                </div>

                <div className="rounded-2xl border bg-card p-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-muted-foreground">Bitecek Projeler</h3>
                    </div>
                    <div className="mt-2 text-2xl font-bold">{projectsEndingSoon.length}</div>
                    <div className="text-sm text-muted-foreground">proje</div>
                </div>
            </div>

            {/* Upcoming Projects (Starting) */}
            {upcomingProjects.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-500" />
                        Başlayacak Projeler ({upcomingProjects.length})
                    </h2>
                    <div className="space-y-2">
                        {upcomingProjects.map((p) => renderProjectCard(p, 'start'))}
                    </div>
                </div>
            )}

            {/* Projects Ending Soon */}
            {projectsEndingSoon.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        Bitecek Projeler ({projectsEndingSoon.length})
                    </h2>
                    <div className="space-y-2">
                        {projectsEndingSoon.map((p) => renderProjectCard(p, 'end'))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!hasAnyProjects && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">Yaklaşan Proje Yok</h3>
                    <p className="text-muted-foreground mt-1">
                        7 gün içinde başlayacak veya bitecek proje bulunmuyor.
                    </p>
                </div>
            )}
        </div>
    );
}
