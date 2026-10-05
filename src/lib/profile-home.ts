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

async function hasRole(userId: string, role: ProfileHomeRole): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: role,
  });

  if (error) throw error;
  return data === true;
}

export async function resolveProfileHomeRoute(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return "/auth";

  const email = user.email?.toLowerCase() ?? "";

  // Use the same authoritative role check used by the user-management
  // server functions. Reading user_roles directly from the browser can be
  // affected by RLS and was causing valid profiles to fall back to /projetos.
  const [isSupervisor, isCS, isComercial, isCliente] = await Promise.all([
    hasRole(user.id, "supervisor"),
    hasRole(user.id, "cs"),
    hasRole(user.id, "comercial"),
    hasRole(user.id, "cliente"),
  ]);

  const isAdmin = email === PROTECTED_ADMIN_EMAIL || await hasRole(user.id, "admin");

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
