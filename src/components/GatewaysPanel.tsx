import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listGateways,
  upsertGateway,
  activateGateway,
  deleteGateway,
} from "@/lib/gateways-admin.functions";
import {
  CreditCard, Check, Pencil, Trash2, Plus, Power, ExternalLink, AlertCircle, Loader2,
} from "lucide-react";

type Provider = "bspay" | "pushinpay" | "pixup" | "blackcat" | "vizzionpay";

type Gateway = {
  id: string;
  name: string;
  provider: Provider;
  credentials: Record<string, string>;
  enabled: boolean;
  is_active: boolean;
  notes: string | null;
};

const PROVIDER_META: Record<Provider, { label: string; fields: { key: string; label: string; type?: "text" | "password" | "select"; options?: string[]; help?: string }[]; docs: string }> = {
  bspay: {
    label: "BSPay",
    fields: [
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    docs: "https://docs.bspay.co/",
  },
  pixup: {
    label: "PixUp",
    fields: [
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    docs: "https://pixupbr.readme.io/",
  },
  pushinpay: {
    label: "PushinPay",
    fields: [{ key: "token", label: "Token (Bearer)", type: "password" }],
    docs: "https://pushinpay.com.br/docs",
  },
  blackcat: {
    label: "BlackCat",
    fields: [{ key: "secret_key", label: "Secret Key", type: "password" }],
    docs: "https://docs.blackcatpagamentos.com/",
  },
  vizzionpay: {
    label: "VizzionPay",
    fields: [
      { key: "public_key", label: "Chave Pública (x-public-key)" },
      { key: "secret_key", label: "Chave Secreta (x-secret-key)", type: "password" },
    ],
    docs: "https://app.vizzionpay.com.br/docs",
  },
};

export function GatewaysPanel() {
  const list = useServerFn(listGateways);
  const upsert = useServerFn(upsertGateway);
  const activate = useServerFn(activateGateway);
  const remove = useServerFn(deleteGateway);

  const [items, setItems] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Gateway | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const r: any = await list();
      const arr: Gateway[] = Array.isArray(r)
        ? r
        : Array.isArray(r?.data)
        ? r.data
        : Array.isArray(r?.result)
        ? r.result
        : [];
      setItems(arr);
    } catch (e: any) {
      console.error("[gateways] erro ao carregar", e);
      setItems([]);
      setErr(e?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const onActivate = async (id: string) => {
    setBusy(id);
    try { await activate({ data: { id } }); await reload(); }
    catch (e: any) { setErr(e?.message || "Erro"); }
    finally { setBusy(null); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Excluir este gateway?")) return;
    setBusy(id);
    try { await remove({ data: { id } }); await reload(); }
    catch (e: any) { setErr(e?.message || "Erro"); }
    finally { setBusy(null); }
  };

  const active = items.find((g) => g.is_active);

  return (
    <div className="space-y-4">
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span className="flex-1">{err}</span>
          <button onClick={() => setErr(null)} className="text-red-300/70 hover:text-red-300">×</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-1">
          <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          <div className="text-sm">
            <p className="text-slate-400 text-xs">Gateway ativo agora</p>
            <p className="text-white font-semibold">
              {active ? `${active.name} · ${PROVIDER_META[active.provider]?.label}` : "Nenhum"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowNew(true); }}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> Novo gateway
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((g) => {
            const meta = PROVIDER_META[g.provider];
            const filled = meta?.fields.every((f) => g.credentials[f.key]) ?? false;
            return (
              <div
                key={g.id}
                className={`bg-slate-900 border rounded-xl p-4 transition ${
                  g.is_active ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5" : "border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      g.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"
                    }`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-white font-semibold flex items-center gap-2">
                        {g.name}
                        {g.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase tracking-wider font-bold">Ativo</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{meta?.label || g.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(g); setShowNew(false); }}
                      className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white"
                      title="Editar credenciais"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(g.id)}
                      disabled={busy === g.id}
                      className="p-2 hover:bg-red-500/10 rounded-md text-slate-400 hover:text-red-400 disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400 mb-3 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filled ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {filled ? "Credenciais configuradas" : "Faltam credenciais"}
                  <a href={meta?.docs} target="_blank" rel="noreferrer" className="ml-auto text-purple-400 hover:text-purple-300 inline-flex items-center gap-1">
                    Docs <ExternalLink size={10} />
                  </a>
                </div>

                <button
                  onClick={() => onActivate(g.id)}
                  disabled={g.is_active || !filled || busy === g.id}
                  className={`w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    g.is_active
                      ? "bg-emerald-500/10 text-emerald-300 cursor-default"
                      : filled
                      ? "bg-slate-800 hover:bg-purple-600 text-white"
                      : "bg-slate-800/50 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {busy === g.id ? <Loader2 size={14} className="animate-spin" /> : g.is_active ? <Check size={14} /> : <Power size={14} />}
                  {g.is_active ? "Em uso" : filled ? "Ativar este gateway" : "Configure as credenciais"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {(editing || showNew) && (
        <GatewayEditor
          value={editing}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={async (payload) => {
            try {
              await upsert({ data: payload as any });
              setEditing(null); setShowNew(false);
              await reload();
            } catch (e: any) { setErr(e?.message || "Erro ao salvar"); }
          }}
        />
      )}
    </div>
  );
}

function GatewayEditor({
  value, onClose, onSave,
}: {
  value: Gateway | null;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; provider: Provider; credentials: Record<string, string>; enabled: boolean; notes: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(value?.name || "");
  const [provider, setProvider] = useState<Provider>(value?.provider || "bspay");
  const [creds, setCreds] = useState<Record<string, string>>(value?.credentials || {});
  const [enabled, setEnabled] = useState(value?.enabled ?? true);
  const [notes, setNotes] = useState(value?.notes || "");
  const [saving, setSaving] = useState(false);

  const meta = PROVIDER_META[provider];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{value ? "Editar gateway" : "Novo gateway"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nome amigável</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Ex: BSPay Conta Principal"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Provedor</label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value as Provider); setCreds({}); }}
              disabled={!!value}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {(Object.keys(PROVIDER_META) as Provider[]).map((p) => (
                <option key={p} value={p}>{PROVIDER_META[p].label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Credenciais</p>
            {meta.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={creds[f.key] ?? f.options?.[0] ?? ""}
                    onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === "password" ? "password" : "text"}
                    value={creds[f.key] || ""}
                    onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    placeholder={f.help || ""}
                  />
                )}
                {f.help && f.type !== "select" && <p className="text-[10px] text-slate-500 mt-1">{f.help}</p>}
              </div>
            ))}
            <a href={meta.docs} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-1">
              Abrir documentação <ExternalLink size={10} />
            </a>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notas (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Habilitado
          </label>
        </div>
        <div className="p-5 border-t border-slate-800 flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold py-2.5 rounded-lg">
            Cancelar
          </button>
          <button
            disabled={saving || !name.trim()}
            onClick={async () => {
              setSaving(true);
              await onSave({
                id: value?.id, name: name.trim(), provider, credentials: creds, enabled,
                notes: notes.trim() || null,
              });
              setSaving(false);
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
