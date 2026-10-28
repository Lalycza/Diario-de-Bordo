# Microsoft 365 / Teams Calendar — TI setup (preview)

## Objetivo
Permitir que cada analista conecte sua própria conta corporativa Microsoft 365 e importe os eventos do calendário pessoal para a Agenda do Diário de Bordo. Não é uma integração de calendário compartilhado e não permite que um analista leia o calendário de outro.

## Registro no Microsoft Entra ID
1. Acesse https://entra.microsoft.com → Identity → Applications → App registrations → New registration.
2. Nome sugerido: `IMPLANTA Diário de Bordo — Calendário Microsoft 365 (Preview)`.
3. Supported account types: **Accounts in this organizational directory only (single tenant)**.
4. Anote **Application (client) ID** e **Directory (tenant) ID**. Não os publique em repositórios.
5. Em Authentication, adicione plataforma **Web** com redirect URI exata do ambiente de testes:
   `https://doseyjraozxeooqmnjud.supabase.co/functions/v1/teams-calendar`
6. Em API permissions → Microsoft Graph → **Delegated permissions**, adicione:
   - `User.Read` (identificar a conta conectada)
   - `Calendars.Read` (ler o calendário)
   - `offline_access` (renovar acesso sem pedir login a cada vez)
   - `openid`, `profile`, `email` se necessário para o fluxo de identidade.
7. Não adicionar Application permissions, `Calendars.ReadWrite`, Mail, Files ou permissões de Teams chat. O escopo é somente leitura do calendário pessoal.
8. Se a política do tenant exigir, conceda admin consent para as permissões delegadas listadas.
9. Em Certificates & secrets, crie um client secret para o ambiente de testes. **Não envie o valor por e-mail, chat, chamado ou GitHub.** O TI deve inseri-lo diretamente no cofre de secrets do Supabase de testes, ou combinar um canal corporativo aprovado com a pessoa responsável pela implantação.

## Secrets necessários no Supabase de TESTES
Projeto: `diario-de-bordo-testes` (ref `doseyjraozxeooqmnjud`).
Configurar como Edge Function secrets:
- `TEAMS_CLIENT_ID`: Application (client) ID.
- `TEAMS_TENANT_ID`: Directory (tenant) ID.
- `TEAMS_CLIENT_SECRET`: valor do secret criado no Entra ID.
- `TEAMS_REDIRECT_URI`: `https://doseyjraozxeooqmnjud.supabase.co/functions/v1/teams-calendar`.
- `TEAMS_APP_REDIRECT_URL`: URL do preview do Diário de Bordo aprovada para o teste (não usar o domínio de produção).
- `TEAMS_TOKEN_ENCRYPTION_KEY`: chave aleatória de 32 bytes codificada em Base64. Guardar somente como secret do servidor; nunca colocar em GitHub, navegador ou mensagem.
Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ao runtime da Edge Function. A service-role key nunca deve ir para o frontend.

## Validação de segurança antes do piloto
- Testar com uma conta de analista de teste, não uma conta compartilhada.
- Confirmar que a conexão e os eventos de um usuário não podem ser consultados por outro usuário.
- Confirmar que o app solicita apenas leitura e que revogar o consentimento interrompe a sincronização.
- Tokens e refresh tokens nunca são retornados ao browser nem gravados em logs.
- A integração ainda não deve ser habilitada para produção. O redirect URI de produção, secrets e consentimento deverão ser configurados separadamente após aprovação do preview.

Referências oficiais:
- Registro de aplicativos: https://learn.microsoft.com/en-us/graph/auth-register-app-v2
- Permissões do Microsoft Graph: https://learn.microsoft.com/en-us/graph/permissions-reference
- Sincronização incremental: https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0
