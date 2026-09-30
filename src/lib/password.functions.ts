import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { newPassword: string }) => input)
  .handler(async ({ data, context }) => {
    if (
      data.newPassword.length < 8 ||
      !/[A-Z]/.test(data.newPassword) ||
      !/[a-z]/.test(data.newPassword) ||
      !/\d/.test(data.newPassword)
    ) {
      throw new Error("A nova senha deve ter pelo menos 8 caracteres, letra maiúscula, minúscula e número.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      context.userId,
      { password: data.newPassword },
    );
    if (passwordError) throw passwordError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);

    if (profileError) throw profileError;

    return { ok: true };
  });
