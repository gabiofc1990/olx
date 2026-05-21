import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/vizzionpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any = {};
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const tx = payload?.transaction;
        const transactionId: string | undefined = tx?.id;
        const externalId: string | undefined = tx?.identifier;
        const rawStatus: string = (tx?.status || "").toString().toUpperCase();

        if (!transactionId && !externalId) {
          return new Response("missing transaction id", { status: 400 });
        }

        // Map VizzionPay statuses to our internal statuses
        let status = rawStatus;
        if (rawStatus === "COMPLETED") status = "PAID";
        if (rawStatus === "CHARGED_BACK") status = "CHARGED_BACK";

        const update: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
          raw_response: payload,
        };
        if (status === "PAID") {
          update.paid_at = tx?.payedAt || new Date().toISOString();
        }

        const query = supabaseAdmin.from("pix_payments").update(update as any);
        if (transactionId && externalId) {
          await query.or(`transaction_id.eq.${transactionId},external_id.eq.${externalId}`);
        } else if (transactionId) {
          await query.eq("transaction_id", transactionId);
        } else {
          await query.eq("external_id", externalId);
        }

        return Response.json({ ok: true });
      },
      GET: async () => Response.json({ ok: true }),
    },
  },
});
