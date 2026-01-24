import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type BlockType = 'header' | 'text' | 'image' | 'session' | 'cta' | 'footer' | 'spacer' | 'social';

export interface Block {
    id: string;
    type: BlockType;
    content: any;
    isVisible: boolean;
}

interface TemplateState {
    blocks: Block[];
    selectedBlockId: string | null;
    addBlock: (type: BlockType) => void;
    removeBlock: (id: string) => void;
    updateBlock: (id: string, content: any) => void;
    moveBlock: (activeId: string, overId: string) => void;
    selectBlock: (id: string | null) => void;
    reorderBlocks: (newBlocks: Block[]) => void;
    toggleBlockVisibility: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
    blocks: [],
    selectedBlockId: null,

    addBlock: (type) =>
        set((state) => {
            const newBlock: Block = {
                id: uuidv4(),
                type,
                content: getDefaultContent(type),
                isVisible: true,
            };
            return { blocks: [...state.blocks, newBlock], selectedBlockId: newBlock.id };
        }),

    removeBlock: (id) =>
        set((state) => ({
            blocks: state.blocks.filter((b) => b.id !== id),
            selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
        })),

    updateBlock: (id, content) =>
        set((state) => ({
            blocks: state.blocks.map((b) =>
                b.id === id ? { ...b, content: { ...b.content, ...content } } : b
            ),
        })),

    moveBlock: (activeId, overId) =>
        set((state) => {
            const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
            const newIndex = state.blocks.findIndex((b) => b.id === overId);
            const newBlocks = [...state.blocks];
            const [movedBlock] = newBlocks.splice(oldIndex, 1);
            newBlocks.splice(newIndex, 0, movedBlock);
            return { blocks: newBlocks };
        }),

    reorderBlocks: (newBlocks) => set({ blocks: newBlocks }),

    selectBlock: (id) => set({ selectedBlockId: id }),

    toggleBlockVisibility: (id) =>
        set((state) => ({
            blocks: state.blocks.map((b) =>
                b.id === id ? { ...b, isVisible: !b.isVisible } : b
            ),
        })),
}));

const getDefaultContent = (type: BlockType) => {
    switch (type) {
        case 'header':
            return {
                logoEnabled: true,
                logoAlignment: 'center', // 'left', 'center', 'right'
                title: '',
                titleColor: '#000000',
                backgroundColor: '#ffffff',
            };
        case 'text':
            return {
                text: 'Metin içeriğinizi buraya girin...',
                align: 'left',
                color: '#374151',
            };
        case 'image':
            return {
                url: '',
                alt: '',
                fullWidth: false
            }
        case 'cta':
            return {
                text: 'Buton Metni',
                url: '#',
                align: 'center',
                backgroundColor: '#000000',
                textColor: '#ffffff',
                borderRadius: '4px',
            };
        case 'session':
            return {
                showDate: true,
                showTime: true,
                showLocation: true
            }
        case 'footer':
            return {
                text: '© 2024 Şirket Adı. Tüm hakları saklıdır.',
                showSocial: true
            }
        default:
            return {};
    }
};
