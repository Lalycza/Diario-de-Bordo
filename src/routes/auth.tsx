import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveProfileHomeRoute } from "@/lib/profile-home";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Entrar — Gestão de Implantações" },
    { name: "description", content: "Acesse o sistema de gestão de projetos de implantação." },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const homeRoute = await resolveProfileHomeRoute();
        window.location.replace(homeRoute);
      }
    })();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !senha) {
      toast.error("Informe o e-mail e a senha.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw error;
      let homeRoute = "/projetos";
      try {
        homeRoute = await resolveProfileHomeRoute();
      } catch (routeError) {
        console.error("[Login] Autenticação concluída, mas falhou a resolução da rota inicial:", routeError);
      }
      window.location.replace(homeRoute);
    } catch (error) {
      console.error("[Login] Falha ao entrar:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleLogin();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Gestão de Implantações</CardTitle>
          <CardDescription>Entre para acompanhar cronogramas, módulos e treinamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="senha">Senha</Label><Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
