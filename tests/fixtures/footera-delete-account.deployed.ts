// Footera self-service hard account removal.
// No service-role credential is exposed to the browser.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const ORIGIN = "https://basti17svh-cloud.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function answer(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {status, headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (request.headers.get("origin") && request.headers.get("origin") !== ORIGIN) return answer(403,{error:"Origin nicht erlaubt."});
  if (request.method !== "POST") return answer(405,{error:"Methode nicht erlaubt."});
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return answer(503,{error:"Kontolöschung momentan nicht verfügbar."});
  const match = /^Bearer (\S+)$/i.exec(request.headers.get("Authorization") || "");
  if (!match) return answer(401,{error:"Bitte erneut anmelden."});
  let input: {confirmation?:unknown,password?:unknown};
  try {input = await request.json()} catch {return answer(400,{error:"Ungültige Anfrage."})}
  if (input.confirmation !== "FOOTERA LÖSCHEN") return answer(400,{error:"Bestätigung nicht korrekt."});
  const client = createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:identityError}=await client.auth.getUser(match[1]);
  if (identityError || !user || user.is_anonymous) return answer(401,{error:"Dauerhaftes Konto erforderlich. Bitte erneut anmelden."});
  const hasEmailPassword = (user.identities||[]).some(i=>i.provider==="email");
  if (hasEmailPassword) {
    if (typeof input.password !== "string" || !input.password || input.password.length>256) return answer(400,{error:"Bitte zur Sicherheit dein Kontopasswort eingeben."});
    const verified = await client.auth.signInWithPassword({email:user.email||"",password:input.password});
    if (verified.error || verified.data.user?.id!==user.id) return answer(403,{error:"Passwort stimmt nicht."});
  } else {
    // For a Google-only user without a password, require a very recent sign-in.
    const signedIn = Date.parse(user.last_sign_in_at||"");
    if (!Number.isFinite(signedIn) || Date.now()-signedIn>10*60*1000 || signedIn>Date.now()+60000) {
      return answer(403,{error:"Bitte melde dich für die Kontolöschung erneut an (maximal 10 Minuten vorher)."});
    }
  }
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  // Existing Footera FK constraints cascade from auth.users to profile, conversations,
  // matches and cloud saves. No soft-delete: this is a hard deletion.
  const {error}=await admin.auth.admin.deleteUser(user.id,false);
  if (error) return answer(500,{error:"Konto konnte nicht vollständig gelöscht werden. Es wurden keine lokalen Daten entfernt."});
  return answer(200,{deleted:true});
});
