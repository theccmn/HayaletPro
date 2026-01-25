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
    let messageContent = '';
    if (workflow.template_id) {
        try {
            const template = await getTemplateById(workflow.template_id);
            messageContent = await renderTemplate(template?.blocks || [], project);
        } catch (e) {
            console.error('[Workflow] Şablon yüklenemedi:', e);
            messageContent = `Merhaba ${project.client_name}, projeniz "${project.title}" ile ilgili bir güncelleme var.`;
        }
    } else {
        messageContent = `Merhaba ${project.client_name}, projeniz "${project.title}" ile ilgili bir güncelleme var.`;
    }

    // E-posta gönder
    if (channels.email) {
        await sendEmailNotification(workflow, project, messageContent);
    }

    // WhatsApp bildirimi göster
    if (channels.whatsapp) {
        await showWhatsAppNotification(workflow, project, messageContent);
    }
};

/**
 * E-posta bildirimi gönder
 */
const sendEmailNotification = async (
    workflow: Workflow,
    project: Project,
    messageContent: string
): Promise<void> => {
    try {
        // Execution log oluştur
        const execution = await logWorkflowExecution({
            workflow_id: workflow.id,
            project_id: project.id,
            client_id: project.client_id || undefined,
            channel: 'email',
            status: 'pending',
            message_preview: messageContent.substring(0, 200)
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
        const htmlContent = constructEmailHtml(project, messageContent, businessSettings);

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                type: 'workflow_notification',
                to: clientEmail,
                subject: `${project.title} - Proje Güncelleme`,
                content: messageContent, // Fallback for plain text
                html: htmlContent,       // Rich HTML
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
    messageContent: string
): Promise<void> => {
    try {
        // Execution log oluştur
        const execution = await logWorkflowExecution({
            workflow_id: workflow.id,
            project_id: project.id,
            client_id: project.client_id || undefined,
            channel: 'whatsapp',
            status: 'pending',
            message_preview: messageContent.substring(0, 200)
        });

        // @ts-ignore - clients ilişkisi
        const clientPhone = project.clients?.phone || project.phone;

        if (!clientPhone) {
            await updateExecutionStatus(execution.id, 'failed', 'Müşteri telefon numarası bulunamadı');
            toast.error(`${workflow.name}: Müşteri telefon numarası bulunamadı`);
            return;
        }

        // WhatsApp linki oluştur
        const whatsappUrl = generateWhatsAppLink(clientPhone, messageContent);

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
const constructEmailHtml = (
    project: Project,
    messageContent: string,
    business: Record<string, string>
): string => {
    // Tarih formatla
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

    // Lokasyon bilgisi
    const locationName = project.location_name || project.locations?.name || 'Belirtilmedi';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${project.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        
        <!-- Header / Logo -->
        <div style="text-align: center; padding: 40px 20px;">
            ${business.business_logo
            ? `<img src="${business.business_logo}" alt="${business.business_name}" style="height: 60px; object-fit: contain;">`
            : `<h1 style="color: #333; margin: 0; font-size: 24px;">${business.business_name}</h1>`
        }
        </div>

        <!-- Main Content -->
        <div style="padding: 0 40px;">
            <div style="color: #4a5568; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${messageContent}</div>
        </div>

        <!-- Session Details Card -->
        <div style="padding: 30px 40px;">
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px 0; color: #1a202c; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                    📝 Seans Bilgileri
                </h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; width: 40%;">Proje Adı</td>
                        <td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${project.title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Tarih</td>
                        <td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatDate(project.start_date)}</td>
                    </tr>
                    ${project.start_date ? `
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Saat</td>
                        <td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${new Date(project.start_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Konum</td>
                        <td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${locationName}</td>
                    </tr>
                    ${project.price ? `
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Tutar</td>
                        <td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatPrice(project.price)}</td>
                    </tr>` : ''}
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} ${business.business_name}<br>
                ${business.business_address ? `${business.business_address}<br>` : ''}
                ${business.business_phone ? `${business.business_phone}<br>` : ''}
                Bu e-posta otomatik olarak oluşturulmuştur.
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Şablon bloklarını basit metne dönüştür
 */
const renderTemplate = async (blocks: any[], project: Project): Promise<string> => {
    let result = '';

    for (const block of blocks) {
        if (block.type === 'text' && block.content?.text) {
            result += await replaceVariables(block.content.text, project) + '\n';
        } else if (block.type === 'header' && block.content?.title) {
            result += await replaceVariables(block.content.title, project) + '\n\n';
        }
    }

    // Basit trim ve encoding kontrolü için normalize
    return (result.trim() || `Merhaba ${project.client_name}, projeniz hakkında bir güncelleme var.`);
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
