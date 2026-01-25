
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Interface for Email Request
interface EmailRequest {
    type: "selection_completed" | "test_email" | "workflow_notification";
    to?: string; // For workflow_notification
    subject?: string; // For workflow_notification
    content?: string; // For workflow_notification
    payload?: {
        project_title?: string;
        client_name?: string;
        total_selected?: number;
        project_id?: string;
    };
}

// Helper to fetch settings from DB
const getAppSetting = async (supabase: any, key: string) => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error || !data) return null;
    return data.value;
};

serve(async (req) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Initialize Supabase Client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch dynamic settings
        // We fetch these in parallel for performance
        const [apiKey, adminEmail, fromName, fromEmail] = await Promise.all([
            getAppSetting(supabase, 'mail_resend_api_key'),
            getAppSetting(supabase, 'mail_notification_email'),
            getAppSetting(supabase, 'mail_from_name'),
            getAppSetting(supabase, 'mail_from_email')
        ]);

        if (!apiKey) {
            throw new Error("Mail servisi (Resend API Key) yapılandırılmamış.");
        }

        const bodyData = await req.json();
        console.log("Received body:", JSON.stringify(bodyData));

        const { type, payload } = bodyData as EmailRequest;

        if ((!payload && type !== "test_email" && type !== "workflow_notification") || !type) {
            throw new Error("Invalid request body: Missing type or payload");
        }

        if (type === "test_email") {
            const senderName = fromName || "Hayalet Pro";
            const senderEmail = fromEmail || "onboarding@resend.dev";
            const recipient = adminEmail;

            if (!recipient) {
                throw new Error("Test maili için bildirim alıcısı (sizin mailiniz) ayarlanmamış.");
            }

            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: `${senderName} <${senderEmail}>`,
                    to: recipient,
                    subject: `🔔 Test Bildirimi: ${senderName}`,
                    html: `
            <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
              <h2>Test Başarılı! 🎉</h2>
              <p>Bu mail, <strong>Hayalet Pro</strong> mail entegrasyonu ayarlarınızın doğru çalıştığını doğrulamak için gönderilmiştir.</p>
              
              <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>API Key:</strong> Doğru</p>
                <p style="margin: 5px 0 0;"><strong>Gönderici:</strong> ${senderName}</p>
              </div>
            </div>
          `,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Resend API Error:", data);
                // Return 200 with error info so client can see the message
                return new Response(JSON.stringify({ success: false, error: `Resend API Error: ${data.message || data.name || 'Unknown'}` }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ success: true, data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (type === "selection_completed") {
            const senderName = fromName || "Hayalet Pro";
            const senderEmail = fromEmail || "onboarding@resend.dev";
            const recipient = adminEmail || "admin@example.com";

            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: `${senderName} <${senderEmail}>`,
                    to: recipient,
                    subject: `✨ Fotoğraf Seçimi Tamamlandı: ${payload.client_name}`,
                    html: `
            <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
              <h2>Fotoğraf Seçimi Tamamlandı</h2>
              <p><strong>${payload.client_name}</strong> - <strong>${payload.project_title}</strong> projesi için seçim işlemini tamamladı.</p>
              
              <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Seçilen Fotoğraf Sayısı:</strong> ${payload.total_selected}</p>
                <p style="margin: 5px 0 0;"><strong>Proje:</strong> ${payload.project_title}</p>
              </div>

              <a href="https://hayalet-pro-v2.vercel.app/projects" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Panele Git</a>
            </div>
          `,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Resend API Error:", data);
                return new Response(JSON.stringify({ success: false, error: `Resend API Error: ${data.message || 'Unknown error'}` }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ success: true, data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Workflow notification - müşteriye e-posta
        if (type === "workflow_notification") {
            const senderName = fromName || "Hayalet Pro";
            const senderEmail = fromEmail || "onboarding@resend.dev";
            const recipient = bodyData.to;
            const emailSubject = bodyData.subject || "Proje Güncelleme";
            // Eğer 'html' parametresi gelirse direkt onu kullan, yoksa 'content'i varsayılan şablona sar
            const customHtml = bodyData.html;
            const textContent = bodyData.content || "";

            if (!recipient) {
                throw new Error("Alıcı e-posta adresi belirtilmedi.");
            }

            const finalHtml = customHtml || `
            <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
              <div style="white-space: pre-wrap;">${textContent}</div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #888; font-size: 12px;">Bu e-posta ${senderName} tarafından otomatik olarak gönderilmiştir.</p>
            </div>
          `;

            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: `${senderName} <${senderEmail}>`,
                    to: recipient,
                    subject: emailSubject,
                    html: finalHtml,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Resend API Error:", data);
                return new Response(JSON.stringify({ success: false, error: `Resend API Error: ${data.message || 'Unknown error'}` }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ success: true, data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Unknown event type" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        // Using status 200 to pass error message to client
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
