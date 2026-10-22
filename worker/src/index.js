import { AccessToken } from "livekit-server-sdk";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    const requestOrigin = request.headers.get("Origin") || "";
    if (!allowed.includes(requestOrigin)) {
      return new Response("Origem não permitida", { status: 403 });
    }
    const origin = requestOrigin;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json({ error: "Método não permitido" }, 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON inválido" }, 400, origin);
    }

    const roomId = String(body.roomId ?? "");
    const identity = String(body.identity ?? "").trim().slice(0, 64);
    const name = String(body.name ?? "").trim().slice(0, 32);

    if (!/^\d{1,12}$/.test(roomId) || !identity || !name) {
      return json({ error: "Dados inválidos" }, 400, origin);
    }

    const at = new AccessToken(env.LK_KEY, env.LK_SECRET, {
      identity,
      name,
      ttl: "1h",
    });
    at.addGrant({
      roomJoin: true,
      room: `sala-${roomId}`,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    return json({ token: await at.toJwt() }, 200, origin);
  },
};