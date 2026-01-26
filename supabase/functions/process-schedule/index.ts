
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Helper Definitions ---

interface Project {
    id: string;
    title: string;
    start_date?: string;
    delivery_date?: string;
    details?: string;
    notes?: string;
    price?: number;
    client_name?: string;
    client_id?: string;
    location_name?: string;
    locations?: { name: string };
    clients?: { name?: string; email?: string; phone?: string; address?: string; notes?: string };
    project_types?: { label: string; duration?: number };
}

// --- Helper: Replace Variables ---
const replaceVariables = (text: string, project: any, client: any, settings: any): string => {
    if (!text) return '';

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '';
    const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : '';
    const formatPrice = (p: any) => p ? `₺${p.toLocaleString('tr-TR')}` : '';

    let res = text;
    const now = new Date();

    // Business
    res = res.replace(/\{\{business_name\}\}/gi, settings.business_name || 'Hayalet Pro')
    res = res.replace(/\{\{business_owner\}\}/gi, settings.business_owner || '')
    res = res.replace(/\{\{business_email\}\}/gi, settings.business_email || '')
    res = res.replace(/\{\{business_address\}\}/gi, settings.business_address || '')
    res = res.replace(/\{\{business_logo\}\}/gi, settings.business_logo || '')

    // Client
    res = res.replace(/\{\{client_name\}\}/gi, client.name || '')
    res = res.replace(/\{\{musteri_adi\}\}/gi, client.name || '')
    res = res.replace(/\{\{client_email\}\}/gi, client.email || '')
    res = res.replace(/\{\{client_phone\}\}/gi, client.phone || '')

    // Project
    res = res.replace(/\{\{project_title\}\}/gi, project.title || '')
    res = res.replace(/\{\{proje_adi\}\}/gi, project.title || '')
    res = res.replace(/\{\{project_start_date\}\}/gi, formatDate(project.start_date))
    res = res.replace(/\{\{proje_tarihi\}\}/gi, formatDate(project.start_date))
    res = res.replace(/\{\{project_notes\}\}/gi, project.notes || '')
    res = res.replace(/\{\{project_price\}\}/gi, formatPrice(project.price))

    // System
    res = res.replace(/\{\{current_date\}\}/gi, formatDate(now.toISOString()))

    return res;
}

// --- Helper: Construct HTML Skeleton ---
const constructEmailHtml = (project: any, templateHtmlContent: string): string => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.title}</title></head><body style="margin:0;padding:0;background-color:#f6f9fc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;"><div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;box-shadow:0 4px 20px rgba(0,0,0,0.05);"><div style="height:40px;"></div><div style="padding:0 40px;"><div style="color:#4a5568;font-size:16px;line-height:1.6;">${templateHtmlContent}</div></div><div style="height:40px;"></div></div></body></html>`;
};

// --- Helper: Render Template ---
const renderTemplate = (blocks: any[], project: any, client: any, settings: any) => {
    let htmlResult = '';
    let textResult = '';

    for (const block of blocks) {
        if (block.type === 'text' && block.content?.text) {
            const txt = replaceVariables(block.content.text, project, client, settings);
            const align = block.content.align || 'left';
            const color = block.content.color || '#4a5568';
            htmlResult += `<div style="text-align: ${align}; color: ${color}; margin-bottom: 20px; white-space: pre-wrap;">${txt}</div>`;
            textResult += `${txt}\n\n`;
        }
        else if (block.type === 'header' && block.content?.title) {
            const txt = replaceVariables(block.content.title, project, client, settings);
            const align = block.content.logoAlignment || 'left';
            const bgColor = block.content.backgroundColor || 'transparent';
            const color = block.content.titleColor || '#1a202c';
            const logoEnabled = block.content.logoEnabled;

            let htmlHeaderContent = '';
            // Logo logic
            if (logoEnabled && settings.business_logo) {
                htmlHeaderContent += `<img src="${settings.business_logo}" alt="${settings.business_name}" style="height: 40px; object-fit: contain; margin-bottom: 10px; display: inline-block;">`;
                if (txt) htmlHeaderContent += '<br>';
            }

            if (txt) {
                htmlHeaderContent += `<span style="font-size: 20px; font-weight: 600;">${txt}</span>`;
            }

            htmlResult += `<div style="text-align: ${align}; background-color: ${bgColor}; color: ${color}; padding: ${bgColor !== 'transparent' ? '20px' : '0 0 20px 0'}; margin-bottom: 20px; border-radius: 8px;">
                ${htmlHeaderContent}
            </div>`;
            textResult += `--- ${txt} ---\n\n`;
        }
        else if (block.type === 'image' && block.content?.url) {
            const url = block.content.url;
            const alt = block.content.alt || 'Görsel';
            const fullWidth = block.content.fullWidth;
            htmlResult += `<div style="margin-bottom: 24px; text-align: center;">
                <img src="${url}" alt="${alt}" style="max-width: 100%; ${fullWidth ? 'width: 100%;' : ''} height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
            </div>`;
        }
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
        else if (block.type === 'session') {
            const hasSession = true;
            const showTitle = block.content?.showTitle !== false;
            const showDate = block.content?.showDate !== false;
            const showTime = block.content?.showTime !== false;
            const showLocation = block.content?.showLocation !== false;
            const showPrice = block.content?.showPrice === true;
            const showNotes = block.content?.showNotes === true;

            const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }) : '-';
            const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : '';
            const locationName = project.location_name || project.locations?.name || '-';

            htmlResult += `<div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <h3 style="margin: 0 0 20px 0; color: #1a202c; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                    📝 Seans Bilgileri
                </h3>
                <table style="width: 100%; border-collapse: collapse;">`;

            if (showTitle) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px; width: 40%;">Proje Adı</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${project.title}</td></tr>`;
            if (showDate) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Tarih</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatDate(project.start_date || '')}</td></tr>`;
            if (showTime && project.start_date) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Saat</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${formatTime(project.start_date)}</td></tr>`;
            if (showLocation) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Konum</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${locationName}</td></tr>`;
            if (showPrice && project.price) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px;">Tutar</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">₺${project.price}</td></tr>`;
            if (showNotes && project.notes) htmlResult += `<tr><td style="padding: 8px 0; color: #718096; font-size: 14px; vertical-align: top;">Notlar</td><td style="padding: 8px 0; color: #2d3748; font-weight: 600;">${project.notes}</td></tr>`;

            htmlResult += `</table></div>`;

            textResult += `Seans Bilgileri:\nProje: ${project.title}\nTarih: ${formatDate(project.start_date || '')} ${formatTime(project.start_date || '')}\n\n`;
        }
        else if (block.type === 'footer') {
            const txt = replaceVariables(block.content?.text || '', project, client, settings);
            if (txt) {
                htmlResult += `<div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 40px; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; color: #a0aec0; font-size: 12px; white-space: pre-wrap;">${txt}</p>
                 </div>`;
                textResult += `\n------------------\n${txt}\n`;
            }
        }
    }

    // Wrap in skeleton
    const finalHtml = constructEmailHtml(project, htmlResult);

    if (!htmlResult) {
        const msg = `Merhaba ${client.name}, ${project.title} projeniz ile ilgili hatırlatma.`;
        return { html: `<p>${msg}</p>`, text: msg };
    }

    return { html: finalHtml, text: textResult };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Process Schedule Function Started");
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get Settings (Consolidated)
        const { data: settingsData } = await supabaseClient.from('settings').select('*');
        const settingsMap: any = {};
        settingsData?.forEach((s: any) => settingsMap[s.key] = s.value);

        // Get Contract Settings (for Logo, Owner, Address)
        const { data: contractSettings } = await supabaseClient.from('contract_settings').select('*').order('updated_at', { ascending: false }).limit(1);
        const contract = contractSettings && contractSettings.length > 0 ? contractSettings[0] : {};

        // Construct Business Object
        const businessSettings = {
            business_name: contract.company_name || settingsMap['app_title'] || 'Hayalet Pro',
            business_email: settingsMap['mail_notification_email'],
            business_owner: contract.company_owner || settingsMap['user_name'],
            business_address: contract.company_address || '',
            business_phone: '',
            business_logo: contract.logo_url || ''
        };

        console.log("Business Settings Loaded:", businessSettings);

        // 2. Get active active scheduled workflows
        const { data: workflows, error: workflowError } = await supabaseClient
            .from('workflows')
            .select('*, message_templates(id, name, blocks)')
            .eq('trigger_type', 'schedule')
            .eq('is_active', true)

        if (workflowError) {
            console.error("Workflow Fetch Error:", workflowError);
            throw workflowError;
        }

        console.log(`Found ${workflows?.length || 0} active scheduled workflows.`);

        if (!workflows || workflows.length === 0) {
            return new Response(JSON.stringify({ message: 'No active scheduled workflows' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const results: any[] = []

        // 3. Iterate workflows
        for (const workflow of workflows) {
            console.log(`Processing workflow: ${workflow.name} (${workflow.id})`);
            const offsetMinutes = workflow.schedule_offset || 0
            const isBefore = workflow.schedule_type === 'before_project_date'

            const { data: projects, error: projectError } = await supabaseClient
                .from('projects')
                .select('*, clients(*), locations(*), project_types(*)')
                .not('start_date', 'is', null)

            if (projectError) {
                console.error(`Error fetching projects for workflow ${workflow.name}:`, projectError);
                continue;
            }

            console.log(`Checking ${projects?.length || 0} projects for workflow compliance.`);

            for (const project of projects) {
                if (!project.start_date) continue

                const startDate = new Date(project.start_date)
                const triggerDate = new Date(startDate.getTime())

                if (isBefore) {
                    triggerDate.setMinutes(triggerDate.getMinutes() - offsetMinutes)
                } else {
                    triggerDate.setMinutes(triggerDate.getMinutes() + offsetMinutes)
                }

                const now = new Date()

                // Trigger Logic Improvement:
                // For 'before' triggers: We can send it late, BUT not if the event has already started.
                // For 'after' triggers: We can send it late, up to 24 hours (to catch missed crons).

                let shouldTrigger = false;
                const twentyFourHours = 24 * 60 * 60 * 1000;

                if (isBefore) {
                    // Trigger time has passed AND Event has NOT started yet
                    shouldTrigger = triggerDate <= now && now < startDate;
                } else {
                    // Trigger time has passed AND it's not more than 24h old
                    shouldTrigger = triggerDate <= now && (now.getTime() - triggerDate.getTime()) < twentyFourHours;
                }

                // Debug log
                console.log(`Project: ${project.title}, Start: ${project.start_date}, TriggerDate: ${triggerDate.toISOString()}, Now: ${now.toISOString()}, ShouldTrigger: ${shouldTrigger}`);

                if (shouldTrigger) {
                    console.log(`Triggering workflow for project: ${project.title}`);
                    // Check execution
                    const { data: executions } = await supabaseClient
                        .from('workflow_executions')
                        .select('id')
                        .eq('workflow_id', workflow.id)
                        .eq('project_id', project.id)
                        .limit(1)

                    if (executions && executions.length > 0) {
                        console.log(`Workflow already executed for project ${project.title}. Skipping.`);
                        continue;
                    }

                    const client = project.clients || { name: project.client_name, email: project.email, phone: project.phone };
                    if (!client) {
                        console.warn(`No client found for project ${project.title}. Skipping.`);
                        continue;
                    }

                    // Render Content
                    const blocks = workflow.message_templates?.blocks || [];
                    const rendered = renderTemplate(blocks, project, client, businessSettings);

                    // Log Execution
                    const { data: execution, error: insertError } = await supabaseClient
                        .from('workflow_executions')
                        .insert({
                            workflow_id: workflow.id,
                            project_id: project.id,
                            client_id: client.id,
                            channel: workflow.channels?.email ? 'email' : 'whatsapp',
                            status: 'pending',
                            message_preview: rendered.text.substring(0, 100)
                        })
                        .select()
                        .single()

                    if (insertError || !execution) {
                        console.error("Error creating execution record:", insertError);
                        continue;
                    }

                    results.push({
                        workflow: workflow.name,
                        project: project.title,
                        status: 'triggered'
                    })

                    // Send Email
                    if (workflow.channels?.email && client.email) {
                        console.log(`Sending email to ${client.email}`);
                        const { data: emailData, error: emailInvokeError } = await supabaseClient.functions.invoke('send-email', {
                            body: {
                                type: 'workflow_notification', // Standard type
                                to: client.email,
                                subject: `${project.title} - Hatırlatma`, // Could be better
                                html: rendered.html,
                                content: rendered.text
                            }
                        })

                        if (emailInvokeError) {
                            console.error("Email Invocation Error:", emailInvokeError);
                            await supabaseClient
                                .from('workflow_executions')
                                .update({
                                    status: 'failed',
                                    error_message: `Invoke Error: ${emailInvokeError.message}`
                                })
                                .eq('id', execution.id)
                        } else if (emailData && !emailData.success) {
                            console.error("Email Service Error:", emailData.error);
                            await supabaseClient
                                .from('workflow_executions')
                                .update({
                                    status: 'failed',
                                    error_message: `Email Error: ${emailData.error}`
                                })
                                .eq('id', execution.id)
                        } else {
                            console.log("Email sent successfully.");
                            // Update status to sent
                            await supabaseClient
                                .from('workflow_executions')
                                .update({ status: 'sent', error_message: null })
                                .eq('id', execution.id)
                        }
                    } else {
                        console.log("Skipping email: No email channel selected or client has no email.");
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Process Schedule Fatal Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
