import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createTransaction, createBulkTransactions } from '../services/apiFinance';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from './ui/dialog-custom'; // Custom dialog bileşeni kullanılıyor
import { Button } from './ui/button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface TransactionImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

// Şablon verisi
const TEMPLATE_DATA = [
    {
        "Tarih (YYYY-MM-DD)": "2026-01-27",
        "Başlık": "Örnek İşlem",
        "Tutar": 1500,
        "Tür (Gelir/Gider)": "Gelir",
        "Kategori": "Satış",
        "Ödeme Yöntemi": "Nakit"
    },
    {
        "Tarih (YYYY-MM-DD)": "2026-01-28",
        "Başlık": "Ofis Kirası",
        "Tutar": 5000,
        "Tür (Gelir/Gider)": "Gider",
        "Kategori": "Kira",
        "Ödeme Yöntemi": "Havale"
    }
];

export function TransactionImportDialog({ isOpen, onClose }: TransactionImportDialogProps) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // const createMutation = ... (kullanılmıyor, doğrudan createTransaction çağırılıyor)

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet(TEMPLATE_DATA);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Şablon");
        XLSX.writeFile(wb, "HayaletPro_Finans_Sablonu.xlsx");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            readExcel(selectedFile);
        }
    };

    const readExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Veriyi satır satır oku (Array of Arrays)
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (rawRows.length < 2) {
                toast.error("Dosya boş veya geçerli veri içermiyor.");
                return;
            }

            const headers = rawRows[0].map(h => String(h).toLowerCase().trim());

            // Sütun İndekslerini Bul (Fuzzy Matching)
            const findIndex = (search: string[]) => headers.findIndex(h => search.some(s => h.includes(s.toLowerCase())));

            // Varsayılan İndeksler (Şablona göre)
            // 0: Tarih, 1: Başlık, 2: Tutar, 3: Tür, 4: Kategori, 5: Ödeme Yöntemi
            const dateIdx = findIndex(["tarih", "date"]) !== -1 ? findIndex(["tarih", "date"]) : 0;
            const titleIdx = findIndex(["başlık", "baslik", "title", "işlem", "islem"]) !== -1 ? findIndex(["başlık", "baslik", "title", "işlem", "islem"]) : 1;
            const amountIdx = findIndex(["tutar", "amount", "fiyat", "bedel"]) !== -1 ? findIndex(["tutar", "amount", "fiyat", "bedel"]) : 2;
            const typeIdx = findIndex(["tür", "tur", "type", "durum"]) !== -1 ? findIndex(["tür", "tur", "type", "durum"]) : 3;
            const categoryIdx = findIndex(["kategori", "category"]) !== -1 ? findIndex(["kategori", "category"]) : 4;
            const paymentMethodIdx = findIndex(["ödeme", "odeme", "method", "yöntem", "sekli"]) !== -1 ? findIndex(["ödeme", "odeme", "method", "yöntem", "sekli"]) : 5;

            // Veriyi Standadize Et
            const textData = rawRows.slice(1).map((row, idx) => {
                // Güvenli erişim
                const getValue = (index: number) => (row[index] !== undefined ? row[index] : "");

                let dateVal = getValue(dateIdx);
                // Excel tarih sayısı kontrolü
                if (typeof dateVal === 'number') {
                    const dateObj = XLSX.SSF.parse_date_code(dateVal);
                    dateVal = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
                } else {
                    dateVal = String(dateVal).trim();
                }

                // Tarih düzeltme (YYYY-MM-DD formatına zorla)
                if (dateVal.includes('.')) {
                    const parts = dateVal.split('.');
                    if (parts.length === 3) dateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (dateVal.includes('/')) {
                    const parts = dateVal.split('/');
                    if (parts.length === 3) dateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }

                return {
                    "Tarih (YYYY-MM-DD)": dateVal,
                    "Başlık": String(getValue(titleIdx)).trim(),
                    "Tutar": Number(getValue(amountIdx)) || 0,
                    "Tür (Gelir/Gider)": String(getValue(typeIdx)).trim(),
                    "Kategori": String(getValue(categoryIdx)).trim() || "Diğer",
                    "Ödeme Yöntemi": String(getValue(paymentMethodIdx)).trim() || "Nakit",
                    "_originalRow": idx + 2 // Debug için satır numarası
                };
            }).filter(item => item["Başlık"] !== "" || item["Tutar"] !== 0); // Boş satırları filtrele

            setPreviewData(textData);
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        const validTransactions: any[] = [];

        // 1. Verileri Hazırla (Zaten readExcel'de standardize edildi)
        for (const row of previewData) {
            try {
                const dateStr = row["Tarih (YYYY-MM-DD)"];
                // Başlık boşsa Kategori'yi, o da yoksa "İşlem"i kullan
                const titleRaw = row["Başlık"];
                const category = row["Kategori"] || "Diğer";
                const title = titleRaw ? String(titleRaw).trim() : (category !== "Diğer" ? category : "İşlem");

                const amount = Number(row["Tutar"]);
                const typeStr = row["Tür (Gelir/Gider)"];
                const paymentMethod = row["Ödeme Yöntemi"] || "Nakit";

                // Validasyon: Artık Title zorunlu değil (default atanıyor)
                if (!dateStr || isNaN(amount) || !typeStr) {
                    // console.warn("Skipping invalid row:", row);
                    failCount++;
                    continue;
                }

                const type = String(typeStr).toLowerCase().includes('gelir') ? 'income' : 'expense';

                // Tarih basitleştirilmiş kontrol
                let dateValue = dateStr;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    // Fallback date parsing
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                        dateValue = d.toISOString().split('T')[0];
                    } else {
                        failCount++;
                        continue;
                    }
                }

                validTransactions.push({
                    title: title || "İşlem", // Garanti olsun
                    amount,
                    type,
                    category,
                    payment_method: paymentMethod,
                    date: dateValue
                });
            } catch (error) {
                console.error("Row processing error:", error);
                failCount++;
            }
        }

        // 2. Parçalı Gönderim (Batch Insert)
        const CHUNK_SIZE = 1000;
        const totalChunks = Math.ceil(validTransactions.length / CHUNK_SIZE);

        try {
            for (let i = 0; i < totalChunks; i++) {
                const chunk = validTransactions.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                await createBulkTransactions(chunk);
                successCount += chunk.length;
                console.log(`Chunk ${i + 1}/${totalChunks} uploaded.`);
            }

            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(`${successCount} işlem başarıyla eklendi. ${failCount > 0 ? `(${failCount} satır atlandı)` : ''}`);
            onClose();
            setFile(null);
            setPreviewData([]);
        } catch (error) {
            console.error("Toplu yükleme hatası:", error);
            toast.error("Veriler yüklenirken bir hata oluştu.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        Excel'den Veri İçe Aktar
                    </DialogTitle>
                    <DialogDescription>
                        Gelir ve giderlerinizi toplu olarak sisteme yükleyin.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Adım 1: Şablon İndir */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-medium text-sm">1. Adım: Şablonu Hazırlayın</h4>
                            <p className="text-xs text-muted-foreground">Verilerinizi doğru formatta hazırlamak için örnek şablonu indirin.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 h-8">
                            <Download className="w-3.5 h-3.5" /> Şablon İndir
                        </Button>
                    </div>

                    {/* Adım 2: Dosya Yükle */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">2. Adım: Dosyayı Yükleyin</h4>
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
                                file ? "border-green-200 bg-green-50" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            {file ? (
                                <>
                                    <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                                    <p className="text-sm font-medium text-green-700">{file.name}</p>
                                    <p className="text-xs text-green-600/80">Değiştirmek için tıklayın</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium">Excel dosyasını buraya sürükleyin veya seçin</p>
                                    <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls veya .csv</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Önizleme */}
                    {previewData.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <TableIcon className="w-4 h-4" /> Önizleme ({previewData.length} kayıt)
                                </h4>
                            </div>
                            <ScrollArea className="h-[200px] border rounded-md">
                                <div className="p-2 space-y-1">
                                    {previewData.slice(0, 20).map((row, i) => ( // İlk 20 kaydı göster
                                        <div key={i} className="text-xs grid grid-cols-4 gap-2 p-2 border-b last:border-0 hover:bg-muted/50">
                                            <span className="font-medium truncate">{row["Başlık"]}</span>
                                            <span className="text-muted-foreground">{row["Tarih (YYYY-MM-DD)"]}</span>
                                            <span className={cn(
                                                "text-right font-medium",
                                                String(row["Tür (Gelir/Gider)"]).toLowerCase().includes("gelir") ? "text-green-600" : "text-red-600"
                                            )}>
                                                {Number(row["Tutar"]).toLocaleString('tr-TR')} ₺
                                            </span>
                                            <span className="text-right text-muted-foreground truncate">{row["Kategori"]}</span>
                                        </div>
                                    ))}
                                    {previewData.length > 20 && (
                                        <div className="text-center text-xs text-muted-foreground py-2 italic">
                                            ... ve {previewData.length - 20} kayıt daha
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <p className="text-[10px] text-muted-foreground"><AlertCircle className="w-3 h-3 inline mr-1" /> Veriler içe aktarılırken sistemdeki mevcut kayıtlar silinmez, üzerine eklenir.</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={isProcessing}>İptal</Button>
                    <Button onClick={handleImport} disabled={!file || previewData.length === 0 || isProcessing}>
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yükleniyor...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> İçe Aktar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
