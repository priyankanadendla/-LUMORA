const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertPayload {
  alertId: string;
  contactName: string;
  contactEmail: string;
  userName: string;
  message: string;
  locationLink: string;
  alertTime: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: AlertPayload = await req.json();

    const deliveryResult: Record<string, { status: "sent" | "failed"; error?: string }> = {};

    // Email delivery via Resend
    if (payload.contactEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        deliveryResult["email"] = {
          status: "failed",
          error: "Email provider not configured (RESEND_API_KEY missing)",
        };
      } else {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "LUMORA Safety <onboarding@resend.dev>",
              to: payload.contactEmail,
              subject: `LUMORA SAFETY ALERT: ${payload.userName}`,
              text: payload.message,
            }),
          });

          if (emailRes.ok) {
            deliveryResult["email"] = { status: "sent" };
          } else {
            const errText = await emailRes.text();
            deliveryResult["email"] = { status: "failed", error: `Resend API error: ${emailRes.status} — ${errText}` };
          }
        } catch (err) {
          deliveryResult["email"] = { status: "failed", error: err.message };
        }
      }
    } else {
      deliveryResult["email"] = {
        status: "failed",
        error: "No email address configured for this contact",
      };
    }

    return new Response(
      JSON.stringify({ success: true, deliveryResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
