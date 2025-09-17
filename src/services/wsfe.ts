export type FeAuth = { wsaa_token: string; wsaa_sign: string; cuit: string };

const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL || "http://localhost:3000";

export async function feCompUltimoAutorizado(ptoVta: number, cbteTipo: number, auth: FeAuth) {
  const r = await fetch(NEST_API_URL + "/fev1/ultimo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ptoVta, cbteTipo, auth }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || "feCompUltimoAutorizado failed");
  return data;
}

export async function fecaesolicitar(body: any) {
  const r = await fetch(NEST_API_URL + "/fev1/fecaesolicitar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || "FECAESolicitar failed");
  return data;
}