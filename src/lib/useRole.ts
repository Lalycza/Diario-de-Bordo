import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "supervisor" | "analista" | "operador" | "comercial" | "cliente";

const PROTECTED_ADMIN_EMAIL = "larissazonetti@outlook.com";

export function useRole() {
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const email = userData.user?.email?.toLowerCase() ?? null;
      if (!uid) return { roles: [] as AppRole[], email };

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (error) throw error;
      return { roles: (data ?? []).map((r) => r.role as AppRole), email };
    },
  });

  const roles = query.data?.roles ?? [];
  const isProtectedAdmin = query.data?.email === PROTECTED_ADMIN_EMAIL;

  return {
    roles,
    isAdmin: roles.includes("admin") || isProtectedAdmin,
    isSupervisor: roles.includes("supervisor"),
    isAnalista: roles.includes("analista"),
    isOperador: roles.includes("operador"),
    isComercial: roles.includes("comercial"),
    isCliente: roles.includes("cliente"),
    isConsultationOnly: roles.includes("operador") || roles.includes("cliente"),
    isLoading: query.isLoading,
  };
}
