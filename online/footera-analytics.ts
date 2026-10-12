// Footera V21.133 — opt-in, first-party, pseudonymous visits.
// Public entry for consenting visitors. No IP, user agent, page URL or email stored.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const origin = "https://basti17svh-cloud.github.io";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Cache-Control": "no-store",
};
const respond = (v: Record<string,unknown>, status=200) => new Response(
  JSON.stringify(v), {status, headers});
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sourceList = new Set(["instagram","facebook","tiktok","google","direct","other"]);
function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return respond({error:"Method not allowed"},405);
  if(req.headers.get("origin")!==origin)return respond({error:"Origin not permitted"},403);
  if(Number(req.headers.get("content-length")||"0")>2048)return respond({error:"Oversized event"},413);
  const agent=req.headers.get("user-agent")||"";
  if(/bot|crawler|spider|prerender|headless|lighthouse/i.test(agent))
    return respond({ok:true,ignored:true});
  let data: Record<string,unknown>;
  try{data=await req.json()}catch{return respond({error:"Invalid request"},400)}
  if(!data||typeof data!=="object")return respond({error:"Invalid request"},400);
  if(data.consent!==true||typeof data.visitor_id!=="string"||!validUuid.test(data.visitor_id))
    return respond({error:"Analytics requires prior visitor consent"},400);
  const action=data.action;
  if(action!=="visit"&&action!=="forget")return respond({error:"Unknown action"},400);
  if(action==="visit"&&(!sourceList.has(data.source)||typeof data.source!=="string"))
    return respond({error:"Invalid traffic source"},400);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)return respond({error:"Service unavailable"},503);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  let verifiedUserId: string|null=null;
  const auth=/^Bearer\s+(.+)$/i.exec(req.headers.get("authorization")||"");
  if(auth){
    const {data:{user},error}=await admin.auth.getUser(auth[1]);
    if(!error&&user&&!user.is_anonymous&&user.email_confirmed_at)verifiedUserId=user.id;
  }
  const hash=toHex(await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(data.visitor_id.toLowerCase())));
  const method=action==="visit"?"footera_analytics_log_consent_visit":"footera_analytics_forget_visitor";
  const params=action==="visit"
    ? {p_visitor_hash:hash,p_source:data.source,p_verified_user_id:verifiedUserId}
    : {p_visitor_hash:hash,p_verified_user_id:verifiedUserId};
  try{
    const {error}=await admin.rpc(method,params);
    if(error){console.error("Footera analytics write failed",error.code);return respond({error:"Unavailable"},503)}
    return respond({ok:true});
  }catch(e){
    console.error("Footera analytics runtime",String(e));
    return respond({error:"Temporary error"},503);
  }
});
