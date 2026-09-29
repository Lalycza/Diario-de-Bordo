# Sistema de Gestão de Projetos de Implantação

Aplicativo com login para a equipe acompanhar implantações de vários clientes, com cronograma, painel de módulos homologados e diário de bordo dos treinamentos.

## Acesso

- Tela de entrada com e-mail e senha, além de entrada com Google.
- Cada pessoa tem um perfil com nome, usado para mostrar quem criou cada registro.
- Todo o conteúdo do sistema fica visível apenas para quem estiver conectado.

## Estrutura de telas

1. **Projetos** (página inicial após entrar)
   - Lista de projetos/clientes com nome do cliente, responsável, data de início, previsão de conclusão e um indicador de progresso.
   - Criar, editar e arquivar projetos.

2. **Cronograma do projeto**
   - Etapas com nome, descrição, responsável, data de início, data prevista de término, data real de conclusão e status (Não iniciada, Em andamento, Concluída, Atrasada, Em risco).
   - Ordenação por data, marcação rápida de conclusão e destaque visual para etapas atrasadas.
   - Resumo no topo: total de etapas, concluídas, atrasadas e percentual concluído.

3. **Painel de módulos homologados**
   - Tabela com filtros por status, responsável e busca por nome.
   - Colunas: módulo, área/categoria, responsável do cliente, responsável Hpro, status (Pendente, Em configuração, Em teste, Homologado, Bloqueado), data de homologação e observações.
   - Cartões de contagem por status acima da tabela.

4. **Diário de bordo**
   - Registros por sessão de treinamento com: data e horário da reunião, participantes, pauta do dia, tarefa do cliente, tarefa Hpro, data do próximo treinamento e observações/ocorrências.
   - Lista em ordem cronológica inversa, com abertura do registro completo, edição e exclusão.
   - Filtro por período e busca no conteúdo.

## Dados e comportamento

- Banco de dados na nuvem Lovable com tabelas para perfis, projetos, etapas do cronograma, módulos e registros do diário.
- Regras de acesso: leitura e escrita apenas para usuários conectados; cada registro guarda autor e data de criação.
- Status de etapa "Atrasada" calculado a partir da data prevista quando não houver conclusão.
- Alguns projetos e registros de exemplo já vêm carregados para a primeira visualização.

## Visual

- Estilo painel corporativo claro, tipografia objetiva, cores de status consistentes entre as três áreas (verde concluído/homologado, âmbar em andamento, vermelho atrasado/bloqueado, cinza pendente).
- Navegação lateral entre Projetos, Cronograma, Módulos e Diário, com o projeto selecionado sempre visível no topo.
