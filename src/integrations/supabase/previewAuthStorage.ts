// Storage de sessão do Supabase para o IMPLANTA.
// O projeto não depende de Lovable para autenticação: usa o armazenamento
// persistente do navegador em qualquer ambiente de execução.
export function brokeredPreviewStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
