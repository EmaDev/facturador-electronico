export type IvaCondition =
  | "Responsable Inscripto"
  | "Monotributista"
  | "Exento"
  | "Consumidor Final";

export type PuntoVenta = {
  id: number;            // nro PV AFIP
  fantasia: string;
  domicilio?: string;
  telefono?: string;
  logoUrl?:string;
};

export type Account = {
  cuit: string;
  ivaCondition: IvaCondition;
  razonSocial?: string;
  email?: string;
  domicilio?: string;
  telefono?: string;
  companyname: string;
  inicioActividades?: string; // AAAA-MM-DD
  puntosVenta?: PuntoVenta[];
  // flags del backend (no guardes material sensible del cert)
  hasWsaa?: boolean;
  createdAt?: string;
  updatedAt?: string;
  iibb: string
  startactivity: string
};

export type WsaaSession = {
  wsaa_token: string;
  wsaa_sign: string;
  wsaa_expires: string; // ISO
};

export type AuthSession = {
  token: string;       // token de tu app
  cuitEmisor: string;
} & WsaaSession;
