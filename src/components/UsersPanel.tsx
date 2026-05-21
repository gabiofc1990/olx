import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Plus, Trash2, ShieldCheck, ShieldOff, RefreshCw,
  X, Eye, EyeOff, UserCog, AlertCircle, Check,
} from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

type FormState = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: "user" | "admin";
};

const INITIAL_FORM: FormState = { email: "", password: "", full_name: "", phone: "", role: "user" };

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAuth, setNoAuth] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setActionErr("");
    const headers = await getAuthHeaders();
    if (!headers) { setNoAuth(true); setLoading(false); return; }
    setNoAuth(false);
    try {
      const res = await fetch("/api/admin/users", { headers });
      if (res.status === 401) { setNoAuth(true); setLoading(false); return; }
      const json = await res.json();
      setUsers(json.users ?? []);
    } catch {
      setActionErr("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    setSaving(true);
    const headers = await getAuthHeaders();
    if (!headers) { setFormErr("Sessão expirada. Faça login novamente."); setSaving(false); return; }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setFormErr(json.error ?? "Erro ao criar usuário."); setSaving(false); return; }
      setShowModal(false);
      setForm(INITIAL_FORM);
      await load();
    } catch {
      setFormErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (user: AdminUser) => {
    setActionErr("");
    const newRole = user.role === "admin" ? "user" : "admin";
    const headers = await getAuthHeaders();
    if (!headers) { setActionErr("Sessão expirada."); return; }
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ user_id: user.id, role: newRole }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setActionErr(json.error ?? "Erro ao alterar papel.");
      return;
    }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
  };

  const deleteUser = async (user: AdminUser) => {
    if (!confirm(`Excluir o usuário "${user.email}"? Esta ação não pode ser desfeita.`)) return;
    setActionErr("");
    const headers = await getAuthHeaders();
    if (!headers) { setActionErr("Sessão expirada."); return; }
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ user_id: user.id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setActionErr(json.error ?? "Erro ao excluir usuário.");
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== user.id));
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.role.includes(q)
    );
  });

  if (noAuth) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-300 font-semibold text-sm">Sessão Supabase necessária</p>
          <p className="text-amber-400/80 text-xs mt-1">
            Para gerenciar usuários é necessário ter uma conta autenticada no Supabase com papel de admin.
            Faça logout e entre novamente com suas credenciais Supabase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Atualizar"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => { setShowModal(true); setForm(INITIAL_FORM); setFormErr(""); }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-purple-500/20 transition text-sm">
            <Plus size={15} /> Novo usuário
          </button>
        </div>
      </div>

      {actionErr && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={15} />
          {actionErr}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
            <tr>
              <th className="text-left font-semibold p-3">Usuário</th>
              <th className="text-left font-semibold p-3">Telefone</th>
              <th className="text-left font-semibold p-3">Papel</th>
              <th className="text-left font-semibold p-3">Criado em</th>
              <th className="text-right font-semibold p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center text-slate-500 text-sm">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin opacity-40" />
                Carregando...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-500">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                      {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name || <span className="text-slate-500 italic">Sem nome</span>}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-slate-300 text-sm">{u.phone || <span className="text-slate-600">—</span>}</td>
                <td className="p-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="p-3 text-xs text-slate-400">{new Date(u.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleRole(u)} title={u.role === "admin" ? "Remover admin" : "Tornar admin"}
                      className={`p-1.5 rounded-md transition ${
                        u.role === "admin"
                          ? "hover:bg-amber-500/10 text-amber-400 hover:text-amber-300"
                          : "hover:bg-purple-500/10 text-slate-400 hover:text-purple-400"
                      }`}>
                      {u.role === "admin" ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                    </button>
                    <button onClick={() => deleteUser(u)} title="Excluir usuário"
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
            <RefreshCw size={20} className="mx-auto mb-2 animate-spin opacity-40" />
            <p className="text-sm">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}</p>
          </div>
        ) : filtered.map(u => (
          <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold shrink-0">
                {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{u.full_name || <span className="text-slate-500 italic">Sem nome</span>}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <RoleBadge role={u.role} />
            </div>
            {u.phone && <p className="text-xs text-slate-400 mb-2">📱 {u.phone}</p>}
            <p className="text-[11px] text-slate-500 mb-3">{new Date(u.created_at).toLocaleString("pt-BR")}</p>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => toggleRole(u)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-md transition font-medium ${
                  u.role === "admin"
                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                }`}>
                {u.role === "admin" ? <><ShieldOff size={13} /> Remover admin</> : <><ShieldCheck size={13} /> Tornar admin</>}
              </button>
              <button onClick={() => deleteUser(u)}
                className="flex items-center justify-center px-3 py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      {!loading && users.length > 0 && (
        <p className="text-xs text-slate-500 text-right">
          {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          {" · "}{users.filter(u => u.role === "admin").length} admin{users.filter(u => u.role === "admin").length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Create user modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <UserCog size={16} className="text-white" />
                </div>
                <h2 className="font-bold text-white">Novo usuário</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Field label="Nome completo">
                  <input
                    type="text" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="João da Silva"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none text-sm transition"
                  />
                </Field>
                <Field label="E-mail *">
                  <input
                    type="email" value={form.email} required
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@email.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none text-sm transition"
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none text-sm transition"
                  />
                </Field>
                <Field label="Senha *">
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"} value={form.password} required minLength={6}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none text-sm transition"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>
                <Field label="Papel">
                  <select value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as "user" | "admin" }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-purple-500 focus:outline-none text-sm transition appearance-none">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </Field>
              </div>

              {formErr && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} />
                  {formErr}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? "Criando..." : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
        <ShieldCheck size={10} /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40">
      <Users size={10} /> Usuário
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
