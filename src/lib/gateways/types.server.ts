// Server-only — interfaces compartilhadas pelos adapters de gateway.

export type GatewayProvider = "bspay" | "pushinpay" | "pixup" | "blackcat";

export type CreatePixInput = {
  amountCents: number;
  externalId: string;
  postbackUrl: string;
  payerName?: string;
  payerDocument?: string;
  payerEmail?: string;
  description?: string;
};

export type CreatePixResult = {
  transactionId: string;
  qrcode: string;
  status: string; // PAID | PENDING | etc (já normalizado)
  raw: unknown;
};

export type CheckPixResult = {
  status: string; // normalizado
  raw: unknown;
};

export interface GatewayAdapter {
  createPix(creds: Record<string, string>, input: CreatePixInput): Promise<CreatePixResult>;
  checkPix(creds: Record<string, string>, transactionId: string): Promise<CheckPixResult>;
}

export function normalizeStatus(status?: string | null): string {
  const s = (status ?? "PENDING").toString().toUpperCase();
  if (["PAID", "APPROVED", "CONFIRMED", "COMPLETED", "RECEIVED", "RECEIVED_IN_CASH"].includes(s)) {
    return "PAID";
  }
  return s;
}
