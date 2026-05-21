import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Trash2, Upload, Plus, Star, Eye, EyeOff, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, Camera, ArrowUp, ArrowDown } from "lucide-react";

function EditErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  // eslint-disable-next-line no-console
  console.error("[admin/anuncio] erro:", error);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
        <h2 className="text-lg font-bold mb-2">Não foi possível abrir o anúncio</h2>
        <p className="text-sm text-slate-400 mb-4 break-words">{error?.message ?? "Erro desconhecido"}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => reset()} className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">Tentar novamente</button>
          <Link to="/admin" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-4 py-2 rounded-lg">Voltar ao painel</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/anuncio/$id")({ component: EditListing, errorComponent: EditErrorBoundary });

const SECTIONS = [
  { value: "main", label: "Principal (página inicial)" },
  { value: "tambem", label: "Também podem te interessar" },
  { value: "mais", label: "Mais procurados" },
];

function EditListing() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [form, setForm] = useState<any>({
    slug: "", title: "", description: "", price_cents: 0, installment_label: "", brand: "", model: "",
    condition: "Usado", storage_capacity: "", color: "", location_text: "", seller_name: "", seller_since: "",
    seller_sales: 0, shipping_label: "Entrega Fácil",
    is_main: false, carousel_section: "tambem", display_order: 0, published: true, posted_at: ""
  });
  const [images, setImages] = useState<{ id?: string; url: string; display_order: number }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState("");
  const [previewIdx, setPreviewIdx] = useState(0);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    Promise.all([
      supabase.from("listings").select("*").eq("id", id).maybeSingle(),
      supabase.from("listing_images").select("*").eq("listing_id", id).order("display_order"),
    ]).then(([listingRes, imageRes]) => {
      if (listingRes.error) setLoadError(listingRes.error.message);
      if (listingRes.data) setForm(listingRes.data);
      if (imageRes.data) setImages(imageRes.data);
    }).finally(() => setLoading(false));
  }, [id, isNew]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = async () => {
    if (!form.slug.trim() || !form.title.trim()) { alert("Preencha o título e o slug do anúncio."); return; }
    setSaving(true);
    if (isNew) {
      const { data, error } = await supabase.from("listings").insert(form).select().single();
      if (error) { alert(error.message); setSaving(false); return; }
      setSaving(false);
      navigate({ to: "/admin/anuncio/$id", params: { id: data.id } });
      return;
    }
    const { error } = await supabase.from("listings").update(form).eq("id", id);
    setSaving(false);
    if (error) { alert(error.message); return; }
    navigate({ to: "/admin" });
  };

  const removeListing = async () => {
    if (!confirm("Excluir este anúncio? Esta ação não pode ser desfeita.")) return;
    await supabase.from("listings").delete().eq("id", id);
    navigate({ to: "/admin" });
  };

  const addImage = async () => {
    if (!newUrl || isNew) return;
    const { data } = await supabase.from("listing_images").insert({ listing_id: id, url: newUrl, display_order: images.length }).select().single();
    if (data) setImages([...images, data]);
    setNewUrl("");
  };

  const uploadImage = async (file: File) => {
    if (isNew) { alert("Salve o anúncio primeiro para poder enviar fotos."); return; }
    setUploading(true);
    const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("listing-images").upload(path, file);
    if (error) { alert(error.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
    const { data } = await supabase.from("listing_images").insert({ listing_id: id, url: pub.publicUrl, display_order: images.length }).select().single();
    if (data) setImages([...images, data]);
    setUploading(false);
  };

  const removeImage = async (imgId?: string) => {
    if (!imgId) return;
    await supabase.from("listing_images").delete().eq("id", imgId);
    setImages(images.filter(i => i.id !== imgId));
  };

  const moveImage = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[idx], next[target]] = [next[target], next[idx]];
    const reordered = next.map((img, i) => ({ ...img, display_order: i }));
    setImages(reordered);
    await Promise.all(reordered.map(img => img.id ? supabase.from("listing_images").update({ display_order: img.display_order }).eq("id", img.id) : Promise.resolve()));
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <Loader2 className="animate-spin mr-2" size={18} /> Carregando anúncio...
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen bg-slate-950 p-8">
      <Link to="/admin" className="text-purple-400 text-sm flex items-center gap-1"><ArrowLeft size={14}/>Voltar</Link>
      <p className="mt-4 text-red-400">{loadError}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
            <ArrowLeft size={16}/> Voltar ao painel
          </Link>
          {!isNew && (
            <button onClick={removeListing} className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition">
              <Trash2 size={14}/> Excluir
            </button>
          )}
        </div>

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Criar novo anúncio" : "Editar anúncio"}</h1>
            <p className="text-sm text-slate-500 mt-1">{isNew ? "Preencha os campos e clique em salvar" : form.title}</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-purple-500/20 transition">
            {saving ? <><Loader2 size={16} className="animate-spin"/> Salvando...</> : <><Save size={16}/> Salvar</>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Informações básicas">
              <Field label="Título do anúncio" required>
                <input value={form.title} onChange={e => { set("title", e.target.value); if (isNew && !form.slug) set("slug", slugify(e.target.value)); }} className={inputCls} placeholder="Ex: iPhone 13 128GB seminovo" />
              </Field>
              <Field label="Slug (URL)" required hint={`Será acessado em /anuncio/${form.slug || "..."}`}>
                <input value={form.slug} onChange={e => set("slug", slugify(e.target.value))} className={inputCls} placeholder="iphone-13-128gb" />
              </Field>
              <Field label="Descrição">
                <textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} rows={4} className={inputCls} placeholder="Descreva o produto..." />
              </Field>
            </Section>

            <Section title="Preço & condições">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço (R$)" required>
                  <input type="number" step="0.01" value={form.price_cents / 100} onChange={e => set("price_cents", Math.round(Number(e.target.value) * 100))} className={inputCls} />
                </Field>
                <Field label="Label parcelamento">
                  <input value={form.installment_label ?? ""} onChange={e => set("installment_label", e.target.value)} className={inputCls} placeholder="Ex: 12x R$ 150,00" />
                </Field>
                <Field label="Label entrega">
                  <input value={form.shipping_label ?? ""} onChange={e => set("shipping_label", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Postado em">
                  <input value={form.posted_at ?? ""} onChange={e => set("posted_at", e.target.value)} className={inputCls} placeholder="Ex: Hoje, 10:32" />
                </Field>
              </div>
            </Section>

            <Section title="Especificações">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca"><input value={form.brand ?? ""} onChange={e => set("brand", e.target.value)} className={inputCls}/></Field>
                <Field label="Modelo"><input value={form.model ?? ""} onChange={e => set("model", e.target.value)} className={inputCls}/></Field>
                <Field label="Condição"><input value={form.condition ?? ""} onChange={e => set("condition", e.target.value)} className={inputCls}/></Field>
                <Field label="Armazenamento"><input value={form.storage_capacity ?? ""} onChange={e => set("storage_capacity", e.target.value)} className={inputCls}/></Field>
                <Field label="Cor"><input value={form.color ?? ""} onChange={e => set("color", e.target.value)} className={inputCls}/></Field>
                <Field label="Localização"><input value={form.location_text ?? ""} onChange={e => set("location_text", e.target.value)} className={inputCls}/></Field>
              </div>
            </Section>

            <Section title="Vendedor">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome"><input value={form.seller_name ?? ""} onChange={e => set("seller_name", e.target.value)} className={inputCls}/></Field>
                <Field label="Vendedor desde"><input value={form.seller_since ?? ""} onChange={e => set("seller_since", e.target.value)} className={inputCls} placeholder="Ex: jan/2020"/></Field>
                <Field label="Vendas concluídas"><input type="number" value={form.seller_sales ?? 0} onChange={e => set("seller_sales", Number(e.target.value))} className={inputCls}/></Field>
              </div>
            </Section>

            {!isNew && (
              <Section title={`Fotos (${images.length})`}>
                {images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">Prévia ao vivo (como aparece na home)</p>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                      <div className="relative bg-gradient-to-b from-gray-100 to-gray-50 aspect-[4/3] w-full max-w-sm mx-auto overflow-hidden rounded-lg">
                        <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${Math.min(previewIdx, images.length - 1) * 100}%)` }}>
                          {images.map((img, i) => (
                            <img key={img.id ?? i} src={img.url} alt={`Foto ${i + 1}`} className="w-full h-full object-contain shrink-0" />
                          ))}
                        </div>
                        {images.length > 1 && (
                          <>
                            <button type="button" onClick={() => setPreviewIdx(i => (i - 1 + images.length) % images.length)} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-95">
                              <ChevronLeft size={20} className="text-gray-800" />
                            </button>
                            <button type="button" onClick={() => setPreviewIdx(i => (i + 1) % images.length)} aria-label="Próxima" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-95">
                              <ChevronRight size={20} className="text-gray-800" />
                            </button>
                          </>
                        )}
                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 rounded-md text-white text-[11px] flex items-center gap-1">
                          <Camera size={14} /> {Math.min(previewIdx, images.length - 1) + 1}/{images.length}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {images.map((img, idx) => (
                      <div key={img.id} className="relative group aspect-square">
                        <img src={img.url} className="w-full h-full object-cover rounded-lg border border-slate-700" />
                        <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{idx + 1}</div>
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="flex-1 bg-slate-900/90 hover:bg-slate-800 disabled:opacity-30 text-white rounded py-1 flex items-center justify-center"><ArrowUp size={12}/></button>
                          <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} className="flex-1 bg-slate-900/90 hover:bg-slate-800 disabled:opacity-30 text-white rounded py-1 flex items-center justify-center"><ArrowDown size={12}/></button>
                        </div>
                        <button onClick={() => removeImage(img.id)}
                          className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-lg py-8 cursor-pointer transition bg-slate-900/40">
                    {uploading ? <><Loader2 size={16} className="animate-spin"/> Enviando...</> : <><Upload size={16}/> <span className="text-sm">Enviar arquivo do computador</span></>}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                  <div className="flex gap-2">
                    <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="ou cole uma URL de imagem" className={inputCls + " flex-1"} />
                    <button onClick={addImage} disabled={!newUrl} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-4 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition">
                      <Plus size={14}/> Adicionar
                    </button>
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Section title="Publicação">
              <div className="space-y-3">
                <Field label="Seção do site">
                  <select value={form.carousel_section} onChange={e => set("carousel_section", e.target.value)} className={inputCls}>
                    {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Ordem de exibição">
                  <input type="number" value={form.display_order} onChange={e => set("display_order", Number(e.target.value))} className={inputCls} />
                </Field>
                <Toggle label="Anúncio principal da home" hint="Aparece em destaque no topo" icon={Star} active={form.is_main} onChange={(v: boolean) => set("is_main", v)} />
                <Toggle label="Publicado" hint="Visível no site público" icon={form.published ? Eye : EyeOff} active={form.published} onChange={(v: boolean) => set("published", v)} />
              </div>
            </Section>

            {isNew && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 flex gap-2">
                <ImageIcon size={16} className="shrink-0 mt-0.5"/>
                <p>Salve o anúncio primeiro para poder enviar fotos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition";

function Section({ title, children }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: any) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-300">{label}{required && <span className="text-pink-400 ml-0.5">*</span>}</span>
      </div>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </label>
  );
}

function Toggle({ label, hint, icon: Icon, active, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!active)}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition ${
        active ? "bg-purple-500/10 border-purple-500/40" : "bg-slate-950 border-slate-700 hover:border-slate-600"
      }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-purple-500/20 text-purple-300" : "bg-slate-800 text-slate-500"}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
      <div className={`w-9 h-5 rounded-full p-0.5 transition ${active ? "bg-purple-500" : "bg-slate-700"}`}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${active ? "translate-x-4" : "translate-x-0"}`} />
      </div>
    </button>
  );
}
