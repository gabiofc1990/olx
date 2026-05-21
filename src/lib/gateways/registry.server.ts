import type { GatewayAdapter, GatewayProvider } from "./types.server";
import { bspayAdapter } from "./bspay.server";
import { pushinpayAdapter } from "./pushinpay.server";
import { pixupAdapter } from "./pixup.server";
import { blackcatAdapter } from "./blackcat.server";
import { vizzionpayAdapter } from "./vizzionpay.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADAPTERS: Record<GatewayProvider, GatewayAdapter> = {
  bspay: bspayAdapter,
  pushinpay: pushinpayAdapter,
  pixup: pixupAdapter,
  blackcat: blackcatAdapter,
  vizzionpay: vizzionpayAdapter,
};

export type ResolvedGateway = {
  id: string;
  provider: GatewayProvider;
  name: string;
  credentials: Record<string, string>;
  adapter: GatewayAdapter;
};

export async function getActiveGateway(): Promise<ResolvedGateway> {
  const { data, error } = await supabaseAdmin
    .from("payment_gateways")
    .select("id,name,provider,credentials,enabled,is_active")
    .eq("is_active", true)
    .eq("enabled", true)
    .maybeSingle();

  if (error) throw new Error(`Erro ao carregar gateway ativo: ${error.message}`);

  // Fallback: BSPay via env vars (mantém retrocompatibilidade)
  if (!data) {
    const id = process.env.BSPAY_CLIENT_ID;
    const secret = process.env.BSPAY_CLIENT_SECRET;
    if (id && secret) {
      return {
        id: "env-bspay",
        provider: "bspay",
        name: "BSPay (env)",
        credentials: { client_id: id, client_secret: secret },
        adapter: ADAPTERS.bspay,
      };
    }
    throw new Error("Nenhum gateway de pagamento ativo. Configure no painel admin.");
  }

  const provider = data.provider as GatewayProvider;
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Provider não suportado: ${data.provider}`);

  let creds = (data.credentials || {}) as Record<string, string>;
  // Fallback de credenciais do BSPay para env
  if (provider === "bspay" && (!creds.client_id || !creds.client_secret)) {
    const id = process.env.BSPAY_CLIENT_ID;
    const secret = process.env.BSPAY_CLIENT_SECRET;
    if (id && secret) creds = { client_id: id, client_secret: secret };
  }

  return { id: data.id, provider, name: data.name, credentials: creds, adapter };
}

export async function getGatewayByTransactionProvider(provider: GatewayProvider): Promise<ResolvedGateway | null> {
  const { data } = await supabaseAdmin
    .from("payment_gateways")
    .select("id,name,provider,credentials")
    .eq("provider", provider)
    .eq("enabled", true)
    .order("is_active", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const adapter = ADAPTERS[provider];
  if (!adapter) return null;
  return {
    id: data.id,
    provider,
    name: data.name,
    credentials: (data.credentials || {}) as Record<string, string>,
    adapter,
  };
}
