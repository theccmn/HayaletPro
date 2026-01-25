/**
 * Workflow Trigger Service
 * Proje olaylarında iş akışlarını tetikler
 */
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import {
    getActiveWorkflowsByEvent,
    logWorkflowExecution,
    updateExecutionStatus,
    generateWhatsAppLink
} from './apiWorkflows';
import { getTemplateById } from './apiTemplates';
import type { Workflow } from '../types/workflow';
import type { Project } from '../types';

interface TriggerContext {
    project: Project;
    oldStatusId?: string;
    newStatusId?: string;
}

/**
 * Proje durum değişikliğinde workflow'ları tetikle
 */
export const triggerStatusChangeWorkflows = async (context: TriggerContext): Promise<void> => {
    try {
        // Durum değişikliği için aktif workflow'ları bul
        const workflows = await getActiveWorkflowsByEvent('project_status_changed');

        if (!workflows || workflows.length === 0) {
            console.log('[Workflow] Aktif durum değişikliği workflow\'u bulunamadı');
            return;
        }

        for (const workflow of workflows) {
            // Koşul kontrolü
            const condition = workflow.trigger_condition;

            // from_status_id kontrolü (belirtilmişse)
            if (condition?.from_status_id && condition.from_status_id !== context.oldStatusId) {
                console.log(`[Workflow] ${workflow.name}: from_status_id eşleşmedi, atlanıyor`);
                continue;
            }

            // to_status_id kontrolü (belirtilmişse)
            if (condition?.to_status_id && condition.to_status_id !== context.newStatusId) {
                console.log(`[Workflow] ${workflow.name}: to_status_id eşleşmedi, atlanıyor`);
                continue;
            }

            console.log(`[Workflow] ${workflow.name} tetikleniyor...`);

            // Workflow'u çalıştır
            await executeWorkflow(workflow, context);
        }
    } catch (error) {
        console.error('[Workflow] Tetikleme hatası:', error);
    }
};

/**
 * Tek bir workflow'u çalıştır
 */
const executeWorkflow = async (workflow: Workflow, context: TriggerContext): Promise<void> => {
    const { project } = context;
    const channels = workflow.channels || {};

    // Şablon içeriğini al
    let content = { html: '', text: '' };

    if (workflow.template_id) {
        try {
            const template = await getTemplateById(workflow.template_id);
            content = await renderTemplate(template?.blocks || [], project);
        } catch (e) {
            console.error('[Workflow] Şablon yüklenemedi:', e);
            const defaultMsg = `Merhaba ${project.client_name}, projeniz "${project.title}" ile ilgili bir güncelleme var.`;
            content = { html: `<p>${defaultMsg}</p>`, text: defaultMsg };
        }
    } else {
        const defaultMsg = `Merhaba ${project.client_name}, projeniz "${project.title}" ile ilgili bir güncelleme var.`;
        content = { html: `<p>${defaultMsg}</p>`, text: defaultMsg };
    }

    // E-posta gönder
    if (channels.email) {
        await sendEmailNotification(workflow, project, content.html, content.text);
    }

    // WhatsApp bildirimi göster
    if (channels.whatsapp) {
        // Artık renderTemplate içinde sıralama doğru yapılıyor (İçerik -> Seans -> Footer)
        await showWhatsAppNotification(workflow, project, content.text);
    }
};

/**
 * Seans bilgilerini düz metin olarak oluştur (Helper)
 */
const getPlainTextSessionDetails = (project: Project): string => {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long'
        });
    };

    const formatPrice = (price?: number) => {
        if (!price) return '-';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
    };

    const locationName = project.location_name || project.locations?.name || 'Belirtilmedi';

    let details = `📝 Seans Bilgileri\n------------------\n`;
    details += `Proje Adı: ${project.title}\n`;
    details += `Tarih: ${formatDate(project.start_date)}\n`;
    if (project.start_date) {
        details += `Saat: ${new Date(project.start_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n`;
    }
    details += `Konum: ${locationName}\n`;
    if (project.price) {
        details += `Tutar: ${formatPrice(project.price)}\n`;
    }

    return details;
};

/**
 * E-posta bildirimi gönder
 */
const sendEmailNotification = async (
    workflow: Workflow,
    project: Project,
    htmlContent: string,
    textContent: string
): Promise<void> => {
    try {
        // Execution log oluştur
        const execution = await logWorkflowExecution({
            workflow_id: workflow.id,
            project_id: project.id,
            client_id: project.client_id || undefined,
            channel: 'email',
            status: 'pending',
            message_preview: textContent.substring(0, 200)
        });

        // @ts-ignore - clients ilişkisi
        const clientEmail = project.clients?.email || project.email;

        if (!clientEmail) {
            await updateExecutionStatus(execution.id, 'failed', 'Müşteri e-posta adresi bulunamadı');
            toast.error(`${workflow.name}: Müşteri e-posta adresi bulunamadı`);
            return;
        }

        // İşletme bilgilerini al (logo için)
        const businessSettings = await getBusinessSettings();

        // Zengin HTML içeriği oluştur
        const finalHtml = constructEmailHtml(project, htmlContent, businessSettings);

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                type: 'workflow_notification',
                to: clientEmail,
                subject: `${project.title} - Proje Güncelleme`,
                content: textContent,    // Fallback for plain text
                html: finalHtml,         // Rich HTML
                projectTitle: project.title,
                clientName: project.client_name
            }
        });

        if (error || (data && data.success === false)) {
            const errorMsg = error?.message || data?.error || JSON.stringify(error);
            console.error('[Workflow] Edge Function Hatası:', error || data?.error);
            await updateExecutionStatus(execution.id, 'failed', errorMsg);
            toast.error(`${workflow.name}: E-posta Hatası - ${errorMsg}`);
        } else {
            console.log('[Workflow] E-posta başarıyla gönderildi:', data);
            await updateExecutionStatus(execution.id, 'sent');
            toast.success(`${workflow.name}: E-posta gönderildi`);
        }
    } catch (error: any) {
        const errorMsg = error?.message || JSON.stringify(error);
        console.error('[Workflow] E-posta gönderme hatası (Catch):', error);
        toast.error(`${workflow.name}: E-posta Hatası - ${errorMsg}`);
    }
};

/**
 * WhatsApp bildirimi göster (toast ile link)
 */
const showWhatsAppNotification = async (
    workflow: Workflow,
    project: Project,
    textContent: string
): Promise<void> => {
    try {
        // Execution log oluştur
        const execution = await logWorkflowExecution({
            workflow_id: workflow.id,
            project_id: project.id,
            client_id: project.client_id || undefined,
            channel: 'whatsapp',
            status: 'pending',
            message_preview: textContent.substring(0, 200)
        });

        // @ts-ignore - clients ilişkisi
        const clientPhone = project.clients?.phone || project.phone;

        if (!clientPhone) {
            await updateExecutionStatus(execution.id, 'failed', 'Müşteri telefon numarası bulunamadı');
            toast.error(`${workflow.name}: Müşteri telefon numarası bulunamadı`);
            return;
        }

        // WhatsApp linki oluştur
        const whatsappUrl = generateWhatsAppLink(clientPhone, textContent);

        // Tıklanabilir toast göster
        toast.success(
            `${workflow.name}: WhatsApp mesajı hazır`,
            {
                duration: 10000,
                action: {
                    label: 'WhatsApp Aç',
                    onClick: () => {
                        window.open(whatsappUrl, '_blank');
                        updateExecutionStatus(execution.id, 'clicked');
                    }
                }
            }
        );

        await updateExecutionStatus(execution.id, 'sent');
    } catch (error: any) {
        console.error('[Workflow] WhatsApp bildirimi hatası:', error);
        toast.error(`${workflow.name}: WhatsApp bildirimi gösterilemedi`);
    }
};

import { getContractSettings } from './apiContract';
import { getSetting } from './apiSettings';

/**
 * İşletme ayarlarını al (cache edilebilir)
 */
let businessSettingsCache: Record<string, string> | null = null;

const getBusinessSettings = async (): Promise<Record<string, string>> => {
    // Cache'i devre dışı bırakalım, belki veri güncellenmiştir
    // if (businessSettingsCache) return businessSettingsCache;

    try {
        // 1. Sözleşme ayarlarından işletme bilgilerini çek
        const contractSettings = await getContractSettings();

        // 2. Mail ayarlarından e-posta adresini çek
        const mailSettings = await getSetting('mail_notification_email');

        // 3. Genel ayarlardan (profil) yedek verileri çek
        const appTitle = await getSetting('app_title');
        const userName = await getSetting('user_name');

        const settings: Record<string, string> = {
            business_name: contractSettings?.company_name || appTitle || 'Hayalet Pro',
            business_owner: contractSettings?.company_owner || userName || '',
            business_address: contractSettings?.company_address || '',
            business_email: mailSettings || '',
            business_phone: '',
            business_logo: contractSettings?.logo_url || ''
        };

        businessSettingsCache = settings;
        console.log('[Workflow] İşletme ayarları yüklendi:', settings);
        return settings;
    } catch (e) {
        console.error('[Workflow] İşletme ayarları yüklenemedi:', e);
        return {
            business_name: 'Hayalet Pro',
            business_owner: '',
            business_address: '',
            business_email: '',
            business_phone: '',
            business_logo: ''
        };
    }
};

/**
 * E-posta için zengin HTML şablonu oluştur
 */
const constructEmailHtml = (project: Project, templateHtmlContent: string, business: Record<string, string>): string => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.title}</title></head><body style="margin:0;padding:0;background-color:#f6f9fc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;"><div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;box-shadow:0 4px 20px rgba(0,0,0,0.05);"><div style="height:40px;"></div><div style="padding:0 40px;"><div style="color:#4a5568;font-size:16px;line-height:1.6;">${templateHtmlContent}</div></div><div style="height:40px;"></div></div></body></html>`;
};

import { getStatuses } from './apiStatuses';

/**
 * Şablon bloklarını işleyerek HTML ve Metin çıktıları üretir
 */
const renderTemplate = async (blocks: any[], project: Project): Promise<{ html: string, text: string }> => {
    let htmlResult = '';
    let textResult = '';
    let footerHtml = '';
    let footerText = '';
    let hasFooter = false;
    let hasSession = false;

    // İşletme ayarlarını baştan alalım
    const business = await getBusinessSettings();

    // Status listesini al (gerekirse kullanmak için)
    let statuses: any[] = [];
    try {
        statuses = await getStatuses();
    } catch (e) {
        console.warn('Statüler yüklenemedi:', e);
    }

    // Tarih formatla (HTML için)
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    };

    const formatPrice = (price?: number) => {
        if (!price) return '-';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
    };

    const locationName = project.location_name || project.locations?.name || 'Belirtilmedi';

    // Statü etiketini bul
    const statusLabel = statuses.find(s => s.id === project.status_id)?.label || 'Belirtilmedi';

    for (const block of blocks) {
        // Text Block
        if (block.type === 'text' && block.content?.text) {
            const rawText = await replaceVariables(block.content.text, project);
            const align = block.content.align || 'left';
            const color = block.content.color || '#4a5568';

            htmlResult += `<div style="text-align: ${align}; color: ${color}; margin-bottom: 20px; white-space: pre-wrap;">${rawText}</div>`;
            textResult += `${rawText}\n\n`;
        }
        // Header Block
        else if (block.type === 'header' && block.content?.title) {
            const title = await replaceVariables(block.content.title, project);
            const align = block.content.logoAlignment || 'left';
            const bgColor = block.content.backgroundColor || 'transparent';
            const color = block.content.titleColor || '#1a202c';
            const logoEnabled = block.content.logoEnabled;

            let htmlHeaderContent = '';

            if (logoEnabled && business.business_logo) {
                // Logo boyutunu biraz küçültelim ve margin ekleyelim
                htmlHeaderContent += `<img src="${business.business_logo}" alt="${business.business_name}" style="height: 40px; object-fit: contain; margin-bottom: 10px;">`;
                if (title) htmlHeaderContent += '<br>';
            }

            if (title) {
                htmlHeaderContent += `<span style="font-size: 20px; font-weight: 600;">${title}</span>`;
            }

            htmlResult += `<div style="text-align: ${align}; background-color: ${bgColor}; color: ${color}; padding: ${bgColor !== 'transparent' ? '20px' : '0 0 20px 0'}; margin-bottom: 20px; border-radius: 8px;">${htmlHeaderContent}</div>`;

            // Text version
            textResult += `${title.toUpperCase()}\n------------------\n`;
        }
        // Image Block
        else if (block.type === 'image' && block.content?.url) {
            const url = block.content.url;
            const alt = block.content.alt || 'Görsel';
            const fullWidth = block.content.fullWidth;

            htmlResult += `<div style="margin-bottom: 24px; text-align: center;">
                <img src="${url}" alt="${alt}" style="max-width: 100%; ${fullWidth ? 'width: 100%;' : ''} height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
            </div>`;
        }
        // CTA Block
        else if (block.type === 'cta' && block.content?.text && block.content?.url) {
            const text = block.content.text;
            const url = block.content.url;
            const bgColor = block.content.backgroundColor || '#000000';
            const textColor = block.content.textColor || '#ffffff';

            htmlResult += `<div style="text-align: center; margin-bottom: 24px;">
                <a href="${url}" style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${text}</a>
            </div>`;

            textResult += `[${text}]: ${url}\n\n`;
        }
        // Session Block
        else if (block.type === 'session') {
            hasSession = true;

            // Ayarları kontrol et (Varsayılan: Göster)
            const showTitle = block.content?.showTitle !== false;
            const showType = block.content?.showType === true; // Varsayılan: Kapalı olabilir, panele göre değişir
            const showDuration = block.content?.showDuration === true;
            const showStatus = block.content?.showStatus === true;
            const showDate = block.content?.showDate !== false;
            const showTime = block.content?.showTime !== false;
            const showLocation = block.content?.showLocation !== false;
            const showMeetingLink = block.content?.showMeetingLink === true;
            const showProjectName = block.content?.showProjectName === true; // showTitle ile çakışabilir, ayrı tutalım
            const showPackageName = block.content?.showPackageName === true;
            const showNotes = block.content?.showNotes === true;
            const showPrice = block.content?.showPrice === true;

            // Verileri hazırla
            const sessionType = project.project_types?.label || '-';
            // @ts-ignore - duration veritabanında olabilir
            const duration = project.project_types?.duration ? `${project.project_types.duration} dakika` : '-';
            // Paket adı logic: details içinde "Paket: X" formatında olabilir veya direkt details
            const packageName = project.details || '-';

            htmlResult += `<div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <h3 style="margin: 0 0 20px 0; color: #1a202c; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                    📝 Seans Bilgileri
                </h3>
                <table style="width: 100%; border-collapse: collapse;">`;

            // HTML Satırları
            if (showTitle || showProjectName) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px; width: 40%;">Proje Adı</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${project.title}</td></tr>`;
            if (showType) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Seans Türü</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${sessionType}</td></tr>`;
            if (showDuration) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Süre</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${duration}</td></tr>`;
            if (showStatus) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Durum</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${statusLabel}</td></tr>`;
            if (showDate) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Tarih</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatDate(project.start_date)}</td></tr>`;
            if (showTime && project.start_date) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Saat</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${new Date(project.start_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td></tr>`;
            if (showLocation) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Konum</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${locationName}</td></tr>`;
            if (showMeetingLink && locationName.toLowerCase().includes('online')) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Görüşme Linki</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;"><a href="#" style="color: #3182ce;">Bağlantıya Git</a></td></tr>`; // Placeholder logic
            if (showPackageName) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Paket</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${packageName}</td></tr>`;
            if (showPrice && project.price) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Tutar</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatPrice(project.price)}</td></tr>`;
            if (showNotes && project.notes) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px; vertical-align: top;">Notlar</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${project.notes}</td></tr>`;

            htmlResult += `</table></div>`;

            // Text version (Dinamik)
            let detailsText = `📝 Seans Bilgileri\n------------------\n`;
            if (showTitle || showProjectName) detailsText += `Proje Adı: ${project.title}\n`;
            if (showType) detailsText += `Seans Türü: ${sessionType}\n`;
            if (showDuration) detailsText += `Süre: ${duration}\n`;
            if (showStatus) detailsText += `Durum: ${statusLabel}\n`;
            if (showDate) detailsText += `Tarih: ${formatDate(project.start_date)}\n`;
            if (showTime && project.start_date) detailsText += `Saat: ${new Date(project.start_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n`;
            if (showLocation) detailsText += `Konum: ${locationName}\n`;
            if (showPackageName) detailsText += `Paket: ${packageName}\n`;
            if (showPrice && project.price) detailsText += `Tutar: ${formatPrice(project.price)}\n`;
            if (showNotes && project.notes) detailsText += `Notlar: ${project.notes}\n`;

            textResult += `\n${detailsText}\n`;
        }
        // Footer Block
        else if (block.type === 'footer') {
            hasFooter = true;
            const text = block.content?.text ? await replaceVariables(block.content.text, project) : '';
            if (text) {
                footerHtml = `<div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 40px; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; color: #a0aec0; font-size: 12px; white-space: pre-wrap;">${text}</p>
                 </div>`;

                footerText = `\n------------------\n${text}\n`;
            }
        }
    }

    // Default Session Details (Fallback - Eğer şablonda yoksa varsayılan alanları göster)
    if (!hasSession) {
        htmlResult += `<div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <h3 style="margin: 0 0 20px 0; color: #1a202c; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                📝 Seans Bilgileri
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #718096; font-size: 14px; width: 40%;">Proje Adı</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${project.title}</td></tr>
                <tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Tarih</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatDate(project.start_date)}</td></tr>
                ${project.start_date ? `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Saat</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${new Date(project.start_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Konum</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${locationName}</td></tr>
                ${project.price ? `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Tutar</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatPrice(project.price)}</td></tr>` : ''}
            </table>
        </div>`;

        // Text version için de ekle (Varsayılan alanlar)
        let detailsText = `📝 Seans Bilgileri\n------------------\n`;
        detailsText += `Proje Adı: ${project.title}\n`;
        detailsText += `Tarih: ${formatDate(project.start_date)}\n`;
        if (project.start_date) detailsText += `Saat: ${new Date(project.start_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n`;
        detailsText += `Konum: ${locationName}\n`;
        if (project.price) detailsText += `Tutar: ${formatPrice(project.price)}\n`;

        textResult += `\n${detailsText}\n`;
    }

    // Append Footer (Özel veya Varsayılan)
    if (hasFooter) {
        htmlResult += footerHtml;
        textResult += footerText;
    } else {
        // Varsayılan Footer
        htmlResult += `<div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 40px; border-radius: 0 0 16px 16px;">
            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} ${business.business_name}<br>
                ${business.business_address ? `${business.business_address}<br>` : ''}
                ${business.business_phone ? `${business.business_phone}<br>` : ''}
                Bu e-posta otomatik olarak oluşturulmuştur.
            </p>
        </div>`;

        textResult += `\n------------------\n© ${new Date().getFullYear()} ${business.business_name}\n`;
    }

    // Fallback content if empty
    if (!htmlResult) {
        const defaultMsg = `Merhaba ${project.client_name}, projeniz "${project.title}" ile ilgili bir güncelleme var.`;
        htmlResult = `<div style="margin-bottom: 20px;">${defaultMsg}</div>`;
        textResult = defaultMsg;
    }

    // Clean up excessive newlines in textResult
    textResult = textResult
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim();

    return {
        html: htmlResult,
        text: textResult
    };
};

/**
 * Şablon değişkenlerini proje verileriyle değiştir
 */
const replaceVariables = async (text: string, project: Project): Promise<string> => {
    // @ts-ignore - clients ilişkisi
    const client = project.clients || {};
    const clientName = client.name || project.client_name || '';
    const clientEmail = client.email || '';
    const clientPhone = client.phone || project.phone || '';
    const clientAddress = client.address || '';
    const clientNotes = client.notes || '';

    // İşletme bilgilerini al
    const business = await getBusinessSettings();

    // Tarih formatı
    const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    };

    const now = new Date();

    return text
        // İşletme Bilgileri - fallback olarak boş string kullanıyoruz
        .replace(/\{\{business_name\}\}/gi, business.business_name || '')
        .replace(/\{\{business_owner\}\}/gi, business.business_owner || '')
        .replace(/\{\{business_address\}\}/gi, business.business_address || '')
        .replace(/\{\{business_email\}\}/gi, business.business_email || '')
        .replace(/\{\{business_phone\}\}/gi, business.business_phone || '')

        // Kişi (Müşteri) Bilgileri
        .replace(/\{\{client_name\}\}/gi, clientName)
        .replace(/\{\{musteri_adi\}\}/gi, clientName)
        .replace(/\{\{client_email\}\}/gi, clientEmail)
        .replace(/\{\{client_phone\}\}/gi, clientPhone)
        .replace(/\{\{client_address\}\}/gi, clientAddress)
        .replace(/\{\{client_notes\}\}/gi, clientNotes)

        // Proje Bilgileri
        .replace(/\{\{project_title\}\}/gi, project.title || '')
        .replace(/\{\{proje_adi\}\}/gi, project.title || '')
        .replace(/\{\{project_start_date\}\}/gi, formatDate(project.start_date))
        .replace(/\{\{proje_tarihi\}\}/gi, formatDate(project.start_date))
        .replace(/\{\{project_delivery_date\}\}/gi, formatDate(project.delivery_date))
        .replace(/\{\{project_details\}\}/gi, project.details || '')
        .replace(/\{\{project_notes\}\}/gi, project.notes || '')
        .replace(/\{\{project_price\}\}/gi, project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '')
        .replace(/\{\{fiyat\}\}/gi, project.price ? `₺${project.price.toLocaleString('tr-TR')}` : '')

        // Sistem
        .replace(/\{\{current_date\}\}/gi, now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))
        .replace(/\{\{current_time\}\}/gi, now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
};

/**
 * Proje oluşturulduğunda tetikle
 */
export const triggerProjectCreatedWorkflows = async (project: Project): Promise<void> => {
    try {
        const workflows = await getActiveWorkflowsByEvent('project_created');

        for (const workflow of workflows) {
            await executeWorkflow(workflow, { project });
        }
    } catch (error) {
        console.error('[Workflow] Proje oluşturma tetikleme hatası:', error);
    }
};
