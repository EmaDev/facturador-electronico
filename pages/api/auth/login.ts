
import type { NextApiRequest, NextApiResponse } from "next";

const NEST_API_URL = "http://localhost:3000"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { cuit, password } = req.body as { cuit?: string; password?: string };
  if (!cuit || !password) return res.status(400).json({ message: "CUIT y password requeridos" });

  // 1) Mock auth (reemplazá por tu lógica real)
  if (!(cuit === "20123456783" && password === "password123")) {
    return res.status(401).json({ message: "CUIT o contraseña inválidos" });
  }

  // 2) Llamar a Nest para obtener token/sign/expiración del WSAA
  if (!NEST_API_URL) return res.status(500).json({ message: "NEST_API_URL no configurado" });

  try {
    const r = await fetch(`${"http://localhost:3000"}/wsaa/login-from-stored`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit, service: "wsfe" }), // keyPassphrase si aplica
    });

    const wsaa = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        message: "Error WSAA",
        details: wsaa?.message ?? r.statusText,
      });
    }

    // 3) Tu token de app (JWT real en producción)
    const token = `mock-token-${Date.now()}`;

    // 4) Devolver todo al cliente
    return res.status(200).json({
      token,           // token de tu app
      wsaa_token: wsaa.wsaa_token,
      wsaa_sign: wsaa.wsaa_sign,
      expires: wsaa.expires, // ISO
    });
  } catch (e: any) {
    return res.status(500).json({ message: "Fallo al contactar WSAA", details: String(e?.message ?? e) });
  }
}