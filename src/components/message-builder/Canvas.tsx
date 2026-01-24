import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { SortableBlock } from './SortableBlock';
import { HeaderBlock } from './blocks/HeaderBlock';
import { RichTextBlock } from './blocks/RichTextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { CtaBlock } from './blocks/CtaBlock';
import { FooterBlock } from './blocks/FooterBlock';
import { SessionDetailsBlock } from './blocks/SessionDetailsBlock';
import { AddBlockButton } from './AddBlockButton';

// Placeholder components for other blocks
const PlaceholderBlock = ({ type }: { type: string }) => (
    <div className="p-4 text-center text-gray-400 bg-gray-50 border border-dashed rounded">
        {type} bloğu henüz eklenmedi.
    </div>
);

const BlockRenderer = ({ block }: { block: any }) => {
    switch (block.type) {
        case 'header':
            return <HeaderBlock content={block.content} />;
        case 'text':
            return <RichTextBlock content={block.content} />;
        case 'image':
            return <ImageBlock content={block.content} />;
        case 'cta':
            return <CtaBlock content={block.content} />;
        case 'footer':
            return <FooterBlock content={block.content} />;
        case 'session':
            return <SessionDetailsBlock content={block.content} />;
        default:
            return <PlaceholderBlock type={block.type} />;
    }
};

export const Canvas = () => {
    const { blocks, reorderBlocks, selectBlock } = useTemplateStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = blocks.findIndex((block) => block.id === active.id);
            const newIndex = blocks.findIndex((block) => block.id === over?.id);

            reorderBlocks(arrayMove(blocks, oldIndex, newIndex));
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto py-8 px-4" onClick={() => selectBlock(null)}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {blocks.length === 0 && (
                            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
                                <p className="text-gray-500">
                                    Başlamak için sol menüden blok ekleyin
                                </p>
                            </div>
                        )}
                        {blocks.map((block) => (
                            <SortableBlock key={block.id} block={block}>
                                <BlockRenderer block={block} />
                            </SortableBlock>
                        ))}

                        <AddBlockButton />
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};
