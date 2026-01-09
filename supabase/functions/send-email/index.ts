
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

interface EmailRequest {
    type: "selection_completed";
    payload: {
        project_title: string;
        client_name: string;
        total_selected: number;
        project_id: string;
    };
}

serve(async (req) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const bodyData = await req.json();
        console.log("Received body:", JSON.stringify(bodyData));

        const { type, payload } = bodyData as EmailRequest;

        if (!payload || !type) {
            console.error("Invalid request body:", bodyData);
            throw new Error("Invalid request body: Missing type or payload");
        }

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set");
        }

        if (type === "selection_completed") {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "Hayalet Pro <onboarding@resend.dev>",
                    to: ADMIN_EMAIL || "admin@example.com",
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
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ message: "Unknown event type" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
