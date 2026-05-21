import type { GatewayAdapter, CreatePixResult, CheckPixResult } from "./types.server";
import { normalizeStatus } from "./types.server";

const BASE = "https://api.pixupbr.com/v2";

async function getToken(creds: Record<string, string>) {
  const id = creds.client_id;
  const secret = creds.client_secret;
  if (!id || !secret) throw new Error("PixUp: client_id/client_secret ausentes");
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`PixUp auth [${res.status}]: ${txt}`);
  const j = JSON.parse(txt);
  const t = j.access_token || j.accessToken || j.token;
  if (!t) throw new Error(`PixUp token ausente: ${txt}`);
  return t as string;
}

export const pixupAdapter: GatewayAdapter = {
  async createPix(creds, input): Promise<CreatePixResult> {
    const token = await getToken(creds);
    const body: Record<string, unknown> = {
      amount: Number((input.amountCents / 100).toFixed(2)),
      external_id: input.externalId,
      postbackUrl: input.postbackUrl,
      payer: {
        name: input.payerName || "Cliente OLX",
        document: (input.payerDocument || "12345678909").replace(/\D/g, ""),
        email: input.payerEmail || "cliente@olx.com.br",
      },
    };
    if (input.description) body.payerQuestion = input.description;
    const res = await fetch(`${BASE}/pix/qrcode`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (!res.ok) {
      const msg = (() => { try { return JSON.parse(txt)?.message; } catch { return null; } })();
      throw new Error(msg || `PixUp QR [${res.status}]: ${txt}`);
    }
    const j = JSON.parse(txt);
    return {
      transactionId: j.transactionId || j.transaction_id || input.externalId,
      qrcode: j.qrcode || j.payload || j.brCode || "",
      status: normalizeStatus(j.status),
      raw: j,
    };
  },
  async checkPix(creds, transactionId): Promise<CheckPixResult> {
    const token = await getToken(creds);
    const res = await fetch(`${BASE}/pix/consult-transaction`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId }),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`PixUp consult [${res.status}]: ${txt}`);
    const j = JSON.parse(txt) as any;
    const status = normalizeStatus(j.status || j.data?.status);
    return { status, raw: j };
  },
};
