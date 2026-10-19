# Backups do Supabase — IMPLANTA

## O que este fluxo faz

O workflow manual `Supabase backup` exporta schema, roles e dados PostgreSQL e, quando habilitado, baixa os objetos de todos os buckets do Supabase Storage. O pacote é publicado como artefato privado da execução do GitHub Actions por 30 dias. O manifesto contém horário, caminhos, tamanhos e SHA-256 para verificação de integridade.

**Importante:** este é um backup externo ao banco, mas o artefato ainda depende do acesso à conta/repositório GitHub e expira após 30 dias. Para retenção longa, configure uma cópia adicional em armazenamento independente antes de tratar o processo como política definitiva. O backup não foi testado como restauração até que uma restauração isolada seja executada com sucesso.

## Configuração inicial (uma vez)

No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e cadastre:

- `SUPABASE_DB_URL`: connection string PostgreSQL do projeto oficial. Prefira Session Pooler se a conexão direta não estiver disponível. Nunca coloque a string em arquivos do repositório.
- `SUPABASE_URL`: URL do projeto oficial.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role/secret key necessária para ler os objetos do Storage. Dê acesso somente ao repositório privado/conta confiável e nunca a exponha no frontend, em logs ou no código.

Depois, abra **Actions → Supabase backup → Run workflow** e execute com Storage habilitado. Se o banco tiver tabelas ou extensões que exijam exclusões adicionais, corrija o comando com base nos logs sem alterar dados de produção.

## Onde baixar

Na execução concluída, abra o artefato `implanta-supabase-backup-...` e baixe o ZIP. Guarde uma cópia em local independente do GitHub. O pacote deve conter `schema.sql`, `roles.sql`, `data.sql`, `manifest.json`, `SHA256SUMS.txt` e, se habilitado, a pasta `storage/`.

## Restauração (somente em ambiente separado)

Não restaure sobre produção para testar. Crie um projeto Supabase isolado e siga os procedimentos oficiais de restore do Supabase CLI. Restaure roles/schema/data conforme a documentação e reenvie objetos do Storage separadamente. Valide contagens e relações antes de considerar o backup aprovado.

## Próxima etapa: botão dentro do IMPLANTA

O botão em **Sistema → Central de backups** precisa de uma camada de servidor autenticada para disparar o workflow e consultar o estado da execução. Não deve conter token do GitHub, service-role key ou senha de banco no `index.html`. Antes de conectar o botão, configure um segredo de servidor para a integração e valide que a conta logada tem o papel de administradora no backend. Até essa integração ser feita, o disparo é manual pela aba Actions do GitHub.
