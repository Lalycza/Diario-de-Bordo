import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("TEAMS_ALLOWED_ORIGIN") ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};
const scopes = ["openid", "profile", "email", "offline_access", "User.Read", "Calendars.Read"];
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function response(data: unknown, status = 200, origin = "") {
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");
  if (origin && (Deno.env.get("TEAMS_ALLOWED_ORIGIN") === origin)) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(JSON.stringify(data), { status, headers });
}
function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server configuration missing: ${name}`);
  return value;
}
function base64url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomString(size = 48) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return base64url(bytes);
}
async function sha256(value: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
async function encryptionKey() {
  const raw = Uint8Array.from(atob(required("TEAMS_TOKEN_ENCRYPTION_KEY")), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("TEAMS_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value));
  return { ciphertext: base64url(new Uint8Array(cipher)), iv: base64url(iv) };
}
async function decrypt(ciphertext: string, iv: string) {
  const fromUrl = (v: string) => Uint8Array.from(atob(v.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - v.length % 4) % 4)), (c) => c.charCodeAt(0));
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromUrl(iv) }, await encryptionKey(), fromUrl(ciphertext));
  return new TextDecoder().decode(clear);
}
async function graphToken(refreshToken: string) {
  const tenant = required("TEAMS_TENANT_ID");
  const body = new URLSearchParams({
    client_id: required("TEAMS_CLIENT_ID"),
    client_secret: required("TEAMS_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: scopes.join(" "),
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Microsoft token refresh failed");
  return data as { access_token: string; refresh_token?: string; expires_in?: number };
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  try {
    // OAuth redirect callback is validated by one-time state; other actions require a valid Supabase user JWT.
    if (url.searchParams.has("code") || url.searchParams.has("error")) {
      const state = url.searchParams.get("state") ?? "";
      const stateHash = await sha256(state);
      const { data: oauthState, error: stateError } = await admin.from("teams_calendar_oauth_states")
        .select("state_hash,user_id,code_verifier,expires_at").eq("state_hash", stateHash).maybeSingle();
      if (stateError || !oauthState || new Date(oauthState.expires_at).getTime() < Date.now()) {
        return new Response("Estado OAuth inválido ou expirado. Feche esta janela e tente novamente.", { status: 400 });
      }
      await admin.from("teams_calendar_oauth_states").delete().eq("state_hash", stateHash);
      if (url.searchParams.has("error")) return Response.redirect(required("TEAMS_APP_REDIRECT_URL") + "?teams=denied", 302);
      const body = new URLSearchParams({
        client_id: required("TEAMS_CLIENT_ID"),
        client_secret: required("TEAMS_CLIENT_SECRET"),
        grant_type: "authorization_code",
        code: url.searchParams.get("code")!,
        redirect_uri: required("TEAMS_REDIRECT_URI"),
        code_verifier: oauthState.code_verifier,
        scope: scopes.join(" "),
      });
      const tokenRes = await fetch(`https://login.microsoftonline.com/${required("TEAMS_TENANT_ID")}/oauth2/v2.0/token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok || !token.refresh_token || !token.access_token) throw new Error("Microsoft authorization exchange failed");
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const me = await meRes.json();
      if (!meRes.ok || !me.id) throw new Error("Unable to identify Microsoft account");
      const encrypted = await encrypt(token.refresh_token);
      const { error } = await admin.from("teams_calendar_connections").upsert({
        user_id: oauthState.user_id, microsoft_user_id: me.id,
        microsoft_email: me.mail ?? me.userPrincipalName ?? null,
        refresh_token_ciphertext: encrypted.ciphertext, refresh_token_iv: encrypted.iv,
        scopes, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return Response.redirect(required("TEAMS_APP_REDIRECT_URL") + "?teams=connected", 302);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return response({ error: "Authentication required" }, 401, origin);
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userError || !user) return response({ error: "Invalid session" }, 401, origin);
    const action = url.searchParams.get("action") ?? (req.method === "POST" ? (await req.json().catch(() => ({}))).action : "status");

    if (action === "start") {
      const state = randomString();
      const verifier = randomString(64);
      const challenge = await sha256(verifier);
      const stateHash = await sha256(state);
      const { error } = await admin.from("teams_calendar_oauth_states").insert({
        state_hash: stateHash, user_id: user.id, code_verifier: verifier,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (error) throw error;
      const authUrl = new URL(`https://login.microsoftonline.com/${required("TEAMS_TENANT_ID")}/oauth2/v2.0/authorize`);
      authUrl.search = new URLSearchParams({
        client_id: required("TEAMS_CLIENT_ID"), response_type: "code",
        redirect_uri: required("TEAMS_REDIRECT_URI"), response_mode: "query",
        scope: scopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256",
      }).toString();
      return response({ auth_url: authUrl.toString() }, 200, origin);
    }
    if (action === "status") {
      const { data, error } = await admin.from("teams_calendar_connections")
        .select("microsoft_email,connected_at,last_synced_at").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return response({ connected: !!data, connection: data ?? null }, 200, origin);
    }
    if (action === "disconnect") {
      const { error } = await admin.from("teams_calendar_connections").delete().eq("user_id", user.id);
      if (error) throw error;
      await admin.from("teams_calendar_events").delete().eq("user_id", user.id);
      return response({ disconnected: true }, 200, origin);
    }
    if (action === "sync") {
      const { data: connection, error } = await admin.from("teams_calendar_connections")
        .select("microsoft_email,refresh_token_ciphertext,refresh_token_iv,delta_link").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!connection) return response({ error: "Microsoft 365 is not connected" }, 409, origin);
      const token = await graphToken(await decrypt(connection.refresh_token_ciphertext, connection.refresh_token_iv));
      if (token.refresh_token) {
        const encrypted = await encrypt(token.refresh_token);
        await admin.from("teams_calendar_connections").update({
          refresh_token_ciphertext: encrypted.ciphertext, refresh_token_iv: encrypted.iv, updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }
      const now = new Date();
      const start = new Date(now.getTime() - 90 * 86400000).toISOString();
      const end = new Date(now.getTime() + 180 * 86400000).toISOString();
      let next = connection.delta_link || `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`;
      let count = 0;
      for (let page = 0; next && count < 5000; page++) {
        const res = await fetch(next, { headers: { Authorization: `Bearer ${token.access_token}`, Prefer: 'outlook.timezone="UTC"' } });
        const data = await res.json();
        if (!res.ok) throw new Error("Microsoft calendar sync failed");
        for (const ev of (data.value ?? [])) {
          if (ev["@removed"]) {
            await admin.from("teams_calendar_events").update({ is_cancelled: true, updated_at: new Date().toISOString() })
              .eq("user_id", user.id).eq("graph_event_id", ev.id);
          } else {
            const startAt = ev.start?.dateTime ? new Date(ev.start.dateTime + (ev.start.timeZone === "UTC" ? "Z" : "")).toISOString() : null;
            const endAt = ev.end?.dateTime ? new Date(ev.end.dateTime + (ev.end.timeZone === "UTC" ? "Z" : "")).toISOString() : null;
            const { error: upsertError } = await admin.from("teams_calendar_events").upsert({
              user_id: user.id, graph_event_id: ev.id, subject: ev.subject || "(Sem título)",
              body_preview: ev.bodyPreview ?? null, starts_at: startAt, ends_at: endAt,
              is_all_day: !!ev.isAllDay, show_as: ev.showAs ?? null, web_link: ev.webLink ?? null,
              last_modified_at: ev.lastModifiedDateTime ?? null, is_cancelled: false, updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,graph_event_id" });
            if (upsertError) throw upsertError;
          }
          count++;
        }
        if (data["@odata.nextLink"]) next = data["@odata.nextLink"];
        else {
          const delta = data["@odata.deltaLink"];
          if (delta) await admin.from("teams_calendar_connections").update({
            delta_link: delta, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
          next = null;
        }
        if (page > 20) break;
      }
      return response({ synced: count, last_synced_at: new Date().toISOString() }, 200, origin);
    }
    return response({ error: "Unknown action" }, 400, origin);
  } catch (error) {
    console.error("teams-calendar request failed", error instanceof Error ? error.message : "unknown error");
    return response({ error: "Teams calendar operation failed; check server configuration and logs." }, 500, origin);
  }
});
