import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import { type Block, useTemplateStore } from '../../stores/useTemplateStore';
import { cn } from '../../lib/utils'; // Assuming cn utility exists, usually does in shadcn/ui setups. If not I will fix.

// Temporary simple implementation of cn if it doesn't exist
// import { clsx, type ClassValue } from "clsx"
// import { twMerge } from "tailwind-merge"
// function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }
// Checking if cn exists first would be better but standard setup usually has it.
// I will check for lib/utils existence after this.

interface SortableBlockProps {
    block: Block;
    children: React.ReactNode;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({ block, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const { removeBlock, selectedBlockId, selectBlock, toggleBlockVisibility } = useTemplateStore();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const isSelected = selectedBlockId === block.id;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group mb-3 rounded-lg border-2 transition-all bg-white",
                isSelected ? "border-indigo-500 ring-4 ring-indigo-500/10 z-10" : "border-transparent hover:border-gray-200",
                isDragging && "opacity-50 shadow-xl"
            )}
            onClick={(e) => {
                e.stopPropagation();
                selectBlock(block.id);
            }}
        >
            {/* Hover Controls */}
            <div className={cn(
                "absolute -right-3 top-2 flex flex-col gap-1 bg-white shadow-md rounded-lg border p-1 opacity-0 transition-opacity z-20",
                (isSelected || isDragging) ? "opacity-100" : "group-hover:opacity-100"
            )}>
                <button
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded cursor-grab active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={14} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleBlockVisibility(block.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                >
                    {block.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(block.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Content Preview in Canvas */}
            <div className={cn("p-4", !block.isVisible && "opacity-40 grayscale")}>
                {children}
            </div>
        </div>
    );
};
