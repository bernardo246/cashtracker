# Design System Unificado --- Clínica Medical Sports × Locomotive

> **Objetivo:** unir a identidade clínico-premium da Clínica Medical
> Sports com princípios de direção de arte, tipografia em escala,
> composição editorial e movimento inspirados no site da Locomotive:
> https://locomotive.ca/en.
>
> **Nota de método:** a parte Medical Sports vem do documento de
> referência fornecido, baseado em CSS computado e observações da
> página. A parte Locomotive é uma análise visual e funcional do site
> público, não uma extração integral de CSS interno. Os tokens propostos
> para a fusão são decisões de design, não valores oficiais da
> Locomotive.

------------------------------------------------------------------------

## 1. Conceito visual

### Direção

**Clínico-premium, editorial, atlético e digitalmente imersivo.**

Preservar da Medical Sports: - Alto contraste preto e branco. -
Aparência séria, confiável e ligada à saúde e performance. - Fotografia
real de profissionais, atletas, clínica e equipamentos. - CTA em formato
de pílula. - Conteúdo direto e organizado.

Adicionar da linguagem visual observada na Locomotive: - Tipografia
grande e expressiva, usada como elemento gráfico. - Composições
editoriais assimétricas e layouts que mudam entre seções. - Transições
de scroll coordenadas, com entradas e saídas intencionais. - Uso de
mídia em escala ampla, com imagens ou vídeos ocupando boa parte da
viewport. - Poucos elementos por cena, com foco visual bem definido. -
Acentos de cor usados com moderação. - Movimento com personalidade, sem
animar tudo ao mesmo tempo.

### Resultado desejado

Uma clínica de saúde e performance com aparência premium, contemporânea
e memorável --- sem parecer um template genérico, um site de agência
criativa ou uma interface de entretenimento. A linguagem visual deve
continuar transmitindo confiança médica, clareza e acessibilidade.

------------------------------------------------------------------------

## 2. Princípios de design

1.  **Clareza médica primeiro:** informação sobre serviços,
    especialidades e agendamento deve continuar fácil de encontrar.
2.  **Uma ideia principal por cena:** cada viewport deve ter uma
    mensagem ou foco visual dominante.
3.  **Tipografia como composição:** títulos podem ocupar grandes áreas,
    mas nunca prejudicar a leitura.
4.  **Movimento com propósito:** animações explicam, conectam ou
    destacam conteúdo.
5.  **Ritmo por contraste:** alternar superfícies escuras e claras,
    cenas densas e momentos de respiro.
6.  **Fotografia autêntica:** priorizar imagens reais e relevantes da
    clínica, equipe e práticas esportivas.
7.  **Continuidade espacial:** usar elementos de fundo, mídia ou
    grafismos que conectem seções.
8.  **Acessibilidade e confiança:** manter contraste, navegação
    previsível, conteúdo legível e movimento reduzível.

------------------------------------------------------------------------

## 3. Paleta de cores

### Tokens-base preservados da Medical Sports

  ---------------------------------------------------------------------------
  Token                       Valor                   Uso
  --------------------------- ----------------------- -----------------------
  `--color-black`             `#000000`               Seções escuras e fundos
                                                      principais

  `--color-black-hover`       `#141414`               Hover em superfícies
                                                      escuras

  `--color-text-dark`         `#242424`               Texto principal em
                                                      superfícies claras

  `--color-text-dark-hover`   `#4A4A4A`               Hover ou texto
                                                      secundário escuro

  `--color-navy`              `#212A40`               Acento institucional,
                                                      fundos alternativos

  `--color-navy-hover`        `#3B4B72`               Estados interativos do
                                                      azul-marinho

  `--color-white`             `#FFFFFF`               Fundo principal e texto
                                                      sobre preto

  `--color-gray-light`        `#E1E2E4`               Rodapé, divisórias e
                                                      superfícies suaves

  `--color-gray-pale`         `#F7F7F7`               Texto sobre fundo
                                                      escuro e superfícies
                                                      claras

  `--color-muted`             `#F0F3F5`               Texto secundário e
                                                      elementos discretos

  `--color-warm-black`        `#231F20`               Texto de navegação em
                                                      superfícies claras

  `--color-blue-gray`         `#A3BAC6`               Acento secundário
                                                      discreto

  `--color-blue-gray-hover`   `#7597A9`               Hover do acento
                                                      azul-acinzentado

  `--color-blue`              `#4D7BCA`               Links e destaques
                                                      interativos

  `--color-blue-hover`        `#2F579D`               Hover de links e botões
                                                      azuis

  `--color-success`           `#22C55E`               Confirmações e estados
                                                      positivos

  `--color-neutral-dark`      `#111827`               Texto ou superfícies de
                                                      apoio

  `--color-neutral-medium`    `#6B7280`               Texto secundário em
                                                      superfícies claras
  ---------------------------------------------------------------------------

### Acento editorial inspirado na Locomotive

O site da Locomotive utiliza uma linguagem visual de alto contraste com
acentos fortes. Para esta fusão, **não substituir a paleta institucional
da clínica por uma cor de agência**. Usar um acento editorial quente
apenas em pequenos detalhes de motion, indicadores de capítulo ou links
destacados.

  ----------------------------------------------------------------------------------
  Token proposto                     Valor                   Uso recomendado
  ---------------------------------- ----------------------- -----------------------
  `--color-editorial-accent`         `#D83018`               Acento opcional para
                                                             pequenos indicadores e
                                                             detalhes gráficos

  `--color-editorial-accent-hover`   `#B92714`               Estado hover desse
                                                             acento
  ----------------------------------------------------------------------------------

Esses valores são uma proposta de adaptação visual, não tokens oficiais
garantidos da Locomotive. Validar com a identidade da clínica antes de
adotá-los. Se a marca precisar de uma aparência estritamente médica,
usar `--color-blue` como único acento.

### Proporção sugerida

-   60--70%: branco, preto e tons neutros.
-   20--30%: fotografia e vídeo.
-   Até 5%: acentos azulados ou acento editorial.

Não usar todas as cores ao mesmo tempo. O acento editorial deve ser
raro.

### Regras de contraste

-   Texto claro em fundo preto: `#FFFFFF` ou `#F7F7F7`.
-   Texto escuro em fundo branco: `#242424`.
-   Não colocar texto pequeno sobre fotografia complexa sem camada de
    contraste.
-   Verificar contraste de todos os estados de hover, foco e animação.

------------------------------------------------------------------------

## 4. Tipografia

### Direção tipográfica

Combinar a clareza clínica da Medical Sports com o uso expressivo de
escala observado na Locomotive.

### Sistema tipográfico recomendado

O arquivo original registra Mako para títulos/menu e Raleway para corpo
e botões. Para preservar a identidade existente, manter essas fontes
caso já estejam aprovadas pela marca. Se houver liberdade para
modernizar, testar o seguinte sistema:

  -----------------------------------------------------------------------
  Função            Fonte proposta    Peso              Aplicação
  ----------------- ----------------- ----------------- -----------------
  Display / títulos Space Grotesk ou  500--700          Hero, títulos de
  de impacto        a fonte display                     capítulos e
                    institucional                       números grandes
                    existente                           

  Títulos de seção  Mako ou Space     400--600          H2 e H3
                    Grotesk                             

  Corpo e navegação Raleway ou Inter  400--500          Parágrafos, menus
                                                        e descrições

  Botões            Raleway ou Inter  700--800          CTA e ações
                                                        principais

  Dados e           JetBrains Mono,   400--500          Indicadores de
  microdetalhes     com parcimônia                      capítulo, números
                                                        e pequenos
                                                        rótulos
  -----------------------------------------------------------------------

**Não carregar fontes redundantes sem necessidade.** Escolher uma fonte
de display, uma fonte de leitura e, se fizer sentido, uma monoespaçada
para microdetalhes. Usar fontes self-hosted quando o projeto exigir esse
padrão.

### Escala fluida sugerida

Os valores abaixo são uma proposta para desktop e mobile; o documento de
referência Medical Sports mede principalmente um viewport estreito,
então não representa uma escala completa de desktop.

  -------------------------------------------------------------------------------
  Token                   Escala sugerida                 Uso
  ----------------------- ------------------------------- -----------------------
  `--text-xs`             `0.75rem`                       Metadados

  `--text-sm`             `0.875rem`                      Navegação e legendas

  `--text-base`           `1rem`--`1.125rem`              Corpo

  `--text-lg`             `1.25rem`--`1.5rem`             Destaques e subtítulos

  `--text-h3`             `clamp(1.75rem, 3vw, 3rem)`     Títulos secundários

  `--text-h2`             `clamp(2.25rem, 5vw, 4.5rem)`   Títulos de seção

  `--text-display`        `clamp(3rem, 8vw, 7.5rem)`      Hero e frases
                                                          editoriais
  -------------------------------------------------------------------------------

-   Line-height dos títulos: aproximadamente `0.95–1.1`.
-   Line-height do corpo: `1.45–1.7`.
-   Usar letter-spacing negativo apenas em títulos grandes, se a fonte
    permitir.
-   Evitar caixa alta em parágrafos longos.
-   Manter o eyebrow em caixa alta, com tamanho menor e peso regular.

Exemplo de eyebrow: `SAÚDE, MOVIMENTO E PERFORMANCE`.

------------------------------------------------------------------------

## 5. Layout, grid e ritmo

### Largura e alinhamento

-   Seções de largura total.
-   Conteúdo interno limitado por um container responsivo.
-   Grid de 12 colunas no desktop quando necessário; uma coluna
    principal em telas pequenas.
-   Composições assimétricas nas seções editoriais, sem sacrificar a
    clareza.
-   Margens laterais fluidas com `clamp()`.
-   Espaçamento vertical amplo entre capítulos.

### Ritmo

Preservar a alternância preto → branco → preto do site Medical Sports,
mas permitir transições mais expressivas: - Uma seção pode começar com
texto em destaque e terminar com mídia em tela ampla. - Uma imagem pode
ocupar grande parte da viewport enquanto uma legenda permanece alinhada
a uma coluna. - Um título pode atravessar mais de uma coluna. - Uma
seção de informação médica pode voltar a uma composição simples e clara
depois de uma cena animada.

Não transformar todas as seções em experiências complexas. Usar o
scrollytelling nos momentos que merecem destaque.

### Espaçamento

Preservar os tokens existentes como base e expandir para uma escala
coerente:

``` css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
  --space-32: 8rem;

  --container-max: 80rem;
  --page-gutter: clamp(1.25rem, 4vw, 4rem);
}
```

Os valores são uma escala proposta para o novo sistema; não substituem
automaticamente o espaçamento observado na página original.

------------------------------------------------------------------------

## 6. Tokens de borda, raio e sombra

Preservar os raios e sombras da Medical Sports para os componentes
funcionais.

``` css
:root {
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-pill: 100px;

  --border-subtle: 1px solid #F0F3F5;

  --shadow-sm: 0 2px 5px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 10px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 11px 32px #E1E2E4;
}
```

### Uso

-   Botões CTA: formato pílula.
-   Cards de equipe: foto em destaque com recorte superior arredondado,
    caso esse padrão continue alinhado à identidade.
-   Cards informativos: cantos discretos; não usar excesso de cartões.
-   Bordas: finas e de baixo contraste.
-   Sombras: reservadas para elementos que precisam de elevação real,
    não como decoração generalizada.

A linguagem inspirada na Locomotive deve vir principalmente da
tipografia, do layout e do movimento, não de adicionar glassmorphism a
todos os componentes.

------------------------------------------------------------------------

## 7. Componentes

### Header / navegação

-   Barra clara com logo institucional.
-   Menu simples e legível.
-   Itens: Início, Protocolos, Especialidades, A Medical Sports e
    Agendar Consulta, adaptados à arquitetura real.
-   Navegação pode permanecer sticky quando ajudar a orientação.
-   Estados de foco e hover claros.
-   Em telas pequenas, menu acessível por teclado e leitor de tela.

### Hero

-   Fundo preto ou fotografia escura de profissional atendendo atleta.
-   Eyebrow curto.
-   Título grande, expressivo e responsivo.
-   Parágrafo de apoio conciso.
-   CTA principal: `AGENDAR CONSULTA`.
-   Elemento visual forte: fotografia, vídeo ou composição tipográfica.
-   Animação inicial curta e não bloqueante; conteúdo principal deve
    aparecer mesmo sem animação.

### Seções editoriais / scrollytelling

-   Títulos grandes que entram em cena conforme o scroll.
-   Imagens ou vídeos amplos.
-   Composições que mudam de seção para seção.
-   Elementos sticky apenas quando a narrativa exigir.
-   Indicadores discretos de capítulo ou progresso, se forem úteis.
-   Fundo contínuo ou transições entre preto, branco e navy, sem
    mudanças abruptas.

### Cards de médicos

-   Foto em destaque, com recorte consistente.
-   Especialidade em negrito.
-   Nome do profissional em título legível.
-   Informações reais, sem inventar qualificações.
-   Animação discreta de entrada; não esconder dados essenciais até o
    usuário rolar.

### Lista de benefícios

-   Ícone de check circular.
-   Texto claro e direto.
-   Fundo preto ou navy quando adequado.
-   Espaçamento suficiente para leitura e toque.

### Cards de programas e protocolos

-   Superfície clara sobre seção escura ou fundo branco com divisórias.
-   Títulos, duração e itens organizados de forma escaneável.
-   Não depender de animação para revelar condições ou detalhes
    importantes.
-   CTA visível para conhecer o protocolo.

### CTA

-   `border-radius: 100px`.
-   Versão primária branca com texto `#242424` em fundo escuro.
-   Versão secundária escura ou navy em fundo claro.
-   Texto direto e orientado à ação.
-   Área clicável confortável; o padding original deve ser ampliado se
    não garantir uma área de toque adequada.
-   Hover com mudança sutil de cor, escala ou deslocamento.
-   Foco de teclado claramente visível.

### Rodapé

-   Fundo cinza claro `#E1E2E4` ou branco.
-   Horário, endereço e contatos reais.
-   Contraste de texto `#242424`.
-   Links com estados de foco e hover claros.

### Banner de cookies

-   Cartão branco, raio de 8px e sombra discreta.
-   Botão azul.
-   Não deve bloquear desnecessariamente a página nem cobrir CTAs
    essenciais em dispositivos pequenos.

------------------------------------------------------------------------

## 8. Sistema de movimento e scrollytelling

### Princípio

Inspirar-se na abordagem de motion editorial da Locomotive: a rolagem
deve conduzir o ritmo e a hierarquia, enquanto a Medical Sports fornece
o tom clínico e a confiança da marca.

**Não replicar literalmente o site da Locomotive.** Aplicar os
princípios ao conteúdo, à marca e às necessidades de acessibilidade da
clínica.

### Padrões de movimento

1.  **Reveal:** título ou texto entra com opacidade e deslocamento
    vertical pequeno.
2.  **Media scale:** imagem ou vídeo cresce suavemente até ocupar a
    composição.
3.  **Pinned content:** conteúdo visual permanece temporariamente fixo
    enquanto a explicação avança, apenas quando útil.
4.  **Parallax sutil:** camadas de imagem ou grafismos deslocam-se em
    velocidades diferentes.
5.  **Chapter transition:** a cor de fundo muda entre preto, branco e
    navy por meio de uma transição controlada.
6.  **Typography shift:** uma frase ganha escala ou muda de alinhamento
    para marcar uma ideia-chave.
7.  **Progress indicator:** marcador discreto indica capítulo ou avanço
    quando isso ajudar a orientação.

### Curva e duração

Usar easing suave, sem overshoot excessivo. Uma curva de referência
possível:

``` css
:root {
  --ease-editorial: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 180ms;
  --duration-base: 350ms;
  --duration-reveal: 650ms;
}
```

Esses valores são tokens propostos, não valores oficiais da Locomotive.

### Regras

-   Não animar cada elemento.
-   Evitar scroll-jacking e rolagem artificialmente bloqueada.
-   Evitar efeitos que atrasem o acesso a informações médicas.
-   Não esconder o conteúdo essencial até que uma animação termine.
-   Garantir comportamento reversível ao rolar para cima.
-   Respeitar `prefers-reduced-motion`.
-   Usar `transform` e `opacity` para animações frequentes sempre que
    possível.
-   Evitar atualizar estado React a cada frame.

### Stack de implementação

A biblioteca de animação deve ser escolhida de acordo com o projeto
existente. Framer Motion pode ser suficiente para reveals,
transformações e scroll progress. GSAP/ScrollTrigger ou Locomotive
Scroll só devem ser adicionados se houver necessidade real e após
verificar compatibilidade, custo e complexidade.

Não instalar várias bibliotecas de scroll que resolvam o mesmo problema.
Manter uma fonte principal de controle das animações.

------------------------------------------------------------------------

## 9. Estrutura narrativa sugerida

A ordem abaixo adapta a estrutura da Medical Sports à linguagem
editorial:

1.  **Header institucional:** logo e navegação clara.
2.  **Hero:** mensagem principal sobre medicina esportiva, terapia da
    dor e fisioterapia.
3.  **Faixa de impacto:** "Seu corpo merece e necessita!" com CTA.
4.  **Equipe:** profissionais e especialidades, apresentados de forma
    clara.
5.  **Programas:** protocolos contínuos de dor, recuperação e
    performance.
6.  **Protocolos detalhados:** listas de serviços e CTA.
7.  **Especialidades:** apresentação organizada das especialidades
    médicas.
8.  **Diferenciais da clínica:** excelência, inovação, ambiente,
    equipamentos e atendimento humanizado.
9.  **CTA final:** "Pronto para cuidar da sua saúde?" com benefícios
    reais e agendamento.
10. **Rodapé:** contatos, horário e endereço.

### Como introduzir o scrollytelling

-   Hero: título em escala grande e imagem de alto impacto.
-   Faixa de impacto: transição tipográfica curta.
-   Equipe: revelar profissionais em grupos, sem esconder nomes.
-   Programas: uma composição visual persistente acompanha os tópicos,
    se isso melhorar a compreensão.
-   Diferenciais: imagem ampla com texto editorial.
-   CTA final: reduzir movimento e ruído visual para facilitar a ação.

A estrutura original contém informações lidas parcialmente pelo DOM e
não verificadas visualmente em todos os blocos. Confirmar o conteúdo
final da clínica antes de reproduzi-lo.

------------------------------------------------------------------------

## 10. Responsividade

### Desktop

-   Usar tipografia display ampla e grids assimétricos.
-   Permitir mídia em tela ampla e elementos sticky pontuais.
-   Aproveitar espaço negativo sem deixar a informação distante.

### Tablet

-   Reduzir escala tipográfica e distâncias.
-   Evitar composições que dependam de duas colunas estreitas.
-   Simplificar parallax e elementos sobrepostos.

### Mobile

-   Priorizar leitura em coluna.
-   Reduzir ou remover sticky longo e parallax pesado.
-   Manter títulos grandes, mas sem cortar conteúdo essencial.
-   Garantir CTAs confortáveis ao toque.
-   Não depender de hover.
-   Simplificar animações e mídia para preservar desempenho.

------------------------------------------------------------------------

## 11. Acessibilidade, confiança e performance

-   Respeitar `prefers-reduced-motion`.
-   Usar HTML semântico, landmarks e hierarquia correta de headings.
-   Garantir navegação por teclado e foco visível.
-   Manter contraste legível em todas as transições.
-   Fornecer texto alternativo apropriado para imagens informativas.
-   Usar imagens otimizadas e vídeos com carregamento responsável.
-   Evitar várias cenas WebGL ou efeitos pesados sem justificativa.
-   Não permitir que animações bloqueiem o agendamento.
-   Garantir que o conteúdo principal seja renderizado mesmo quando
    JavaScript ou WebGL falhar.
-   Não inventar informações clínicas, nomes, especialidades, resultados
    ou promessas de saúde.
-   Não apresentar afirmações médicas não fornecidas ou verificadas.

------------------------------------------------------------------------

## 12. CSS tokens --- proposta consolidada

``` css
:root {
  /* Marca Medical Sports */
  --color-black: #000000;
  --color-black-hover: #141414;
  --color-text-dark: #242424;
  --color-text-dark-hover: #4A4A4A;
  --color-navy: #212A40;
  --color-navy-hover: #3B4B72;
  --color-white: #FFFFFF;
  --color-gray-light: #E1E2E4;
  --color-gray-pale: #F7F7F7;
  --color-muted: #F0F3F5;
  --color-warm-black: #231F20;
  --color-blue-gray: #A3BAC6;
  --color-blue-gray-hover: #7597A9;
  --color-blue: #4D7BCA;
  --color-blue-hover: #2F579D;
  --color-success: #22C55E;
  --color-neutral-dark: #111827;
  --color-neutral-medium: #6B7280;

  /* Acento editorial opcional — validar com a marca */
  --color-editorial-accent: #D83018;
  --color-editorial-accent-hover: #B92714;

  /* Radius e sombra */
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-pill: 100px;
  --border-subtle: 1px solid #F0F3F5;
  --shadow-sm: 0 2px 5px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 10px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 11px 32px #E1E2E4;

  /* Espaçamento */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
  --space-32: 8rem;

  /* Layout */
  --container-max: 80rem;
  --page-gutter: clamp(1.25rem, 4vw, 4rem);

  /* Tipografia fluida */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-h3: clamp(1.75rem, 3vw, 3rem);
  --text-h2: clamp(2.25rem, 5vw, 4.5rem);
  --text-display: clamp(3rem, 8vw, 7.5rem);

  /* Motion */
  --ease-editorial: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 180ms;
  --duration-base: 350ms;
  --duration-reveal: 650ms;
}
```

------------------------------------------------------------------------

## 13. Diretrizes de implementação

1.  Inspecionar o projeto e preservar a arquitetura existente.
2.  Confirmar quais fontes e tokens da Medical Sports precisam ser
    mantidos por fidelidade à marca.
3.  Implementar os tokens em um ponto central, sem duplicar valores.
4.  Criar componentes reutilizáveis para CTA, títulos editoriais, mídia,
    cards de equipe e seções.
5.  Adicionar animações gradualmente, começando pelas que melhoram a
    hierarquia.
6.  Testar desktop, tablet, mobile, teclado, movimento reduzido e
    desempenho.
7.  Verificar se todas as informações e CTAs continuam acessíveis sem
    animações.
8.  Documentar tokens oficiais da marca separadamente dos tokens
    propostos para a fusão.

------------------------------------------------------------------------

## 14. Critérios de aceitação

-   A identidade da Medical Sports continua reconhecível.
-   O site tem uma linguagem editorial mais contemporânea e movimento
    sofisticado.
-   O preto, o branco e o navy continuam sendo a base visual.
-   O acento editorial não compete com a identidade médica.
-   Tipografia grande é usada com intenção e legibilidade.
-   As seções têm ritmo variado, sem perder clareza.
-   O scrollytelling conecta conteúdos em vez de ser mero enfeite.
-   A navegação, os dados médicos e o agendamento continuam fáceis de
    acessar.
-   A experiência funciona em mobile e com movimento reduzido.
-   Não há dependências ou animações redundantes.

**Princípio final:** usar a clareza e a confiança da Medical Sports como
base, e a tipografia editorial, a composição dinâmica e o motion design
da Locomotive como camada de expressão. O resultado deve parecer uma
evolução coerente da marca, não uma cópia de outro site.
