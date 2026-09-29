import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "supervisor" | "analista" | "operador" | "comercial" | "cliente";

export function useRole() {
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [] as AppRole[];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isSupervisor: roles.includes("supervisor"),
    isSupervisor: roles.includes("supervisor"),
    isAnalista: roles.includes("analista"),
    isOperador: roles.includes("operador"),
    isComercial: roles.includes("comercial"),
    isCliente: roles.includes("cliente"),
    isConsultationOnly:
      roles.includes("operador") || roles.includes("cliente"),
    isLoading: query.isLoading,
  };
}
