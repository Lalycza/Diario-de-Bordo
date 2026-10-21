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
    const cnpj = data.cnpj.replace(/[^0-9]/g, "");
    if (cnpj.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");

    // Consulta no servidor para evitar dependência de CORS do navegador.
    // Se a fonte principal falhar, tenta um provedor alternativo.
    const endpoints = [
      { url: `https://brasilapi.com.br/cnpj/v1/${cnpj}`, provider: "brasilapi" },
      { url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, provider: "brasilapi" },
      { url: `https://kitana.opencnpj.com/cnpj/${cnpj}`, provider: "opencnpj" },
    ] as const;

    let payload: Record<string, unknown> | null = null;
    let sawNotFound = false;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });

        if (response.status === 404) {
          sawNotFound = true;
          continue;
        }
        if (!response.ok) continue;

        const body = (await response.json()) as Record<string, unknown>;
        if (endpoint.provider === "opencnpj") {
          if (body.success !== true || !body.data || typeof body.data !== "object") continue;
          payload = body.data as Record<string, unknown>;
        } else {
          payload = body;
        }
        break;
      } catch {
        // Falha de rede/timeout em um provedor não impede tentar o próximo.
      }
    }

    if (!payload) {
      throw new Error(
        sawNotFound
          ? "CNPJ não encontrado na base de consulta."
          : "Não foi possível consultar o CNPJ agora. Tente novamente em instantes.",
      );
    }

    const str = (...keys: string[]) => {
      for (const key of keys) {
        const value = payload?.[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
      }
      return "";
    };
    const cnaes = payload.cnaes;
    const firstCnae =
      Array.isArray(cnaes) && cnaes[0] && typeof cnaes[0] === "object"
        ? (cnaes[0] as Record<string, unknown>)
        : null;
    const logradouro = [
      str("descricao_tipo_de_logradouro"),
      str("logradouro"),
    ].filter(Boolean).join(" ");

    return {
      cnpj,
      razao_social: str("razao_social", "razaoSocial"),
      nome_fantasia: str("nome_fantasia", "nomeFantasia"),
      email: str("email"),
      telefone: str("ddd_telefone_1", "telefone"),
      logradouro,
      numero: str("numero"),
      complemento: str("complemento"),
      bairro: str("bairro"),
      municipio: str("municipio"),
      uf: str("uf"),
      cep: str("cep"),
      situacao_cadastral: str("descricao_situacao_cadastral", "situacaoCadastral"),
      atividade_principal:
        str("cnae_fiscal_descricao") ||
        (typeof firstCnae?.descricao === "string" ? firstCnae.descricao : ""),
    };
  });
