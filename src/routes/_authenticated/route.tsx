import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase.from("profiles").select("active, must_change_password").eq("id", data.user.id).maybeSingle();
    if (profile && profile.active === false) {
      await supabase.auth.signOut({ scope: "local" });
      throw redirect({ to: "/auth" });
    }
    if (profile?.must_change_password) throw redirect({ to: "/alterar-senha" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
