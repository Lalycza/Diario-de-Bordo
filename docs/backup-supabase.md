# Backups do Supabase — IMPLANTA

## O que este fluxo faz
O workflow manual `Supabase backup` exporta schema, roles e dados PostgreSQL, exporta metadados/identidades de usuários do Supabase Auth e, quando habilitado, baixa os objetos de todos os buckets do Supabase Storage. Senhas e tokens de recuperação não são exportados pela API Auth e precisarão de redefinição se houver uma recuperação. Cria manifesto e checksums, compacta e **criptografa o pacote antes de enviá-lo ao GitHub Actions**. Isso é obrigatório porque o repositório é público: nenhum dado do cliente pode ser enviado em texto aberto como artefato.

O artefato criptografado fica disponível por 30 dias. Embora o conteúdo seja criptografado, o artefato ainda depende da conta/repositório GitHub e expira. Guarde uma cópia em local independente e configure retenção externa antes de tratar o processo como política definitiva. O backup ainda não foi testado como restauração; não considere a estratégia validada até uma restauração isolada concluir com sucesso.

## Configuração inicial (uma vez)
No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e cadastre:

- `SUPABASE_DB_URL`: connection string PostgreSQL do projeto oficial. Prefira Session Pooler se a conexão direta não estiver disponível. Nunca coloque a string em arquivos do repositório.
- `SUPABASE_URL`: URL do projeto oficial.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role/secret key necessária para exportar metadados dos usuários Auth e ler os objetos do Storage.
- `BACKUP_ENCRYPTION_PASSPHRASE`: frase-senha longa e exclusiva para criptografar o pacote. Guarde-a em um gerenciador de senhas fora do GitHub; sem ela, o backup não pode ser aberto.

Depois, abra **Actions → Supabase backup → Run workflow** e execute com Storage habilitado. Se o banco tiver tabelas ou extensões que exijam exclusões adicionais, corrija o comando com base nos logs sem alterar dados de produção.

## Onde baixar e descriptografar
Na execução concluída, baixe o artefato `implanta-supabase-backup-...` e guarde uma cópia fora do GitHub. O ZIP contém o arquivo `implanta-backup.enc`. Em um ambiente confiável com OpenSSL, use a mesma frase-senha para descriptografar:

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in implanta-backup.enc -out implanta-backup.tar.gz
tar -xzf implanta-backup.tar.gz
```

A pasta extraída contém `schema.sql`, `roles.sql`, `data.sql`, `manifest.json`, `SHA256SUMS.txt` e, se habilitado, `storage/`.

## Restauração (somente em ambiente separado)
Não restaure sobre produção para testar. Crie um projeto Supabase isolado e siga os procedimentos oficiais de restore do Supabase CLI. Restaure roles/schema/data conforme a documentação e reenvie objetos do Storage separadamente. Valide contagens e relações antes de considerar o backup aprovado.

## Próxima etapa: botão dentro do IMPLANTA
O botão em **Sistema → Backup** pode abrir a tela de execução do GitHub Actions, mas o disparo realmente integrado dentro do sistema exige uma camada de servidor autenticada para iniciar o workflow e consultar seu estado. Ela precisa guardar um token do GitHub como segredo de servidor; nunca deve conter token do GitHub, service-role key ou senha do banco no `index.html`. Até essa integração ser configurada, o disparo é manual pela aba Actions do GitHub.
