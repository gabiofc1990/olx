import type { GatewayAdapter, CreatePixResult, CheckPixResult } from "./types.server";
import { normalizeStatus } from "./types.server";

const BASE = "https://api.pushinpay.com.br/api";

function authHeaders(creds: Record<string, string>) {
  const token = creds.token;
  if (!token) throw new Error("PushinPay: token ausente");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as Record<string, string>;
}

export const pushinpayAdapter: GatewayAdapter = {
  async createPix(creds, input): Promise<CreatePixResult> {
    const res = await fetch(`${BASE}/pix/cashIn`, {
      method: "POST",
      headers: authHeaders(creds),
      body: JSON.stringify({
        value: input.amountCents,
        webhook_url: input.postbackUrl,
      }),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`PushinPay [${res.status}]: ${txt}`);
    const j = JSON.parse(txt);
    return {
      transactionId: String(j.id ?? input.externalId),
      qrcode: j.qr_code || j.qrcode || "",
      status: normalizeStatus(j.status),
      raw: j,
    };
  },
  async checkPix(creds, transactionId): Promise<CheckPixResult> {
    const res = await fetch(`${BASE}/transactions/${transactionId}`, {
      headers: authHeaders(creds),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`PushinPay consult [${res.status}]: ${txt}`);
    const j = JSON.parse(txt);
    return { status: normalizeStatus(j.status), raw: j };
  },
};
