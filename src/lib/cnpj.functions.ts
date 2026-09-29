import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DadosCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  situacao_cadastral: string;
  atividade_principal: string;
};

export const lookupCnpj = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cnpj: string }) => input)
  .handler(async ({ data }): Promise<DadosCnpj> => {
    const cnpj = data.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!response.ok) {
      const body = await response.text();
      console.error(`Consulta de CNPJ falhou [${response.status}]: ${body}`);
      throw new Error(
        response.status === 404
          ? "CNPJ não encontrado na base da Receita."
          : "Não foi possível consultar o CNPJ agora. Tente novamente.",
      );
    }

    const j = (await response.json()) as Record<string, unknown>;
    const str = (key: string) => {
      const v = j[key];
      return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
    };

    return {
      cnpj,
      razao_social: str("razao_social"),
      nome_fantasia: str("nome_fantasia"),
      email: str("email"),
      telefone: str("ddd_telefone_1"),
      logradouro: `${str("descricao_tipo_de_logradouro")} ${str("logradouro")}`.trim(),
      numero: str("numero"),
      complemento: str("complemento"),
      bairro: str("bairro"),
      municipio: str("municipio"),
      uf: str("uf"),
      cep: str("cep"),
      situacao_cadastral: str("descricao_situacao_cadastral"),
      atividade_principal: str("cnae_fiscal_descricao"),
    };
  });
