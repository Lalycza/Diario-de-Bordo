import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { changeOwnPassword } from "@/lib/password.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/alterar-senha")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AlterarSenhaPage,
});

function AlterarSenhaPage() {
  const navigate = useNavigate();
  const alterarSenha = useServerFn(changeOwnPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /\d/.test(newPassword) && newPassword === confirmation && newPassword !== currentPassword;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres, letra maiúscula, minúscula e número, e as confirmações devem coincidir.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Sessão inválida.");
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (loginError) throw new Error("A senha temporária atual está incorreta.");
      await alterarSenha({ data: { newPassword } });
      toast.success("Senha alterada com sucesso.");
      navigate({ to: "/projetos" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="text-center">
          <LockKeyhole className="mx-auto mb-3 size-10 text-primary" />
          <h1 className="text-2xl font-semibold">Crie sua nova senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">Este é seu primeiro acesso. Para continuar no IMPLANTA, altere a senha temporária.</p>
        </div>
        <div className="space-y-2"><Label>Senha temporária atual</Label><Input type={show ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" /></div>
        <div className="space-y-2"><Label>Nova senha</Label><Input type={show ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
        <div className="space-y-2"><Label>Confirmar nova senha</Label><Input type={show ? "text" : "password"} value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" /></div>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setShow(v => !v)}>{show ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}{show ? "Ocultar senhas" : "Mostrar senhas"}</Button>
        <Button className="w-full" disabled={saving || !valid}>{saving ? "Salvando..." : "Salvar nova senha"}</Button>
      </form>
    </main>
  );
}
