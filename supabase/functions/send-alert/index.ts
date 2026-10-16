const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertPayload {
  alertId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  alertChannels: string[];
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

    // Email delivery via Resend if RESEND_API_KEY is configured
    if (payload.alertChannels.includes("email") && payload.contactEmail) {
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
              from: "LUMORA Safety <alerts@lumora.app>",
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
    }

    // SMS delivery via Twilio if TWILIO credentials are configured
    if (payload.alertChannels.includes("sms") && payload.contactPhone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

      if (!twilioSid || !twilioToken || !twilioFrom) {
        deliveryResult["sms"] = {
          status: "failed",
          error: "SMS provider not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER missing)",
        };
      } else {
        try {
          const auth = btoa(`${twilioSid}:${twilioToken}`);
          const smsRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: twilioFrom,
                To: payload.contactPhone,
                Body: payload.message,
              }),
            }
          );

          if (smsRes.ok) {
            deliveryResult["sms"] = { status: "sent" };
          } else {
            const errText = await smsRes.text();
            deliveryResult["sms"] = { status: "failed", error: `Twilio API error: ${smsRes.status} — ${errText}` };
          }
        } catch (err) {
          deliveryResult["sms"] = { status: "failed", error: err.message };
        }
      }
    }

    // If no channels were attempted
    if (Object.keys(deliveryResult).length === 0) {
      deliveryResult["no_channels"] = {
        status: "failed",
        error: "No alert channels configured or contact details missing",
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
