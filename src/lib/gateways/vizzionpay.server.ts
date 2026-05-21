import type { GatewayAdapter, CreatePixInput, CreatePixResult, CheckPixResult } from "./types.server";
import { normalizeStatus } from "./types.server";

const BASE = "https://app.vizzionpay.com.br/api/v1";

function authHeaders(creds: Record<string, string>) {
  const pub = creds.public_key;
  const secret = creds.secret_key;
  if (!pub || !secret) throw new Error("VizzionPay: public_key/secret_key ausentes");
  return {
    "x-public-key": pub,
    "x-secret-key": secret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export const vizzionpayAdapter: GatewayAdapter = {
  async createPix(creds, input): Promise<CreatePixResult> {
    const amountBRL = Number((input.amountCents / 100).toFixed(2));
    const body = {
      identifier: input.externalId,
      amount: amountBRL,
      client: {
        name: input.payerName || "Cliente",
        email: input.payerEmail || "cliente@email.com",
        phone: "(11) 99999-9999",
        document: (input.payerDocument || "00000000000").replace(/\D/g, ""),
      },
      products: [
        {
          id: input.externalId,
          name: (input.description || "Produto").slice(0, 100),
          quantity: 1,
          price: amountBRL,
        },
      ],
      ...(input.postbackUrl ? { callbackUrl: input.postbackUrl } : {}),
    };

    const res = await fetch(`${BASE}/gateway/pix/receive`, {
      method: "POST",
      headers: authHeaders(creds),
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (!res.ok) {
      const msg = (() => { try { return JSON.parse(txt)?.message; } catch { return null; } })();
      throw new Error(msg || `VizzionPay criar Pix [${res.status}]: ${txt}`);
    }
    const j = JSON.parse(txt);
    return {
      transactionId: j.transactionId || input.externalId,
      qrcode: j.pix?.code || "",
      status: normalizeStatus(j.status === "OK" ? "PENDING" : j.status),
      raw: j,
    };
  },

  async checkPix(creds, transactionId): Promise<CheckPixResult> {
    const res = await fetch(
      `${BASE}/gateway/transactions?id=${encodeURIComponent(transactionId)}`,
      { headers: authHeaders(creds) },
    );
    const txt = await res.text();
    if (!res.ok) throw new Error(`VizzionPay consulta [${res.status}]: ${txt}`);
    const j = JSON.parse(txt) as any;
    const status = normalizeStatus(j.status);
    return { status, raw: j };
  },
};
