
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { type UseFormRegister } from "react-hook-form";

interface SortableFeatureItemProps {
    id: string;
    index: number;
    register: UseFormRegister<any>;
    onRemove: (index: number) => void;
}

export function SortableFeatureItem({ id, index, register, onRemove }: SortableFeatureItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className="flex gap-2 items-center bg-white">
            <div {...attributes} {...listeners} className="cursor-grab hover:text-indigo-600 text-slate-400">
                <GripVertical className="h-4 w-4" />
            </div>
            <Input
                {...register(`features.${index}.value`)}
                placeholder="Örn. 2 Saat Çekim"
                className="h-8 text-sm flex-1"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onRemove(index)}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}
