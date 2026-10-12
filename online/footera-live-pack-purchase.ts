// Footera V21.140: SERVER-ONLY exact pack draw + atomic LIVE purchase.
// Never activate while public game inventory and signed payment E2E tests remain incomplete.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { FooteraPackOdds } from "./footera-live-pack-odds.mjs";

const ORIGIN = "https://basti17svh-cloud.github.io";
const approvedKeys = new Set(["pack:silver","pack:gold"]);
const VERSION = "fc27-20261007-530525ed";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

// Memory-only immutable compact roster cache; refresh on module cold start,
// not from any supplied browser data. A pinned catalogue version is mandatory.
let cached: {version: string; players: {id: string;ovr: number}[];
  icons: {id: string;ovr: number}[]; at: number} | null = null;
let pending: Promise<NonNullable<typeof cached>> | null = null;
function createRng(): () => number {
  const buffer = new Uint32Array(1024);
  let index = buffer.length;
  return () => {
    if (index >= buffer.length) {
      crypto.getRandomValues(buffer);
      index = 0;
    }
    return (buffer[index++] + 0.5) / 4294967296;
  };
}
async function roster(admin: ReturnType<typeof createClient>, version: string) {
  if (cached?.version === version && Date.now() - cached.at < 15 * 60_000)
    return cached;
  if (pending) return pending;
  pending = (async () => {
    const players: {id:string;ovr:number}[] = [];
    const icons: {id:string;ovr:number}[] = [];
    let offset = 0;
    while (offset < 30000) {
      const { data, error } = await admin.from("footera_live_draw_pool")
        .select("player_id,base_rating,is_icon")
        .eq("catalog_version",version)
        .order("player_id",{ascending:true}).range(offset,offset+999);
      if (error) throw Error("Approved player catalogue inaccessible");
      const batch = data || [];
      for (const row of batch) {
        const id = String(row.player_id||""), ovr = Number(row.base_rating);
        if (!id || !Number.isInteger(ovr) || ovr < 40 || ovr > 99)
          throw Error("Invalid approved roster player");
        (row.is_icon === true ? icons : players).push({id,ovr});
      }
      offset += batch.length;
      if (batch.length < 1000) break;
    }
    if (offset >= 30000 || players.length !== 18524 || icons.length !== 136)
      throw Error("Pinned FC27 player and Icon catalog incomplete");
    cached = {version,players,icons,at:Date.now()};
    return cached;
  })();
  try { return await pending; } finally { pending = null; }
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
  if(req.method!=="POST") return reply({error:"Method not allowed"},405);
  if(req.headers.get("origin")!==ORIGIN) return reply({error:"Origin not allowed"},403);
  if(Deno.env.get("FOOTERA_LIVE_PAYMENTS_ENABLED")!=="true" ||
     Deno.env.get("FOOTERA_LIVE_SPENDING_ENABLED")!=="true" ||
     Deno.env.get("FOOTERA_LIVE_DELIVERY_ENABLED")!=="true" ||
     Deno.env.get("FOOTERA_LIVE_PACKS_ENABLED")!=="true")
    return reply({error:"Echtgeld-Packs sind noch nicht freigegeben."},503);
  const token=/^Bearer\s+(.+)$/i.exec(req.headers.get("authorization")||"")?.[1];
  if(!token) return reply({error:"Verifiziertes Footera-Konto erforderlich."},401);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key) return reply({error:"Service unavailable"},503);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user||user.is_anonymous||!user.email||!user.email_confirmed_at)
    return reply({error:"E-Mail-Konto nicht bestätigt."},401);
  let itemKey:string,requestId:string;
  try{
    const body=await req.json();
    if(!body || typeof body.item_key!=="string" ||
       typeof body.request_id!=="string") throw Error("invalid");
    itemKey=body.item_key;requestId=body.request_id;
  }catch{return reply({error:"Invalid request"},400)}
  if(!approvedKeys.has(itemKey)||!UUID.test(requestId))
    return reply({error:"Ungültiges Pack oder Kauf-ID"},400);
  try{
    // A retry after an ambiguous network failure must return the original
    // server receipt even when the pack rotates or the balance changed.
    const { data:previous, error:previousError }=await admin
      .from("footera_live_point_spends")
      .select("id,user_id,item_key,points_cost")
      .eq("id",requestId).maybeSingle();
    if(previousError) throw Error("Cannot verify previous purchase");
    if(previous){
      if(previous.user_id!==user.id||previous.item_key!==itemKey)
        return reply({error:"Kauf-ID gehört zu einem anderen Artikel oder Konto."},409);
      const {data:receipt,error:receiptError}=await admin
        .from("footera_live_entitlements")
        .select("delivery_status").eq("spend_id",requestId).maybeSingle();
      const {data:wallet,error:walletError}=await admin
        .from("footera_live_points_wallets")
        .select("balance_points").eq("user_id",user.id).maybeSingle();
      if(receiptError||walletError||!receipt||receipt.delivery_status!=="delivered")
        return reply({error:"Lieferung ist noch nicht abgeschlossen."},409);
      return reply({status:"already_processed",request_id:requestId,
        item_key:itemKey,points_cost:previous.points_cost,
        balance:wallet?.balance_points??0,delivery_status:"delivered"});
    }
    // Never trust price/spec/player IDs from the browser.
    const [{data:spec,error:specErr},{data:store,error:storeErr}] = await Promise.all([
      admin.from("footera_live_pack_specs").select("*")
        .eq("item_key",itemKey).maybeSingle(),
      admin.from("footera_live_store_items")
        .select("item_key,item_type,points_cost,enabled,fulfillment_ready")
        .eq("item_key",itemKey).maybeSingle(),
    ]);
    if(specErr||storeErr||!spec||!store||!spec.enabled||
       !store.enabled||!store.fulfillment_ready ||
       store.item_type!=="pack"||store.points_cost!==spec.points_cost ||
       spec.catalog_version!==VERSION||spec.draw_engine!=="exact-weighted-subset-v1"||
       Number(spec.rare_count)!==0||spec.extra_slots)
      return reply({error:"Pack ist für sichere Echtgeld-Ziehungen noch nicht bereit."},409);
    const {data:wallet,error:walletError}=await admin
      .from("footera_live_points_wallets").select("balance_points")
      .eq("user_id",user.id).maybeSingle();
    if(walletError || !wallet || Number(wallet.balance_points)<Number(store.points_cost))
      return reply({error:"Nicht genügend verifizierte LIVE Points."},409);
    const r=await roster(admin,VERSION);
    const pack={
      count:Number(spec.player_count),
      composition:spec.composition,
      guarantee:Number(spec.guaranteed_rating),
      iconChance:Number(spec.icon_probability),
      rareCount:Number(spec.rare_count),
    };
    const result=FooteraPackOdds.draw(pack,r.players,{
      icons:r.icons,
      random:createRng(),
    });
    if(!result.available || result.items.length!==pack.count)
      return reply({error:"Packziehung derzeit nicht sicher möglich."},503);
    const ids=result.items.map((x:{base:{id:string}})=>x.base.id);
    const {data,error}=await admin.rpc("footera_purchase_verified_live_pack",{
      p_request_id:requestId,p_user_id:user.id,p_item_key:itemKey,
      p_spec_version:spec.spec_version,p_player_ids:ids,
    });
    if(error){
      if(error.message.includes("Insufficient verified live Footera Points"))
        return reply({error:"Nicht genügend LIVE Points."},409);
      console.error("Footera LIVE pack purchase rejected",error.code,error.message);
      return reply({error:"Kauf konnte nicht bestätigt werden."},409);
    }
    if(!data || data.request_id!==requestId || data.item_key!==itemKey ||
       !["spent","already_processed"].includes(data.status) ||
       data.delivery_status!=="delivered")
      return reply({error:"Kaufbestätigung konnte nicht verifiziert werden."},502);
    return reply(data);
  }catch(error){
    console.error("Footera LIVE pack runtime",String(error));
    return reply({error:"Packserver ist vorübergehend nicht verfügbar."},503);
  }
});
