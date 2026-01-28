import { Dialog } from "./ui/dialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Transaction } from "../types";
import { Badge } from "./ui/badge";
import { Calendar, FileText, Tag, User } from "lucide-react";

interface DeliveryDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

export function DeliveryDetailDialog({ isOpen, onClose, transaction }: DeliveryDetailDialogProps) {
    if (!transaction) return null;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
            <div className="flex flex-col gap-1.5 mb-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold leading-none tracking-tight">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                    </span>
                    Teslimat Detayı
                </h2>
                <div className="text-sm text-muted-foreground">
                    {transaction.title} için kayıtlı işlem bilgileri.
                </div>
            </div>

            <div className="space-y-6">
                {/* Amount Display */}
                <div className="flex flex-col items-center justify-center p-6 bg-green-50/50 rounded-xl border border-green-100">
                    <span className="text-sm font-medium text-green-600 mb-1">Toplam Tutar</span>
                    <span className="text-3xl font-bold text-green-700">
                        {transaction.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                    <div className="flex gap-2 mt-3">
                        <Badge variant="outline" className="bg-white/50 text-green-700 border-green-200">
                            {transaction.payment_method || 'Nakit'}
                        </Badge>
                        <Badge variant="outline" className="bg-white/50 text-green-700 border-green-200">
                            {transaction.category || 'Genel'}
                        </Badge>
                    </div>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <div className="text-sm font-medium">İşlem Tarihi</div>
                            <div className="text-sm text-muted-foreground">
                                {format(new Date(transaction.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                            </div>
                        </div>
                    </div>

                    {transaction.job_date && (
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <div className="text-sm font-medium text-green-700">Teslim Tarihi</div>
                                <div className="text-sm text-green-600">
                                    {format(new Date(transaction.job_date), 'd MMMM yyyy, EEEE', { locale: tr })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <div className="text-sm font-medium">Müşteri / Başlık</div>
                            <div className="text-sm text-muted-foreground">{transaction.title}</div>
                        </div>
                    </div>

                    {transaction.description && (
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <div className="text-sm font-medium">Notlar</div>
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {transaction.description}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
}

