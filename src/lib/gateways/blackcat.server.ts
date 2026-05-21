import type { GatewayAdapter, CreatePixResult, CheckPixResult } from "./types.server";
import { normalizeStatus } from "./types.server";

const BASE = "https://api.blackcatpagamentos.com/v1";

function authHeader(creds: Record<string, string>) {
  const sk = creds.secret_key;
  if (!sk) throw new Error("BlackCat: secret_key ausente");
  const auth = Buffer.from(`${sk}:x`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as Record<string, string>;
}

export const blackcatAdapter: GatewayAdapter = {
  async createPix(creds, input): Promise<CreatePixResult> {
    const body = {
      amount: input.amountCents,
      paymentMethod: "pix",
      pix: { expiresInDays: 1 },
      items: [
        {
          title: input.description || "Compra OLX",
          unitPrice: input.amountCents,
          quantity: 1,
          tangible: false,
        },
      ],
      customer: {
        name: input.payerName || "Cliente OLX",
        email: input.payerEmail || "cliente@olx.com.br",
        document: {
          type: "cpf",
          number: (input.payerDocument || "12345678909").replace(/\D/g, ""),
        },
      },
      postbackUrl: input.postbackUrl,
      metadata: input.externalId,
    };
    const res = await fetch(`${BASE}/transactions`, {
      method: "POST",
      headers: authHeader(creds),
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (!res.ok) {
      const msg = (() => { try { return JSON.parse(txt)?.message; } catch { return null; } })();
      throw new Error(msg || `BlackCat [${res.status}]: ${txt}`);
    }
    const j = JSON.parse(txt);
    const qrcode =
      j.pix?.qrcode || j.pix?.qrCode || j.pix?.payload || j.pixQrCode || "";
    return {
      transactionId: String(j.id ?? j.transactionId ?? input.externalId),
      qrcode,
      status: normalizeStatus(j.status),
      raw: j,
    };
  },
  async checkPix(creds, transactionId): Promise<CheckPixResult> {
    const res = await fetch(`${BASE}/transactions/${transactionId}`, {
      headers: authHeader(creds),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`BlackCat consult [${res.status}]: ${txt}`);
    const j = JSON.parse(txt);
    return { status: normalizeStatus(j.status), raw: j };
  },
};
