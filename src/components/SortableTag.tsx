
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";

interface SortableTagProps {
    id: string;
    feature: string;
    onRemove: () => void;
}

export function SortableTag({ id, feature, onRemove }: SortableTagProps) {
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
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 rounded px-2 py-1 text-sm shadow-sm hover:bg-blue-100 transition-colors"
        >
            <span className="select-none">{feature}</span>
            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking remove
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="ml-1 text-blue-400 hover:text-red-500 transition-colors cursor-pointer"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}
