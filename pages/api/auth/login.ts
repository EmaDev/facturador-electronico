import type { NextApiRequest, NextApiResponse } from "next";

const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL || "http://localhost:3000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { cuit, password } = req.body as { cuit?: string; password?: string };
  if (!cuit || !password) return res.status(400).json({ message: "CUIT y password requeridos" });

  // 🔐 Mock auth (reemplazá por tu lógica real)
  if (!(cuit === "20251154261" && password === "clave123")) {
  //if (!(cuit === "20219641215" && password === "clave123")) {
    return res.status(401).json({ message: "CUIT o contraseña inválidos" });
  }

  try {
    // 1) WSAA (usa el endpoint que ya tienes en Nest)
    const wsaaResp = await fetch(`${NEST_API_URL}/wsaa/login-from-stored`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit, service: "wsfe" }),
    });

    const wsaa = await wsaaResp.json().catch(() => ({}));
    if (!wsaaResp.ok) {
      return res.status(wsaaResp.status).json({
        message: "Error WSAA",
        details: wsaa?.message ?? wsaaResp.statusText,
      });
    }

    // 2) Traer cuenta desde Nest (sin auth por ahora, como pediste)
    //    Ajusta la ruta si tu controlador expone otro path (p. ej. /accounts/get/:cuit)
    let account: any = null;
    try {
      const accResp = await fetch(`${NEST_API_URL}/accounts/${cuit}`);
      if (accResp.ok) {
        account = await accResp.json();
      } else {
        // si 404 u otro error, seguimos logueando pero account = null
        account = null;
      }
    } catch {
      account = null;
    }

    // 3) Token de app (mock)
    const token = `mock-token-${Date.now()}`;

    // 4) Respuesta unificada al cliente
    return res.status(200).json({
      token,
      cuitEmisor: cuit,
      wsaa_token: wsaa.wsaa_token,
      wsaa_sign: wsaa.wsaa_sign,
      expires: wsaa.expires, // ISO
      account, // 👈 devolvemos la cuenta aquí
    });
  } catch (e: any) {
    return res.status(500).json({ message: "Fallo al contactar WSAA", details: String(e?.message ?? e) });
  }
}
