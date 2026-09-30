import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Entrar — Gestão de Implantações" },
    { name: "description", content: "Acesse o sistema de gestão de projetos de implantação." },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/projetos", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      navigate({ to: "/projetos", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-login relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(90deg,rgba(148,163,184,.12) 1px,transparent 1px),linear-gradient(rgba(148,163,184,.10) 1px,transparent 1px),radial-gradient(circle at 20% 20%,rgba(59,130,246,.20),transparent 28%),radial-gradient(circle at 80% 75%,rgba(14,165,233,.14),transparent 30%)", backgroundSize: "44px 44px,44px 44px,auto,auto" }} />
      <div className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(135deg,transparent 0 48%,rgba(148,163,184,.22) 49%,transparent 50%),linear-gradient(25deg,transparent 0 58%,rgba(96,165,250,.18) 59%,transparent 60%)", backgroundSize: "260px 190px,310px 220px" }} />
      <div className="absolute right-4 top-4 z-20"><ThemeToggle /></div>
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>Gestão de Implantações</CardTitle>
          <CardDescription>Entre para acompanhar cronogramas, módulos e treinamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="senha">Senha</Label><Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
