import { useState } from 'react';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { supabase } from '../../lib/supabase';
import { X, Smile, Plus } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { SMART_VARIABLES } from '../../constants/smartVariables';

export const PropertiesPanel = () => {
    const { selectedBlockId, blocks, updateBlock, selectBlock } = useTemplateStore();
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showVariablePicker, setShowVariablePicker] = useState(false);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    if (!selectedBlock) return null;

    const handleChange = (key: string, value: any) => {
        updateBlock(selectedBlock.id, { [key]: value });
    };

    const handleAddEmoji = (emojiObject: any) => {
        handleChange('text', (selectedBlock.content.text || '') + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="h-full flex flex-col bg-white" onClick={() => { setShowEmojiPicker(false); setShowVariablePicker(false); }}>
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">Blok Ayarları</h3>
                <button onClick={() => selectBlock(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-6">
                {selectedBlock.type === 'header' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                            <input
                                type="text"
                                value={selectedBlock.content.title || ''}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Başlık giriniz"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Hizalama</label>
                            <select
                                value={selectedBlock.content.logoAlignment}
                                onChange={(e) => handleChange('logoAlignment', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="left">Sola Hizala</option>
                                <option value="center">Ortala</option>
                                <option value="right">Sağa Hizala</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="logoEnabled"
                                checked={selectedBlock.content.logoEnabled}
                                onChange={(e) => handleChange('logoEnabled', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="logoEnabled" className="text-sm text-gray-700">Logo Göster</label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık Rengi</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={selectedBlock.content.titleColor}
                                    onChange={(e) => handleChange('titleColor', e.target.value)}
                                    className="h-8 w-14 rounded border cursor-pointer"
                                />
                                <span className="text-sm text-gray-500 self-center">{selectedBlock.content.titleColor}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Arkaplan Rengi</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={selectedBlock.content.backgroundColor}
                                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                    className="h-8 w-14 rounded border cursor-pointer"
                                />
                                <span className="text-sm text-gray-500 self-center">{selectedBlock.content.backgroundColor}</span>
                            </div>
                        </div>
                    </>
                )}

                {selectedBlock.type === 'text' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
                            <div className="flex gap-2 mb-2 relative">
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => setShowVariablePicker(!showVariablePicker)}
                                        className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border text-gray-600"
                                    >
                                        <Plus size={12} /> Değişken Ekle
                                    </button>
                                    {showVariablePicker && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                                            {SMART_VARIABLES.map((category) => (
                                                <div key={category.category} className="p-2 border-b last:border-0">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                                                        {category.category}
                                                    </div>
                                                    {category.items.map((item) => (
                                                        <button
                                                            key={item.value}
                                                            onClick={() => {
                                                                handleChange('text', (selectedBlock.content.text || '') + ' ' + item.value);
                                                                setShowVariablePicker(false);
                                                            }}
                                                            className="block w-full text-left px-2 py-1 text-xs hover:bg-indigo-50 text-gray-700 rounded truncate"
                                                            title={item.label}
                                                        >
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border text-gray-600"
                                    >
                                        <Smile size={12} /> Emoji
                                    </button>
                                    {showEmojiPicker && (
                                        <div className="absolute top-full left-0 z-50 mt-1 shadow-xl">
                                            <EmojiPicker onEmojiClick={handleAddEmoji} width={300} height={400} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={selectedBlock.content.text}
                                onChange={(e) => handleChange('text', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hizalama</label>
                            <div className="flex border rounded-md overflow-hidden">
                                {['left', 'center', 'right'].map((align) => (
                                    <button
                                        key={align}
                                        onClick={() => handleChange('align', align)}
                                        className={`flex-1 py-1.5 text-xs font-medium capitalize ${selectedBlock.content.align === align ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {align === 'left' ? 'Sol' : align === 'center' ? 'Orta' : 'Sağ'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Metin Rengi</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={selectedBlock.content.color}
                                    onChange={(e) => handleChange('color', e.target.value)}
                                    className="h-8 w-14 rounded border cursor-pointer"
                                />
                            </div>
                        </div>
                    </>
                )}

                {selectedBlock.type === 'image' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Görsel Kaynağı</label>
                            <div className="flex flex-col gap-3">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative">
                                    {selectedBlock.content.url && (
                                        <div className="absolute inset-0 w-full h-full p-2">
                                            <img src={selectedBlock.content.url} alt="Preview" className="w-full h-full object-contain rounded" />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all" />
                                        </div>
                                    )}
                                    <div className={`flex flex-col items-center justify-center pt-5 pb-6 ${selectedBlock.content.url ? 'opacity-0 hover:opacity-100' : ''}`}>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">{selectedBlock.content.url ? 'Değiştirmek için tıklayın' : 'Yüklemek için tıklayın'}</span></p>
                                        <p className="text-xs text-gray-500">PNG, JPG or GIF</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try {
                                                    // Upload to Supabase Storage
                                                    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                                    const { data, error } = await supabase.storage
                                                        .from('workflow-assets')
                                                        .upload(fileName, file);

                                                    if (error) {
                                                        console.error('Upload error:', error);
                                                        // Fallback to FileReader if storage fails (or bucket doesn't exist yet)
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            handleChange('url', reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                        // Show a toast or log here ideally
                                                    } else {
                                                        const { data: { publicUrl } } = supabase.storage
                                                            .from('workflow-assets')
                                                            .getPublicUrl(fileName);

                                                        handleChange('url', publicUrl);
                                                    }
                                                } catch (err) {
                                                    console.error('Upload exception:', err);
                                                    // Fallback
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        handleChange('url', reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }
                                        }}
                                    />
                                </label>
                                <div className="text-center text-xs text-gray-400">- VEYA -</div>
                                <input
                                    type="text"
                                    value={selectedBlock.content.url || ''}
                                    onChange={(e) => handleChange('url', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alt Metin (Alternatif Metin)</label>
                            <input
                                type="text"
                                value={selectedBlock.content.alt || ''}
                                onChange={(e) => handleChange('alt', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Görsel açıklaması"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="fullWidth"
                                checked={selectedBlock.content.fullWidth}
                                onChange={(e) => handleChange('fullWidth', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="fullWidth" className="text-sm text-gray-700">Tam Genişlik</label>
                        </div>
                    </>
                )}

                {selectedBlock.type === 'cta' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buton Metni</label>
                            <input
                                type="text"
                                value={selectedBlock.content.text}
                                onChange={(e) => handleChange('text', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Yönlendirme Linki</label>
                            <input
                                type="text"
                                value={selectedBlock.content.url}
                                onChange={(e) => handleChange('url', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="https://"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Arkaplan Rengi</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={selectedBlock.content.backgroundColor}
                                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                    className="h-8 w-14 rounded border cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Metin Rengi</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={selectedBlock.content.textColor}
                                    onChange={(e) => handleChange('textColor', e.target.value)}
                                    className="h-8 w-14 rounded border cursor-pointer"
                                />
                            </div>
                        </div>
                    </>
                )}

                {selectedBlock.type === 'footer' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alt Bilgi Metni</label>
                            <textarea
                                value={selectedBlock.content.text}
                                onChange={(e) => handleChange('text', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                            />
                        </div>
                    </>
                )}

                {selectedBlock.type === 'session' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seans Özeti</div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showTitle}
                                        onChange={(e) => handleChange('showTitle', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Seans Adı
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showType}
                                        onChange={(e) => handleChange('showType', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Seans Türü
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showDuration}
                                        onChange={(e) => handleChange('showDuration', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Süre
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showStatus}
                                        onChange={(e) => handleChange('showStatus', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Durum
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Takvim</div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showDate}
                                        onChange={(e) => handleChange('showDate', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Tarih
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showTime}
                                        onChange={(e) => handleChange('showTime', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Saat
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lojistik</div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showLocation}
                                        onChange={(e) => handleChange('showLocation', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Konum
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showMeetingLink}
                                        onChange={(e) => handleChange('showMeetingLink', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Görüşme Linki
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Proje ve Paket</div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showProjectName}
                                        onChange={(e) => handleChange('showProjectName', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Proje Adı
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showPackageName}
                                        onChange={(e) => handleChange('showPackageName', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Paket Adı
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notlar</div>
                            <div className="grid grid-cols-1 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.content.showNotes}
                                        onChange={(e) => handleChange('showNotes', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Notlar
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fallback for other types for now */}
                {!['header', 'text', 'image', 'cta', 'footer', 'session'].includes(selectedBlock.type) && (
                    <div className="text-sm text-gray-500">
                        Bu blok türü için ayarlar henüz eklenmedi.
                    </div>
                )}
            </div>
        </div>
    );
};
