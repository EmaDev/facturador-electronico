import type { NextApiRequest, NextApiResponse } from "next";

const BASE_URL = "http://localhost:3000";
const PREFIX = "/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });
  if (!BASE_URL) return res.status(500).json({ message: "NEST_API_URL no configurado" });

  try {
    const url = `${BASE_URL}${PREFIX}/fev1/fecaesolicitar`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ message: "FECAESolicitar error", details: data });

    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ message: "Proxy FECAESolicitar failed", details: String(e?.message ?? e) });
  }
}