import { supabase } from "@/integrations/supabase/client";

export type ProfileHomeRole =
  | "admin"
  | "supervisor"
  | "analista"
  | "operador"
  | "cs"
  | "comercial"
  | "cliente";

const PROTECTED_ADMIN_EMAIL = "larissazonetti@outlook.com";

export async function resolveProfileHomeRoute(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return "/auth";

  const email = user.email?.toLowerCase() ?? null;

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) throw roleError;

  const roles = new Set(
    (roleRows ?? []).map((row) => row.role as ProfileHomeRole),
  );

  const isAdmin = roles.has("admin") || email === PROTECTED_ADMIN_EMAIL;
  const isSupervisor = roles.has("supervisor");
  const isCS = roles.has("cs");
  const isComercial = roles.has("comercial");
  const isCliente = roles.has("cliente");

  if (isAdmin || isSupervisor || isCS) return "/dashboard";
  if (isComercial) return "/cadastros/clientes";

  if (isCliente) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.client_id) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", profile.client_id)
        .eq("arquivado", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (projectError) throw projectError;
      if (project?.id) return `/projeto/${project.id}/cronograma`;
    }

    return "/projetos";
  }

  return "/projetos";
}
