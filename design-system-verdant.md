# VERDANT — Design System

> **Financial Intelligence Platform**
>
> Uma plataforma de inteligência financeira com estética premium, inspirada na linguagem visual do Supabase, na precisão do Linear e na densidade informacional de terminais financeiros modernos.

---

## 1. Visão e identidade visual

### Conceito

O Verdant é um design system para uma plataforma de controle financeiro pessoal, análise patrimonial e acompanhamento de investimentos.

A identidade visual combina:

- **Dark-first:** interface escura como padrão.
- **Emerald signal:** verde vibrante como assinatura visual.
- **Precision over decoration:** cada elemento deve comunicar informação ou facilitar uma ação.
- **Data-dense, not cluttered:** grande quantidade de dados com hierarquia visual clara.
- **Technical elegance:** estética profissional, minimalista e tecnológica.
- **Financial clarity:** valores, variações e indicadores devem ser compreendidos rapidamente.

### Referências estéticas

- Supabase: paleta verde, superfícies escuras e identidade técnica.
- Linear: minimalismo, hierarquia visual e acabamento refinado.
- Terminais financeiros: densidade de dados, precisão numérica e visualização analítica.

A interface deve ter identidade própria, utilizando essas referências como inspiração, sem reproduzir diretamente a interface de outro produto.

### Princípio fundamental

**A interface deve parecer uma ferramenta profissional de inteligência financeira, não um dashboard bancário genérico.**

---

## 2. Paleta de cores

### 2.1. Cores principais

| Token | Hexadecimal | Aplicação |
|---|---|---|
| `background` | `#0B0F0E` | Fundo global |
| `surface` | `#111714` | Cards, painéis e containers |
| `surface-elevated` | `#1B2620` | Menus, dropdowns e superfícies elevadas |
| `border` | `#26312B` | Bordas e divisores |
| `primary` | `#3ECF8E` | Ações principais e destaque visual |
| `primary-hover` | `#50D9A0` | Hover de elementos primários |
| `primary-foreground` | `#07120D` | Texto sobre fundo verde |
| `text-primary` | `#F0F5F2` | Títulos, valores e conteúdo principal |
| `text-secondary` | `#94A69C` | Descrições, labels e metadados |
| `text-muted` | `#607269` | Informações de baixa prioridade |

### 2.2. Cores semânticas

| Token | Hexadecimal | Significado |
|---|---|---|
| `success` | `#3ECF8E` | Crescimento, sucesso e estados positivos |
| `danger` | `#F87171` | Perdas, erros e estados negativos |
| `warning` | `#FBBF24` | Alertas, vencimentos e atenção necessária |
| `info` | `#60A5FA` | Informações neutras e estados informativos |

### 2.3. Regras de utilização

- O verde é reservado para ações importantes, seleção ativa, crescimento e estados positivos.
- O vermelho representa perdas, saídas financeiras, erros e estados negativos.
- O amarelo destaca alertas e situações que exigem atenção.
- O azul comunica informações neutras ou auxiliares.
- O texto principal deve apresentar contraste elevado em relação ao fundo.
- Textos secundários devem continuar legíveis, mesmo em telas de baixa qualidade.
- Não utilizar cores como único meio de comunicação de um estado: combinar cor, texto, ícones e sinais.
- Evitar gradientes intensos, cores neon excessivas e sombras coloridas.

---

## 3. Tipografia

### 3.1. Fontes

**Inter**
- Títulos.
- Textos de interface.
- Botões e formulários.
- Labels e descrições.
- Conteúdo geral.

**JetBrains Mono**
- Valores financeiros.
- Percentuais e variações.
- Cotações e indicadores.
- Identificadores técnicos.
- Dados numéricos em tabelas.

As fontes devem ser preferencialmente auto-hospedadas por meio de `@fontsource`.

### 3.2. Escala tipográfica

| Token | Tamanho | Aplicação |
|---|---:|---|
| `text-xs` | 12 px | Labels, metadados e informações auxiliares |
| `text-sm` | 14 px | Descrições e textos secundários |
| `text-base` | 16 px | Conteúdo principal |
| `text-lg` | 18 px | Títulos de cards |
| `text-xl` | 20 px | Subtítulos |
| `text-2xl` | 24 px | Cabeçalhos de seção |
| `text-3xl` | 30 px | Métricas importantes |
| `text-4xl` | 36 px | Patrimônio total e indicadores de destaque |

### 3.3. Regras tipográficas

- Priorizar legibilidade e hierarquia visual.
- Utilizar pesos de fonte com moderação.
- Aplicar números tabulares para alinhar valores financeiros.
- Evitar textos extensos em letras maiúsculas.
- Usar labels curtos e objetivos.
- Manter unidades monetárias e percentuais consistentes.

---

## 4. Layout e espaçamento

### 4.1. Grid

- Desktop: grid de 12 colunas.
- Tablet: grid adaptável de 6 a 8 colunas.
- Mobile: grid de 4 colunas ou layout de uma coluna.
- Sidebar fixa no desktop.
- Sidebar convertida em drawer no mobile.
- Área principal com largura flexível e limites adequados para leitura.

### 4.2. Escala de espaçamento

| Token | Valor |
|---|---:|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-12` | 48 px |
| `space-16` | 64 px |

### 4.3. Princípios de composição

- Agrupar informações relacionadas.
- Evitar excesso de cards sem função clara.
- Utilizar alinhamento consistente entre valores e labels.
- Priorizar a informação financeira mais importante.
- Preservar espaço negativo entre seções.
- Evitar bordas, divisores e sombras desnecessários.

---

## 5. Bordas, raios e elevação

### 5.1. Border radius

| Token | Valor | Aplicação |
|---|---:|---|
| `radius-sm` | 6 px | Elementos compactos |
| `radius-md` | 8 px | Botões e inputs |
| `radius-lg` | 12 px | Cards e menus |
| `radius-xl` | 16 px | Painéis principais |

### 5.2. Bordas

- Espessura padrão: 1 px.
- Utilizar `#26312B` como borda padrão.
- Utilizar bordas mais claras apenas para foco, seleção ou estados relevantes.
- Evitar contornos fortes em todos os componentes.

### 5.3. Sombras

- Utilizar sombras discretas.
- Priorizar contraste entre superfícies em vez de sombras pronunciadas.
- Evitar efeitos de elevação exagerados.
- Reservar sombras mais perceptíveis para overlays e menus flutuantes.

### 5.4. Glassmorphism

Utilizar glassmorphism de forma seletiva, principalmente em:

- Menus flutuantes.
- Overlays.
- Popovers.
- Elementos temporários sobre gráficos.

Não utilizar transparência e blur indiscriminadamente nos cards principais, tabelas ou formulários. A legibilidade dos dados financeiros tem prioridade.

---

## 6. Componentes de interface

### 6.1. Botões

#### Primary Button

Utilização:
- Adicionar transação.
- Criar conta.
- Salvar alterações.
- Executar a ação principal de uma tela.

Características:
- Fundo verde `#3ECF8E`.
- Texto `#07120D`.
- Altura entre 36 e 44 px.
- Raio de 8 px.
- Hover com `#50D9A0`.

#### Secondary Button

Utilização:
- Exportar relatório.
- Abrir filtros.
- Executar ações secundárias.

Características:
- Fundo transparente ou superfície escura.
- Borda sutil.
- Texto principal.
- Hover com mudança discreta de superfície.

#### Ghost Button

Utilização:
- Ações auxiliares.
- Controles compactos.
- Ações em tabelas.

Características:
- Sem borda permanente.
- Fundo transparente.
- Hover discreto.
- Ícones consistentes.

### 6.2. Cards financeiros

Cada card financeiro deve conter, quando relevante:

1. Label descritivo.
2. Valor principal.
3. Variação percentual.
4. Comparação temporal.
5. Ícone auxiliar opcional.

Exemplo de estrutura:

```text
┌──────────────────────────────────┐
│ Saldo disponível             [↗] │
│                                  │
│ R$ 18.240,50                     │
│                                  │
│ +4,2% em relação ao mês passado  │
└──────────────────────────────────┘
```

Regras:
- Valores em destaque.
- Labels em texto secundário.
- Variações com cores semânticas.
- Bordas discretas.
- Evitar ícones decorativos sem função.
- Não utilizar gradientes fortes nos fundos dos cards.

### 6.3. Inputs

Características:
- Fundo escuro.
- Borda sutil.
- Altura consistente.
- Labels explícitos.
- Placeholder com contraste adequado.
- Estado de foco destacado com verde.
- Mensagens de erro próximas ao campo correspondente.

O estado de foco deve ser perceptível sem depender exclusivamente da cor.

### 6.4. Tabelas financeiras

As tabelas devem priorizar precisão, leitura e comparação.

Regras:
- Cabeçalho com texto secundário.
- Linhas divisórias discretas.
- Valores monetários alinhados à direita.
- Números tabulares.
- Datas em formato consistente.
- Hover sutil nas linhas.
- Ordenação e filtros visíveis quando disponíveis.
- Paginação para grandes conjuntos de dados.
- Estados de carregamento, erro e ausência de resultados.

### 6.5. Badges de estado

Utilizar badges para identificar:
- Transações concluídas.
- Transações pendentes.
- Pagamentos vencidos.
- Categorias.
- Status de sincronização.

Os badges devem apresentar texto legível, fundo discreto e cores semânticas adequadas.

### 6.6. Navegação

A navegação deve ser minimalista e funcional.

Características:
- Ícones Lucide.
- Labels objetivos.
- Indicador visual claro da seção ativa.
- Hover discreto.
- Tooltips em elementos icon-only.
- Menu adaptável a diferentes larguras de tela.

---

## 7. Arquitetura da plataforma

A plataforma deve ser organizada em seis áreas principais.

### 7.1. Overview

Objetivo: fornecer uma visão geral da situação financeira.

Elementos:
- Patrimônio líquido.
- Saldo disponível.
- Receitas do período.
- Despesas do período.
- Evolução patrimonial.
- Transações recentes.
- Alocação de ativos, quando aplicável.

### 7.2. Transactions

Objetivo: registrar e consultar movimentações financeiras.

Funcionalidades:
- Receitas.
- Despesas.
- Transferências.
- Categorias.
- Filtros por período.
- Busca.
- Ordenação.
- Edição e exclusão.
- Exportação de dados.

### 7.3. Analytics

Objetivo: apresentar análises e tendências.

Funcionalidades:
- Evolução de receitas e despesas.
- Comparativos mensais.
- Distribuição de gastos.
- Tendências de consumo.
- Evolução patrimonial.
- Indicadores configuráveis.

### 7.4. Accounts

Objetivo: centralizar contas e saldos.

Funcionalidades:
- Cadastro de contas.
- Saldo por conta.
- Histórico de movimentações.
- Transferências entre contas.
- Identificação da origem dos dados.
- Estado de sincronização, quando aplicável.

### 7.5. Investments

Objetivo: acompanhar ativos e patrimônio investido.

Funcionalidades:
- Lista de ativos.
- Distribuição por classe.
- Evolução da carteira.
- Rentabilidade histórica.
- Comparação entre períodos.
- Indicadores de risco, quando houver dados adequados.

Não apresentar rentabilidade passada como garantia de resultados futuros.

### 7.6. Settings

Objetivo: permitir a personalização e administração da plataforma.

Funcionalidades:
- Preferências.
- Categorias.
- Moeda.
- Formato de datas.
- Configurações de notificações.
- Integrações.
- Segurança e privacidade.

---

## 8. Dashboard principal

### 8.1. Hierarquia visual

A tela principal deve responder a três perguntas:

1. Quanto dinheiro e patrimônio tenho?
2. Para onde meu dinheiro está indo?
3. Como minha situação financeira está evoluindo?

### 8.2. Estrutura recomendada

```text
┌─────────────────────────────────────────────────────────┐
│ Sidebar │ Header: período, busca, perfil                │
├─────────┴───────────────────────────────────────────────┤
│                                                         │
│ Patrimônio líquido                                      │
│ R$ 248.590,80                 +8,42%                    │
│                                                         │
├───────────────────────┬─────────────────────────────────┤
│ Receitas              │ Despesas                        │
│ R$ 12.450             │ R$ 4.280                        │
├───────────────────────┴─────────────────────────────────┤
│                                                         │
│ Evolução patrimonial                                    │
│ Gráfico temporal                                        │
│                                                         │
├──────────────────────────┬──────────────────────────────┤
│ Transações recentes      │ Distribuição de ativos       │
│                          │                              │
└──────────────────────────┴──────────────────────────────┘
```

Os valores acima são apenas ilustrativos.

### 8.3. Header

O header deve conter:
- Título da seção.
- Seletor de período, quando relevante.
- Busca, se necessária.
- Acesso a notificações, quando aplicável.
- Perfil e configurações da conta.

### 8.4. Sidebar

A sidebar deve conter:
- Overview.
- Transactions.
- Analytics.
- Accounts.
- Investments.
- Settings.

O item ativo deve possuir contraste adequado e um indicador visual consistente com a identidade do produto.

---

## 9. Gráficos e visualização de dados

### 9.1. Estilo visual

- Linha principal verde.
- Preenchimento inferior com baixa opacidade.
- Gridlines discretas.
- Eixos com labels secundários.
- Tooltips informativos.
- Valores formatados conforme a moeda.
- Animações sutis.
- Responsividade em diferentes tamanhos de tela.

### 9.2. Tipos de gráficos

| Gráfico | Aplicação |
|---|---|
| Linha | Evolução patrimonial e temporal |
| Barras | Comparação de receitas e despesas |
| Donut | Distribuição de categorias ou ativos |
| Área | Evolução de saldos ao longo do tempo |
| Barras empilhadas | Composição de despesas ou alocação |

### 9.3. Regras de visualização

- Não adicionar efeitos 3D desnecessários.
- Evitar legendas extensas.
- Não exagerar no número de cores.
- Preservar a legibilidade dos eixos.
- Disponibilizar valores exatos em tooltips ou tabelas.
- Não depender exclusivamente da cor para distinguir séries.
- Não inventar dados ausentes nem sugerir precisão que a fonte não oferece.

---

## 10. Ícones

Biblioteca recomendada: **Lucide React**.

Diretrizes:
- Utilizar ícones com espessura de traço consistente.
- Preferir ícones reconhecíveis.
- Evitar misturar diferentes bibliotecas visuais.
- Utilizar ícones decorativos com moderação.
- Adicionar labels ou tooltips quando o significado não for evidente.

Exemplos:
- `LayoutDashboard`
- `ArrowLeftRight`
- `ChartNoAxesCombined`
- `Wallet`
- `Landmark`
- `Settings2`
- `TrendingUp`
- `TrendingDown`

---

## 11. Animações e microinterações

### 11.1. Duração

| Token | Valor |
|---|---:|
| `motion-fast` | 140 ms |
| `motion-normal` | 200 ms |
| `motion-slow` | 300 ms |

### 11.2. Aplicações

- Hover de botões.
- Transição entre estados.
- Abertura de menus.
- Feedback de ações.
- Atualização de indicadores.
- Entrada de gráficos.

### 11.3. Regras

- Animações devem melhorar a compreensão.
- Evitar movimentos constantes sem finalidade.
- Não atrasar interações importantes.
- Respeitar `prefers-reduced-motion`.
- Evitar contagens animadas que dificultem a leitura de valores atualizados.

---

## 12. Responsividade

### Desktop

- Sidebar persistente.
- Grid de múltiplas colunas.
- Tabelas com colunas completas.
- Cards financeiros lado a lado.

### Tablet

- Sidebar compacta ou recolhível.
- Redução do número de colunas.
- Gráficos redimensionados.
- Tabelas com rolagem horizontal quando necessária.

### Mobile

- Navegação em drawer ou menu compacto.
- Cards empilhados.
- Valores financeiros com destaque.
- Filtros acessíveis.
- Formulários adaptados ao toque.
- Tabelas substituídas por listas ou mantidas com rolagem controlada, conforme a necessidade.

A interface deve continuar funcional sem exigir que o usuário dependa de hover para descobrir ações importantes.

---

## 13. Acessibilidade e estados da interface

### 13.1. Acessibilidade

- Garantir contraste adequado entre texto e fundo.
- Utilizar elementos semânticos.
- Manter navegação por teclado.
- Exibir indicadores de foco visíveis.
- Associar labels aos campos.
- Comunicar erros com mensagens claras.
- Utilizar alvos de toque adequados.
- Respeitar preferências de movimento reduzido.

### 13.2. Estados obrigatórios

Todo componente que depende de dados deve prever:

- Loading.
- Success.
- Error.
- Empty state.
- Disabled.
- Focus.
- Hover.
- Selected.

### 13.3. Estados de dados financeiros

A interface deve distinguir claramente:
- Valor igual a zero.
- Dado ainda não carregado.
- Dado indisponível.
- Transação pendente.
- Valor estimado.
- Valor confirmado.

Esses estados não devem ser representados apenas com cores.

---

## 14. Stack tecnológica recomendada

| Tecnologia | Responsabilidade |
|---|---|
| Next.js | Estrutura da aplicação |
| React | Componentização |
| TypeScript | Tipagem e segurança de código |
| Tailwind CSS | Estilização |
| shadcn/ui | Componentes personalizáveis |
| Radix UI | Primitivos acessíveis |
| Lucide React | Ícones |
| Recharts | Gráficos financeiros |
| Inter | Tipografia principal |
| JetBrains Mono | Dados numéricos |
| CSS Variables | Tokens de design |

As bibliotecas podem ser substituídas conforme as necessidades do projeto, desde que a identidade visual e os padrões de interação permaneçam consistentes.

---

## 15. Tokens CSS

```css
:root {
  color-scheme: dark;

  /* Backgrounds */
  --background: #0B0F0E;
  --surface: #111714;
  --surface-elevated: #1B2620;
  --border: #26312B;

  /* Brand */
  --primary: #3ECF8E;
  --primary-hover: #50D9A0;
  --primary-foreground: #07120D;

  /* Text */
  --text-primary: #F0F5F2;
  --text-secondary: #94A69C;
  --text-muted: #607269;

  /* Semantic */
  --success: #3ECF8E;
  --danger: #F87171;
  --warning: #FBBF24;
  --info: #60A5FA;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Motion */
  --motion-fast: 140ms;
  --motion-normal: 200ms;
  --motion-slow: 300ms;
}
```

---

## 16. Checklist de implementação

### Fundação
- [ ] Configurar as fontes.
- [ ] Definir os tokens de cores.
- [ ] Configurar tipografia e espaçamento.
- [ ] Definir raios, bordas e estados.
- [ ] Implementar o tema escuro.

### Componentes
- [ ] Botões.
- [ ] Inputs.
- [ ] Selects.
- [ ] Cards financeiros.
- [ ] Badges.
- [ ] Tabelas.
- [ ] Menus.
- [ ] Modais.
- [ ] Tooltips.
- [ ] Skeletons e estados vazios.

### Produto
- [ ] Sidebar e header.
- [ ] Dashboard principal.
- [ ] Gestão de transações.
- [ ] Analytics.
- [ ] Contas.
- [ ] Investimentos, se aplicável.
- [ ] Configurações.

### Qualidade
- [ ] Responsividade.
- [ ] Acessibilidade.
- [ ] Formatação de moeda e datas.
- [ ] Estados de loading e erro.
- [ ] Contraste.
- [ ] Navegação por teclado.
- [ ] Testes dos componentes principais.

---

## 17. Direção final

O Verdant deve transmitir três atributos:

1. **Confiança:** dados legíveis, estados claros e ausência de distrações.
2. **Inteligência:** visualizações úteis, métricas relevantes e hierarquia informacional.
3. **Sofisticação:** estética dark, verde característico, superfícies sutis e acabamento consistente.

O verde deve funcionar como assinatura visual, não como decoração. A interface precisa priorizar dados confiáveis, clareza financeira, consistência e facilidade de uso.

**Princípio de design:** cada elemento deve justificar sua presença na interface.
