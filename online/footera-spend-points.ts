// Footera V21.125 - signed-in sandbox-only Points pack spending.
// No browser-supplied price, user ID, balance or paid entitlement is trusted.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const prices: Record<string, number> = Object.freeze({
  silver: 50, gold: 150, goldplayers: 350, mixed6: 200, primegold: 500,
  electrum: 350, raremixed: 300, ultimate: 2500, "jumbo-rare": 2000,
  "rare-mixed": 300, mega: 1000, "83x15": 3000, "84x10": 4000,
});
const allowedOrigin = "https://basti17svh-cloud.github.io";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
function reply(data: Record<string, unknown>, status=200) {
  return new Response(JSON.stringify(data), { status, headers });
}
Deno.serve(async (req: Request) => {
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers});
  if (req.method!=="POST") return reply({error:"Method not allowed"},405);
  const origin=req.headers.get("origin");
  if (origin && origin!==allowedOrigin) return reply({error:"Origin not allowed"},403);
  // Separate Sandbox spending from LIVE. This is off by default for backwards compatibility.
  if (Deno.env.get("FOOTERA_SANDBOX_PURCHASES_ENABLED") === "false")
    return reply({error:"Sandbox-Points können im Echtgeldbetrieb nicht ausgegeben werden."},503);
  const auth=/^Bearer\s+(.+)$/i.exec(req.headers.get("authorization")||"")?.[1];
  if (!auth) return reply({error:"Sign in required"},401);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const adminKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if (!url||!adminKey) return reply({error:"Server not configured"},503);
  const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(auth);
  if(userError||!user||user.is_anonymous||!user.email||!user.email_confirmed_at)
    return reply({error:"Verified Footera email account required"},401);
  let input: unknown;
  try{input=await req.json()}catch{return reply({error:"Invalid request"},400)}
  if(!input||typeof input!=="object")return reply({error:"Invalid request"},400);
  const obj=input as Record<string,unknown>;
  const id=obj.pack_id,requestId=obj.request_id;
  if(typeof id!=="string"||!(id in prices)||typeof requestId!=="string"||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
    return reply({error:"Unknown pack or invalid purchase identifier"},400);
  try{
    const {data,error}=await admin.rpc("footera_spend_verified_sandbox_points",{
      p_request_id:requestId,p_user_id:user.id,p_pack_id:id,
    });
    if(error){
      if(/Insufficient paid Footera Points/.test(error.message))return reply({error:"Nicht genügend gekaufte Footera Points."},409);
      console.error("Footera paid-points spend",error.code,error.message);
      return reply({error:"Pointskauf derzeit nicht möglich; Guthaben prüfen."},500);
    }
    if(!data||data.pack_id!==id||data.cost!==prices[id]||
       !["spent","already_processed"].includes(data.status))
      return reply({error:"Unexpected spending result"},502);
    return reply({status:data.status,request_id:requestId,pack_id:id,points_cost:prices[id],balance:data.balance});
  }catch(e){
    console.error("Footera spend endpoint error",String(e));
    return reply({error:"Server temporarily unavailable"},503);
  }
});
