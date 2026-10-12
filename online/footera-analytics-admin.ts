// Footera V21.133 – private analytics reporting for explicitly approved admin users.
// Do NOT expose metrics from a public, unauthenticated URL.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const origin="https://basti17svh-cloud.github.io";
const headers={
 "Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store",
 "Access-Control-Allow-Origin":origin,
 "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
 "Access-Control-Allow-Methods":"OPTIONS, POST"
};
const reply=(data:Record<string,unknown>,status=200)=>
 new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 if(req.headers.get("origin")!==origin)return reply({error:"Invalid Origin"},403);
 const token=/^Bearer\s+(.+)$/i.exec(req.headers.get("authorization")||"")?.[1];
 if(!token)return reply({error:"Bitte mit dem bestätigten Footera-Konto anmelden."},401);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!service)return reply({error:"Server unavailable"},503);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await admin.auth.getUser(token);
 if(authError||!user||user.is_anonymous||!user.email_confirmed_at)
   return reply({error:"Bestätigtes Footera-Konto erforderlich."},401);
 const {data:allowed,error:permissionError}=await admin.from("footera_analytics_admins")
    .select("user_id").eq("user_id",user.id).maybeSingle();
 if(permissionError)return reply({error:"Berechtigung konnte nicht geprüft werden."},503);
 if(!allowed)return reply({error:"Für dieses Footera-Konto ist kein Statistik-Adminzugriff freigeschaltet."},403);
 const {data,error}=await admin.rpc("footera_analytics_summary");
 if(error){console.error("Footera stats report failed",error.code);return reply({error:"Statistik momentan nicht verfügbar."},503)}
 return reply({report:data});
});
