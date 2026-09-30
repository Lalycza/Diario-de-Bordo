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
  head: () => ({
    meta: [
      { title: "Entrar — Gestão de Implantações" },
      { name: "description", content: "Acesse o sistema de gestão de projetos de implantação." },
    ],
  }),
  component: AuthPage,
});

function HProLogo() {
  return (
    <svg
      viewBox="0 0 600 180"
      className="h-auto w-[250px] sm:w-[290px] dark:brightness-125"
      role="img"
      aria-label="HPro — Soluções de TI para Gestão Corporativa"
    >
      <g transform="translate(20 15)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 130V35l42-25v120" stroke="#0fa6a3" strokeWidth="8" />
        <path d="M52 130V55l55-35v110" stroke="#55585b" strokeWidth="8" />
        <circle cx="25" cy="88" r="7" stroke="#0fa6a3" strokeWidth="5" />
        <circle cx="48" cy="65" r="7" stroke="#0fa6a3" strokeWidth="5" />
        <circle cx="75" cy="93" r="7" stroke="#55585b" strokeWidth="5" />
        <circle cx="96" cy="69" r="7" stroke="#55585b" strokeWidth="5" />
        <path d="M25 88l23-23M48 65l27 28M75 93l21-24" stroke="#55585b" strokeWidth="5" />
      </g>
      <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="800">
        <text x="145" y="82" fontSize="70" fill="#55585b">HPRO</text>
        <text x="148" y="116" fontSize="22" fill="#666">Soluções de TI para</text>
        <text x="148" y="143" fontSize="22" fill="#0fa6a3">Gestão Corporativa</text>
      </g>
    </svg>
  );
}

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
          <HProLogo />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Gestão de Implantações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o portal com seu e-mail e senha.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
