import { Calendar, Clock, MapPin } from 'lucide-react';

export const SessionDetailsBlock = ({ content }: { content: any }) => {
    return (
        <div className="p-4 bg-white border rounded-lg m-4 shadow-sm text-sm">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Seans Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    {content.showTitle && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">SEANS ADI</span>
                            <span className="font-semibold text-gray-900">Düğün Çekimi - Ahmet & Ayşe</span>
                        </div>
                    )}
                    {content.showType && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">SEANS TÜRÜ</span>
                            <span className="text-gray-900">Fotoğraf Çekimi</span>
                        </div>
                    )}
                    {content.showDate && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <Calendar size={16} className="text-indigo-600" />
                            <span>24 Ocak 2026</span>
                        </div>
                    )}
                    {content.showTime && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock size={16} className="text-indigo-600" />
                            <span>14:00 - 16:00</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {content.showDuration && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">SÜRE</span>
                            <span className="text-gray-900">2 Saat</span>
                        </div>
                    )}
                    {content.showStatus && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">DURUM</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit">
                                Onaylandı
                            </span>
                        </div>
                    )}
                    {content.showLocation && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={16} className="text-indigo-600" />
                            <span>İstanbul Stüdyosu (Kadıköy)</span>
                        </div>
                    )}
                    {content.showMeetingLink && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">GÖRÜŞME BAĞLANTISI</span>
                            <a href="#" className="text-blue-600 underline truncate">meet.google.com/abc-defg-hij</a>
                        </div>
                    )}
                </div>
            </div>

            {(content.showProjectName || content.showPackageName) && (
                <div className="mt-4 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                    {content.showProjectName && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">PROJE ADI</span>
                            <span className="text-gray-900">Yaz Düğünleri 2026</span>
                        </div>
                    )}
                    {content.showPackageName && (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">PAKET ADI</span>
                            <span className="text-gray-900">Altın Düğün Paketi</span>
                        </div>
                    )}
                </div>
            )}

            {content.showNotes && (
                <div className="mt-4 pt-3 border-t">
                    <span className="text-xs text-gray-500 font-medium block mb-1">NOTLAR</span>
                    <p className="text-gray-700 italic border-l-2 border-gray-200 pl-3 py-1">
                        Müşteri dış çekim için ekstra aksesuar getirecek.
                    </p>
                </div>
            )}
        </div>
    );
};
