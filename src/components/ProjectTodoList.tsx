import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask, updateTask, deleteTask } from '../services/apiTasks';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
    Plus,
    Trash2,
    CheckCircle2,
    Circle,
    Bell,
    BellOff,
    Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { SingleDateTimePicker } from './SingleDateTimePicker';
import { toast } from 'sonner';

interface ProjectTodoListProps {
    projectId: string;
}

export function ProjectTodoList({ projectId }: ProjectTodoListProps) {
    const queryClient = useQueryClient();
    const [newTaskContent, setNewTaskContent] = useState('');

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => getTasks(projectId),
    });

    const createMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            setNewTaskContent('');
            toast.success('Görev eklendi.');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) => updateTask(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            // Hatırlatıcılar değişmiş olabilir, dashboard'u da güncelle
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            toast.success('Görev silindi.');
        },
    });

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskContent.trim()) return;

        createMutation.mutate({
            project_id: projectId,
            content: newTaskContent.trim(),
            is_completed: false,
        });
    };

    const toggleComplete = (task: any) => {
        updateMutation.mutate({
            id: task.id,
            updates: { is_completed: !task.is_completed }
        });
    };

    const setReminder = (taskId: string, date: Date | undefined) => {
        updateMutation.mutate({
            id: taskId,
            updates: { reminder_date: date ? date.toISOString() : null }
        }, {
            onSuccess: () => {
                if (date) toast.success('Hatırlatıcı ayarlandı.');
                else toast.info('Hatırlatıcı kaldırıldı.');
            }
        });
    };

    if (isLoading) return <div className="py-4 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

    return (
        <div className="border rounded-xl bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Yapılacaklar Listesi
                </h3>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
                    {tasks?.filter(t => t.is_completed).length}/{tasks?.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-2">
                {tasks?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                        Henüz görev eklenmemiş.
                    </div>
                )}

                {tasks?.map((task) => (
                    <div
                        key={task.id}
                        className={cn(
                            "group flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-muted/30",
                            task.is_completed ? "bg-muted/50 border-transparent" : "bg-card"
                        )}
                    >
                        <button
                            onClick={() => toggleComplete(task)}
                            className={cn(
                                "mt-0.5 shrink-0 transition-colors",
                                task.is_completed ? "text-green-500" : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-sm break-words leading-tight",
                                task.is_completed ? "line-through text-muted-foreground" : "font-medium"
                            )}>
                                {task.content}
                            </p>

                            {task.reminder_date && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 font-medium">
                                    <Bell className="w-3 h-3" />
                                    {format(new Date(task.reminder_date), 'd MMM HH:mm', { locale: tr })}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600">
                                        {task.reminder_date ? <Bell className="w-3.5 h-3.5 fill-amber-100 text-amber-600" /> : <Bell className="w-3.5 h-3.5" />}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <SingleDateTimePicker
                                        date={task.reminder_date ? new Date(task.reminder_date) : undefined}
                                        onChange={(date) => setReminder(task.id, date)}
                                    />
                                    {task.reminder_date && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs text-red-500 hover:text-red-700 h-8 rounded-none border-t"
                                            onClick={() => setReminder(task.id, undefined)}
                                        >
                                            <BellOff className="w-3 h-3 mr-2" /> Hatırlatıcıyı Kaldır
                                        </Button>
                                    )}
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                onClick={() => deleteMutation.mutate(task.id)}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddTask} className="p-3 border-t bg-muted/20">
                <div className="flex gap-2">
                    <Input
                        value={newTaskContent}
                        onChange={(e) => setNewTaskContent(e.target.value)}
                        placeholder="Yeni yapılacak ekle..."
                        className="h-9 text-sm bg-background"
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!newTaskContent.trim() || createMutation.isPending}
                        className="h-9 w-9 p-0 shrink-0"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>
            </form>
        </div>
    );
}
