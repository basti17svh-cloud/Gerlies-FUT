// Footera V21.255 - stores player portraits copied by .github/workflows/player-faces-mirror.yml.
// Only a GitHub Actions run of this repository may write: the caller sends the run's OIDC token
// (audience "footera-faces"), so no Supabase secret has to live in GitHub.
// Deploy with verify_jwt=false (the token is GitHub's, not Supabase's).
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const REPOSITORY = "basti17svh-cloud/gerlies-fut";
const BUCKET = "player-faces";
const MAX_BYTES = 1024 * 1024;
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

async function fromThisRepository(req: Request) {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "")?.[1];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: "footera-faces",
    });
    return String(payload.repository || "").toLowerCase() === REPOSITORY;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (!(await fromThisRepository(req))) return json({ error: "Not allowed" }, 401);
  const storage = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  }).storage.from(BUCKET);
  const url = new URL(req.url);

  // GET ?list=faces&offset=0 -> names already stored, 1000 per page.
  if (req.method === "GET") {
    const prefix = url.searchParams.get("list") || "";
    if (!/^(faces|icons)$/.test(prefix)) return json({ error: "Unknown folder" }, 400);
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const { data, error } = await storage.list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) return json({ error: error.message }, 500);
    return json((data || []).filter((row) => row.id).map((row) => row.name));
  }

  // POST ?name=faces/123.webp with the WebP bytes as body.
  if (req.method === "POST") {
    const name = url.searchParams.get("name") || "";
    if (!/^(faces|icons)\/\d{1,9}\.webp$/.test(name)) return json({ error: "Bad name" }, 400);
    const body = new Uint8Array(await req.arrayBuffer());
    const isWebp = body.length > 12 && String.fromCharCode(...body.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...body.slice(8, 12)) === "WEBP";
    if (!isWebp || body.length > MAX_BYTES) return json({ error: "Only WebP up to 1 MB" }, 400);
    const { error } = await storage.upload(name, body, { contentType: "image/webp", cacheControl: "2592000", upsert: true });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
});
