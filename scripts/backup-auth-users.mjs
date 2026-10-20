import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para exportar usuários Auth.");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Falha ao exportar usuários Auth (página ${page}): ${error.message}`);
  const batch = data?.users ?? [];
  for (const user of batch) {
    users.push({
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      created_at: user.created_at ?? null,
      updated_at: user.updated_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      phone_confirmed_at: user.phone_confirmed_at ?? null,
      user_metadata: user.user_metadata ?? {},
      app_metadata: user.app_metadata ?? {},
      identities: (user.identities ?? []).map((identity) => ({
        provider: identity.provider,
        provider_id: identity.provider_id,
        identity_data: identity.identity_data ?? {},
        created_at: identity.created_at ?? null,
        updated_at: identity.updated_at ?? null,
      })),
    });
  }
  if (batch.length < 1000) break;
}
await mkdir("backup", { recursive: true });
await writeFile(path.resolve("backup/auth-users.json"), JSON.stringify({
  exported_at: new Date().toISOString(),
  user_count: users.length,
  note: "Exporta metadados e identidades; senhas e tokens de recuperação não são exportados pela API.",
  users,
}, null, 2) + "\n");
console.log(`Usuários Auth exportados: ${users.length}. Senhas não são exportadas pela API.`);
