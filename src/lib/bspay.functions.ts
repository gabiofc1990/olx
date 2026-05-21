import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getActiveGateway, getGatewayByTransactionProvider } from "@/lib/gateways/registry.server";
import { normalizeStatus, type GatewayProvider } from "@/lib/gateways/types.server";

function getPublicOrigin() {
  const forwardedProto = getRequestHeader("x-forwarded-proto") || "https";
  const forwardedHost = getRequestHeader("x-forwarded-host");
  const origin = getRequestHeader("origin");
  const host = forwardedHost || getRequestHost();
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `${forwardedProto}://${host}`;
  }
  return origin || "https://olx-ofertas.lovable.app";
}

export const createPixCharge = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      amountCents: z.number().int().min(100).max(100_000_00),
      listingId: z.string().uuid().optional(),
      payerName: z.string().min(2).max(120).optional(),
      payerDocument: z.string().min(11).max(14).optional(),
      payerEmail: z.string().email().max(160).optional(),
      description: z.string().max(140).optional(),
    })
  )
  .handler(async ({ data }) => {
    let amountCents = data.amountCents;
    if (data.listingId) {
      const { data: listing, error } = await supabaseAdmin
        .from("listings")
        .select("price_cents")
        .eq("id", data.listingId)
        .eq("published", true)
        .maybeSingle();

      if (error || !listing) {
        throw new Error("Não foi possível confirmar o preço do produto.");
      }

      amountCents = listing.price_cents ?? data.amountCents;
    }

    const gateway = await getActiveGateway();
    const postbackUrl = `${getPublicOrigin()}/api/public/bspay-webhook`;
    const externalId = `olx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await gateway.adapter.createPix(gateway.credentials, {
      amountCents,
      externalId,
      postbackUrl,
      payerName: data.payerName,
      payerDocument: data.payerDocument?.replace(/\D/g, ""),
      payerEmail: data.payerEmail,
      description: data.description,
    });

    await supabaseAdmin.from("pix_payments").insert({
      transaction_id: result.transactionId,
      external_id: externalId,
      listing_id: data.listingId ?? null,
      amount_cents: amountCents,
      status: result.status,
      qrcode: result.qrcode,
      payer_name: data.payerName ?? null,
      payer_document: data.payerDocument?.replace(/\D/g, "") ?? null,
      payer_email: data.payerEmail ?? null,
      raw_response: result.raw as any,
      gateway_provider: gateway.provider,
      gateway_id: gateway.id.startsWith("env-") ? null : gateway.id,
    });

    return {
      transactionId: result.transactionId,
      qrcode: result.qrcode,
      amountCents,
      status: result.status,
    };
  });

export const checkPixStatus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ transactionId: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("pix_payments")
      .select("status,paid_at,amount_cents,external_id,gateway_provider")
      .eq("transaction_id", data.transactionId)
      .maybeSingle();

    const localStatus = normalizeStatus(row?.status);
    if (localStatus === "PAID") {
      return {
        status: localStatus,
        paidAt: row?.paid_at ?? null,
        amountCents: row?.amount_cents ?? 0,
      };
    }

    try {
      // Usa o mesmo gateway que originou a transação (ou o ativo como fallback)
      const provider = (row?.gateway_provider as GatewayProvider | null) ?? null;
      const gateway = provider
        ? (await getGatewayByTransactionProvider(provider)) || (await getActiveGateway())
        : await getActiveGateway();

      const remote = await gateway.adapter.checkPix(gateway.credentials, data.transactionId);
      const remoteStatus = remote.status;

      if (remoteStatus !== localStatus) {
        await supabaseAdmin
          .from("pix_payments")
          .update({
            status: remoteStatus,
            paid_at: remoteStatus === "PAID" ? new Date().toISOString() : row?.paid_at ?? null,
            updated_at: new Date().toISOString(),
            raw_response: remote.raw as any,
          })
          .eq("transaction_id", data.transactionId);
      }
      return {
        status: remoteStatus,
        paidAt: remoteStatus === "PAID" ? new Date().toISOString() : row?.paid_at ?? null,
        amountCents: row?.amount_cents ?? 0,
      };
    } catch {
      return {
        status: localStatus,
        paidAt: row?.paid_at ?? null,
        amountCents: row?.amount_cents ?? 0,
      };
    }
  });
