import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase.from("profiles").select("must_change_password").eq("id", data.user.id).maybeSingle();
    if (profile?.must_change_password) throw redirect({ to: "/alterar-senha" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const route = Route.useRouteContext();
  return (
    <AppShell userLabel={route.user.email}>
      <Outlet />
    </AppShell>
  );
}
