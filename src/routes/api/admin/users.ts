import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function verifyAdmin(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return role ? user.id : null;
}

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const adminId = await verifyAdmin(request);
        if (!adminId) return new Response("Unauthorized", { status: 401 });

        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name, phone, email, created_at")
          .order("created_at", { ascending: false });

        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!profiles?.length) return Response.json({ users: [] });

        const userIds = profiles.map((p) => p.user_id);
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const roleMap = new Map<string, string>();
        for (const r of roles ?? []) {
          if (r.role === "admin" || !roleMap.has(r.user_id)) {
            roleMap.set(r.user_id, r.role);
          }
        }

        const users = profiles.map((p) => ({
          id: p.user_id,
          email: p.email,
          full_name: p.full_name,
          phone: p.phone,
          role: roleMap.get(p.user_id) ?? "user",
          created_at: p.created_at,
        }));

        return Response.json({ users });
      },

      POST: async ({ request }) => {
        const adminId = await verifyAdmin(request);
        if (!adminId) return new Response("Unauthorized", { status: 401 });

        let body: any;
        try { body = await request.json(); } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        const { email, password, full_name, phone, role } = body ?? {};
        if (!email || !password) {
          return Response.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name ?? "", phone: phone ?? "" },
        });

        if (error || !data.user) {
          return Response.json({ error: error?.message ?? "Falha ao criar usuário" }, { status: 400 });
        }

        if (role === "admin") {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: data.user.id, role: "admin" });
        }

        return Response.json({ ok: true, user_id: data.user.id });
      },

      PATCH: async ({ request }) => {
        const adminId = await verifyAdmin(request);
        if (!adminId) return new Response("Unauthorized", { status: 401 });

        let body: any;
        try { body = await request.json(); } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        const { user_id, role } = body ?? {};
        if (!user_id) {
          return Response.json({ error: "user_id obrigatório" }, { status: 400 });
        }

        if (role === "admin") {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id, role: "admin" });
        } else {
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", user_id)
            .eq("role", "admin");
        }

        return Response.json({ ok: true });
      },

      DELETE: async ({ request }) => {
        const adminId = await verifyAdmin(request);
        if (!adminId) return new Response("Unauthorized", { status: 401 });

        let body: any;
        try { body = await request.json(); } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        const { user_id } = body ?? {};
        if (!user_id) {
          return Response.json({ error: "user_id obrigatório" }, { status: 400 });
        }

        if (user_id === adminId) {
          return Response.json({ error: "Não é possível excluir sua própria conta" }, { status: 400 });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) return Response.json({ error: error.message }, { status: 400 });

        return Response.json({ ok: true });
      },
    },
  },
});
