// Modelo de implantação (baseado na planilha PH2)

export type TemplateItem = { grupo: string | null; nome: string };
export type TemplateFase = { fase: string; responsavel: string; itens: TemplateItem[] };

export const TEMPLATE_FASES: TemplateFase[] = [
  {
    "fase": "INFRAESTRUTURA E SISTEMAS",
    "itens": [
      {
        "grupo": null,
        "nome": "Instalação do sistema"
      },
      {
        "grupo": null,
        "nome": "Manutenção"
      },
      {
        "grupo": null,
        "nome": "Segurança (Backup)"
      },
      {
        "grupo": null,
        "nome": "Cadastro de Usuários"
      },
      {
        "grupo": null,
        "nome": "Configurações do Sistema"
      },
      {
        "grupo": null,
        "nome": "Balança/MGV"
      },
      {
        "grupo": null,
        "nome": "Opções Adicionais"
      },
      {
        "grupo": null,
        "nome": "Parâmetros do Sistema"
      },
      {
        "grupo": null,
        "nome": "Parâmetros para Etiquetas"
      },
      {
        "grupo": null,
        "nome": "Parâmetros Contábeis"
      },
      {
        "grupo": null,
        "nome": "Consultas Avançadas"
      }
    ],
    "responsavel": "HPRO"
  },
  {
    "fase": "IMPORTAÇÃO DE DADOS",
    "itens": [
      {
        "grupo": null,
        "nome": "Cadastro Materiais/Pessoas"
      }
    ],
    "responsavel": "HPRO"
  },
  {
    "fase": "CADASTROS - PESSOAS",
    "itens": [
      {
        "grupo": null,
        "nome": "Manutenção"
      },
      {
        "grupo": null,
        "nome": "Consulta Geral"
      },
      {
        "grupo": null,
        "nome": "Mala Direta"
      },
      {
        "grupo": null,
        "nome": "Grupo de Pessoas"
      },
      {
        "grupo": null,
        "nome": "Cargos"
      },
      {
        "grupo": null,
        "nome": "Cidades"
      },
      {
        "grupo": null,
        "nome": "Países"
      },
      {
        "grupo": null,
        "nome": "Ramos de Atividade"
      },
      {
        "grupo": null,
        "nome": "Região de Vendas"
      },
      {
        "grupo": null,
        "nome": "Segmento de Mercado"
      }
    ],
    "responsavel": "CLIENTE"
  },
  {
    "fase": "CADASTROS - MATERIAIS",
    "itens": [
      {
        "grupo": null,
        "nome": "Manutenção"
      },
      {
        "grupo": null,
        "nome": "Consulta Geral"
      },
      {
        "grupo": null,
        "nome": "Configuração"
      },
      {
        "grupo": null,
        "nome": "Fornecedores"
      },
      {
        "grupo": null,
        "nome": "Fabricantes"
      },
      {
        "grupo": null,
        "nome": "Grupo de Materiais"
      },
      {
        "grupo": null,
        "nome": "Marcas"
      },
      {
        "grupo": null,
        "nome": "Sub-Grupos"
      },
      {
        "grupo": null,
        "nome": "Unidades de Medida"
      }
    ],
    "responsavel": "CLIENTE"
  },
  {
    "fase": "FISCAL",
    "itens": [
      {
        "grupo": null,
        "nome": "Grupo Tributário"
      },
      {
        "grupo": null,
        "nome": "CFOP"
      },
      {
        "grupo": null,
        "nome": "Códigos Fiscais"
      },
      {
        "grupo": null,
        "nome": "Empresas"
      },
      {
        "grupo": null,
        "nome": "Estados"
      },
      {
        "grupo": null,
        "nome": "Parâmetros Fiscais - ICMS"
      },
      {
        "grupo": null,
        "nome": "Parâmetros Fiscais - PIS/COFINS"
      },
      {
        "grupo": null,
        "nome": "Parâmetros Fiscais - ICM / ST"
      },
      {
        "grupo": null,
        "nome": "Classificação Tributária"
      },
      {
        "grupo": null,
        "nome": "Contadores"
      },
      {
        "grupo": null,
        "nome": "Natureza de Rendimento"
      },
      {
        "grupo": null,
        "nome": "Associação de ICMS"
      },
      {
        "grupo": null,
        "nome": "Benefícios Fiscais"
      },
      {
        "grupo": null,
        "nome": "Mensagem para NF-e"
      },
      {
        "grupo": null,
        "nome": "Natureza de Operação"
      },
      {
        "grupo": null,
        "nome": "Número ONU"
      },
      {
        "grupo": null,
        "nome": "Tipos de Serviços"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "SUPRIMENTOS",
    "itens": [
      {
        "grupo": null,
        "nome": "Requisição de Compra"
      },
      {
        "grupo": null,
        "nome": "Cotação"
      },
      {
        "grupo": null,
        "nome": "Pedido de Compra"
      },
      {
        "grupo": null,
        "nome": "Nota de Terceiros"
      },
      {
        "grupo": null,
        "nome": "Análise de custos"
      },
      {
        "grupo": null,
        "nome": "Importação"
      },
      {
        "grupo": null,
        "nome": "Saldos"
      },
      {
        "grupo": null,
        "nome": "Análise Fornecedores"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "ESTOQUE",
    "itens": [
      {
        "grupo": null,
        "nome": "Posição de estoque/Consultas"
      },
      {
        "grupo": null,
        "nome": "Controle Lotes"
      },
      {
        "grupo": null,
        "nome": "Requisição"
      },
      {
        "grupo": null,
        "nome": "Lanç.Manuais/Transfer./Reserva"
      },
      {
        "grupo": null,
        "nome": "Gerencial/Diversos"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "VENDAS",
    "itens": [
      {
        "grupo": "CADASTROS",
        "nome": "Comissões - Descontos"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Comissões - Regras"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Equipe de Vendas"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Observações"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Pacotes"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Tabelas de Preços"
      },
      {
        "grupo": "ORÇAMENTO",
        "nome": "Manutenção"
      },
      {
        "grupo": "ORÇAMENTO",
        "nome": "Aprovação"
      },
      {
        "grupo": "ORÇAMENTO",
        "nome": "Consultas/Históricos"
      },
      {
        "grupo": "PEDIDOS DE VENDAS",
        "nome": "Manutenção"
      },
      {
        "grupo": "PEDIDOS DE VENDAS",
        "nome": "Carteira"
      },
      {
        "grupo": "PEDIDOS DE VENDAS",
        "nome": "Consultas/Históricos"
      },
      {
        "grupo": "PEDIDOS DE VENDAS",
        "nome": "Entregas Pendentes"
      },
      {
        "grupo": "PEDIDOS DE VENDAS",
        "nome": "Liberação/Transferência"
      },
      {
        "grupo": "PEDIDOS DE VENDAS",
        "nome": "Faturamento"
      },
      {
        "grupo": "GERAL",
        "nome": "Romaneio"
      },
      {
        "grupo": "GERAL",
        "nome": "Ordem de Serviço"
      },
      {
        "grupo": "GERAL",
        "nome": "Contrato"
      },
      {
        "grupo": "GERAL",
        "nome": "Vendas Balcão / Entregas"
      },
      {
        "grupo": "GERAL",
        "nome": "Meta de Vendas"
      },
      {
        "grupo": "GERAL",
        "nome": "Devolução"
      },
      {
        "grupo": "GERAL",
        "nome": "Referência"
      },
      {
        "grupo": "GERAL",
        "nome": "Tabela de Preço / Form.de Preço"
      },
      {
        "grupo": "GERAL",
        "nome": "Gerar Orçamentos"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "FATURAMENTO",
    "itens": [
      {
        "grupo": "MATERIAIS",
        "nome": "Manutenção"
      },
      {
        "grupo": "MATERIAIS",
        "nome": "Histórico"
      },
      {
        "grupo": "MATERIAIS",
        "nome": "Consultas"
      },
      {
        "grupo": "SERVIÇOS",
        "nome": "Manutenção"
      },
      {
        "grupo": "SERVIÇOS",
        "nome": "Histórico"
      },
      {
        "grupo": "EXPEDIÇÃO",
        "nome": "Manutenção"
      },
      {
        "grupo": "EXPEDIÇÃO",
        "nome": "Histórico"
      },
      {
        "grupo": "FATURAS",
        "nome": "Manutenção"
      },
      {
        "grupo": "FATURAS",
        "nome": "Histórico"
      },
      {
        "grupo": "MANIFESTO",
        "nome": "Manutenção"
      },
      {
        "grupo": "MANIFESTO",
        "nome": "Histórico"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "FINANCEIRO",
    "itens": [
      {
        "grupo": "CADASTROS",
        "nome": "Banco"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Contas Bancárias"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Classificação Financeira"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Departamento"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Rateios Financeiros"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Condição de Pagamento"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Feriados"
      },
      {
        "grupo": "CADASTROS",
        "nome": "Formas de Pagamento"
      },
      {
        "grupo": "FINANCEIRO - FINANÇAS",
        "nome": "Controle de Caixa"
      },
      {
        "grupo": "PAGAR",
        "nome": "Inclusão/Consultas/Históricos"
      },
      {
        "grupo": "PAGAR",
        "nome": "Comissão"
      },
      {
        "grupo": "PAGAR",
        "nome": "Cons. Contábel/Ficha Fornecedor"
      },
      {
        "grupo": "PAGAR",
        "nome": "Cancelamentos"
      },
      {
        "grupo": "PAGAR",
        "nome": "Pagamento Eletrônico"
      },
      {
        "grupo": "RECEBER",
        "nome": "Inclusão/Consultas/Históricos"
      },
      {
        "grupo": "RECEBER",
        "nome": "Desconto Títulos"
      },
      {
        "grupo": "RECEBER",
        "nome": "Consulta Contábil/Ficha Cliente"
      },
      {
        "grupo": "RECEBER",
        "nome": "Cancelamentos"
      },
      {
        "grupo": "RECEBER",
        "nome": "Conta Corrente"
      },
      {
        "grupo": "RECEBER",
        "nome": "Recibos Promissórias/Cheques"
      },
      {
        "grupo": "RECEBER",
        "nome": "Bancário"
      },
      {
        "grupo": "RECEBER",
        "nome": "Cobrança Bancária"
      },
      {
        "grupo": "RECEBER",
        "nome": "Fluxo de Caixa"
      },
      {
        "grupo": "RECEBER",
        "nome": "Planilha Orçamentária"
      },
      {
        "grupo": "RECEBER",
        "nome": "Capital"
      },
      {
        "grupo": "RECEBER",
        "nome": "Arquivo Contábil"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "PRODUÇÃO",
    "itens": [
      {
        "grupo": null,
        "nome": "Cadastros acessórios"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Manutenção"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Replanejamento"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Mapa Produção"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Estoque Valorizado"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Remessa Industrialização"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Retorno Mercadorias"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Históricos"
      },
      {
        "grupo": "ORDEM DE PRODUÇÃO",
        "nome": "Solicitações"
      },
      {
        "grupo": "APONTAMENTOS",
        "nome": "Manutenção"
      },
      {
        "grupo": "APONTAMENTOS",
        "nome": "Lançamentos"
      },
      {
        "grupo": "APONTAMENTOS",
        "nome": "Históricos"
      },
      {
        "grupo": "APONTAMENTOS",
        "nome": "Motivos Paradas"
      },
      {
        "grupo": "PLANEJAMENTO",
        "nome": "Análise MP"
      },
      {
        "grupo": "PLANEJAMENTO",
        "nome": "Elaboração PCP"
      },
      {
        "grupo": "PLANEJAMENTO",
        "nome": "Lotes"
      },
      {
        "grupo": "PLANEJAMENTO",
        "nome": "Custo"
      },
      {
        "grupo": "ENGENHARIA",
        "nome": "Esturuta"
      },
      {
        "grupo": "ENGENHARIA",
        "nome": "Cadastro Desenhos"
      },
      {
        "grupo": "ENGENHARIA",
        "nome": "Consultas"
      },
      {
        "grupo": "ENGENHARIA",
        "nome": "Análise Custos"
      },
      {
        "grupo": "LABORATÓRIO",
        "nome": "PA / MP"
      },
      {
        "grupo": "LABORATÓRIO",
        "nome": "Cadastro"
      },
      {
        "grupo": "QUALIDADE",
        "nome": "Relatório Inspeção"
      },
      {
        "grupo": "QUALIDADE",
        "nome": "RNC"
      },
      {
        "grupo": "FUNDIÇÃO",
        "nome": "Boletim Forno"
      },
      {
        "grupo": "FUNDIÇÃO",
        "nome": "Ligas"
      },
      {
        "grupo": "FUNDIÇÃO",
        "nome": "Diversos"
      }
    ],
    "responsavel": "HPRO/CLIENTE"
  },
  {
    "fase": "GO LIVE",
    "itens": [{ "grupo": null, "nome": "Go Live" }],
    "responsavel": "HPRO/CLIENTE"
  }
];

export const TOTAL_ITENS_MODELO = TEMPLATE_FASES.reduce((s, f) => s + f.itens.length, 0);

export const PONDERACOES = [
  "Todo o andamento do processo de implantação será registrado neste diário de bordo.",
  "O cliente receberá a versão do diário de bordo após cada sessão de treinamento.",
  "O cliente deverá ler atentamente as tarefas registradas e cumpri-las nos prazos acordados.",
  "O cliente poderá questionar qualquer ponto registrado até a próxima sessão.",
  "A quantidade de horas alocadas segue o contrato de implantação.",
];
