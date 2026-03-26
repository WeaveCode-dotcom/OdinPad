/**
 * push-notify Edge Function
 * Sends a Web Push notification to all subscriptions for the calling user.
 *
 * Required secrets (set via `supabase secrets set`):
 *   VAPID_PUBLIC_KEY   — base64url VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url VAPID private key
 *   VAPID_SUBJECT      — mailto:you@example.com  (contact for VAPID)
 *
 * Generate a VAPID key pair once:
 *   npx web-push generate-vapid-keys --json
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonRes({ error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return jsonRes({ error: "Unauthorized" }, 401);

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@odinpad.app";
  if (!vapidPublic || !vapidPrivate) {
    return jsonRes({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets." }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  let payload: { title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    payload = { title: "OdinPad", body: "New notification" };
  }

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (subsErr) return jsonRes({ error: subsErr.message }, 500);
  if (!subs || subs.length === 0) return jsonRes({ sent: 0 });

  const pushPayload = JSON.stringify({
    title: payload.title ?? "OdinPad",
    body: payload.body ?? "",
    url: payload.url ?? "/",
  });

  let sent = 0;
  const failed: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload,
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Subscription expired — remove it
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint).eq("user_id", user.id);
      }
      failed.push(sub.endpoint.slice(-20));
    }
  }

  return jsonRes({ sent, failed: failed.length });
});
