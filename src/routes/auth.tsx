import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";

const LOGO_DATA_URL = "data:image/webp;base64,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";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Gestão de Implantações" },
      { name: "description", content: "Acesse o sistema de gestão de projetos de implantação." },
    ],
  }),
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
    <div className="portal-login relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="portal-login__content relative z-10 w-full max-w-md rounded-2xl border p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex justify-center">
          <img src={LOGO_DATA_URL} alt="HPro — Soluções de TI para Gestão Corporativa" className="h-auto w-[260px] dark:brightness-125 sm:w-[300px]" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Gestão de Implantações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o portal com seu e-mail e senha.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" minLength={8} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
