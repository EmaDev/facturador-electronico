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


export async function createLog(resp: any, body: any) {
  const errors = resp?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.Errors?.Err;
  const det = pickFirstDet(resp); // Función auxiliar para obtener el primer detalle
  const cae = det?.CAE ?? "";


  // --- Validación ajustada ---
  // 1. Primero, verifica si AFIP reportó errores explícitos.
  if (errors) {
    const list = Array.isArray(errors) ? errors : [errors];

    for (const err of list) {
      await fetch(`${NEST_API_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "FECAESolicitar",
          message: err.Msg || "Error desconocido de AFIP",
          errorCode: err.Code || null,
          cuit: body.auth.cuit,
          cbteTipo: body.data.CbteTipo,
          ptoVta: body.data.PtoVta,
          raw: resp,
        }),
      });
    }

    throw {
      message: list[0].Msg || "Error desconocido reportado por ARCA.",
      code: list[0].Code || null,
    };
  }

  // 2. Si no hay errores, verifica si el CAE está vacío (rechazo implícito).
  if (cae === "") {
    // Extrae el mensaje de las observaciones si existe.
    const obsMsg = det?.Observaciones?.Obs?.Msg || "La solicitud fue rechazada por ARCA pero no se informó un código de error específico.";

    // Genera el log con el mensaje de las observaciones.
    await fetch(`${NEST_API_URL}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "FECAESolicitar",
        message: `Rechazo sin bloque de Error: ${obsMsg}`,
        errorCode: det?.Observaciones?.Obs?.Code || 'RECHAZO_SIN_ERROR',
        cuit: body.auth.cuit,
        cbteTipo: body.data.CbteTipo,
        ptoVta: body.data.PtoVta,
        raw: resp,
      }),
    });

    throw {
      message: obsMsg || "La solicitud fue rechazada por ARCA (CAE no recibido).",
      code: 'RECHAZO_IMPLICITO',
    };
  }

}


/**
 * Función auxiliar para obtener el primer objeto de detalle de la respuesta.
 * La respuesta de AFIP puede devolver un objeto o un array de objetos.
 * @param {any} resp La respuesta completa de FECAESolicitar.
 * @returns {any} El primer objeto de detalle encontrado.
 */
function pickFirstDet(resp: any) {
  const detResp = resp?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.FeDetResp;
  if (!detResp) return {};

  if (Array.isArray(detResp.FECAEDetResponse)) {
    return detResp.FECAEDetResponse[0] ?? {};
  }
  return detResp.FECAEDetResponse ?? {};
}

export const fetchLogs = async (cuit: string, ptoVta: number) => {
  const r = await fetch(`${NEST_API_URL}/logs?cuit=${cuit}&ptoVta=${ptoVta}&limit=20`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || "Error al obtener logs");
  return data.logs;
};

export const getLogById = async (id: string) => {
  const res = await fetch(`${NEST_API_URL}/logs/${id}`);
  if (!res.ok) throw new Error("No se pudo obtener el log");
  const data = await res.json();
  return data.log;
};

export async function fetchLibroIvaVentas(cuit: string, year: number, month: number) {
  const res = await fetch(`${NEST_API_URL}/libro-iva/ventas?cuit=${cuit}&year=${year}&month=${month}`);
  if (!res.ok) throw new Error("No se pudo obtener el libro IVA ventas");
  return res.json();
}