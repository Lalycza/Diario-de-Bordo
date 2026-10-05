import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "supervisor" | "analista" | "operador" | "cs" | "comercial" | "cliente";

const PROTECTED_ADMIN_EMAIL = "larissazonetti@outlook.com";

async function loadMyRoles() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const email = user?.email?.toLowerCase() ?? null;

  if (!user) return { roles: [] as AppRole[], email };

  const roleNames: AppRole[] = ["admin", "supervisor", "analista", "operador", "cs", "comercial", "cliente"];
  const checks = await Promise.all(
    roleNames.map(async (role) => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: role,
      });
      if (error) throw error;
      return data === true ? role : null;
    }),
  );

  return {
    roles: checks.filter((role): role is AppRole => role !== null),
    email,
  };
}

export function useRole() {
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: loadMyRoles,
  });

  const roles = query.data?.roles ?? [];
  const isProtectedAdmin = query.data?.email === PROTECTED_ADMIN_EMAIL;

  return {
    roles,
    isAdmin: roles.includes("admin") || isProtectedAdmin,
    isSupervisor: roles.includes("supervisor"),
    isAnalista: roles.includes("analista"),
    isOperador: roles.includes("operador"),
    isCS: roles.includes("cs"),
    isComercial: roles.includes("comercial"),
    isCliente: roles.includes("cliente"),
    isConsultationOnly: roles.includes("operador") || roles.includes("cs") || roles.includes("cliente"),
    isLoading: query.isLoading,
  };
}
