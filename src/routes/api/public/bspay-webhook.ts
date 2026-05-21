import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/bspay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any = {};
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const transactionId: string | undefined =
          payload?.transactionId ||
          payload?.transaction_id ||
          payload?.data?.transactionId ||
          payload?.requestBody?.transactionId;
        const externalId: string | undefined =
          payload?.external_id || payload?.data?.external_id || payload?.requestBody?.external_id;
        const status: string | undefined = (
          payload?.status ||
          payload?.data?.status ||
          payload?.requestBody?.status ||
          ""
        )
          .toString()
          .toUpperCase();

        if (!transactionId && !externalId) {
          return new Response("missing transactionId", { status: 400 });
        }

        const update: Record<string, unknown> = {
          status: status || "PAID",
          updated_at: new Date().toISOString(),
          raw_response: payload,
        };
        if (status === "PAID" || status === "APPROVED" || status === "CONFIRMED") {
          update.status = "PAID";
          update.paid_at = new Date().toISOString();
        }

        const query = supabaseAdmin.from("pix_payments").update(update as any);
        if (transactionId && externalId) {
          await query.or(`transaction_id.eq.${transactionId},external_id.eq.${externalId}`);
        } else if (transactionId) {
          await query.eq("transaction_id", transactionId);
        } else if (externalId) {
          await query.eq("external_id", externalId);
        }

        return Response.json({ ok: true });
      },
      GET: async () => Response.json({ ok: true }),
    },
  },
});
