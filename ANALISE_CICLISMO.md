# Análise de código — Modelos de musculação para alunos ciclistas

> Documento **somente de análise**. Nenhum código, regra ou configuração existente foi alterado nesta etapa. Gerado a partir da leitura do repositório `personalpro-web` (frontend Next.js do Personal Pro) na branch `analise-ciclismo`.
>
> **Aviso de escopo importante**: este repositório contém apenas o **site (dashboard do personal)**. Não há neste repo nem `firestore.rules`, nem `firebase.json`, nem o app mobile do aluno — vários comentários no código (ex. `lib/firestore.js`) referenciam explicitamente um outro projeto local (`C:\Users\mathe\PersonalPro\firestore.js`) como a fonte da lógica "canônica" replicada aqui. Tudo abaixo é o que dá para confirmar a partir deste repositório; onde a resposta depende de arquivos que não existem aqui (principalmente as regras do Firestore), isso é dito explicitamente.

---

## 1. Estrutura dos modelos de treino

### 1.1 Não há `interface`/`type` formal — é JS puro (sem TypeScript)

O projeto é JavaScript puro (`.js`, ver `jsconfig.json` sem `strict`). Não existem `interfaces`/`types` declarados em lugar nenhum — a "forma" dos documentos é definida implicitamente por:
- Como os objetos são montados antes de `addDoc`/`setDoc` em `lib/firestore.js`;
- Comentários JSDoc soltos (ex. o topo de `lib/enduranceTreinos.js` documenta o formato de uma sessão de endurance).

### 1.2 Coleções do Firestore usadas em modelos/treinos

Mapeadas a partir de `lib/firestore.js` (única camada de acesso a dados do app):

| Coleção | Uso | Filtro de posse |
|---|---|---|
| `treinos` | Treinos de **musculação** (avulsos, templates da biblioteca do personal, treinos gerados pelo programa automático de 12 meses, **e também os templates globais**) | `personalId == uid` (exceto quando `global == true`, ver seção 3) |
| `modelosEndurance` | Modelos prontos salvos pelo personal para **Corrida/Ciclismo** (endurance) | `personalId == uid` — **sem opção global** |
| `treinosEndurance` | Sessões concretas de Corrida/Ciclismo atribuídas a um aluno (o "plano" do aluno) | `alunoId` + `personalId` |
| `exerciciosCustom` | Exercícios de musculação criados pelo personal, além da biblioteca estática | `personalId` (ou `global == true`) |
| `exercicioVideos` | Vídeo vinculado a um nome de exercício (ver seção 2) | `personalId` (ou `global == true`/legado) |
| `exerciciosOcultos` | Exercícios que o personal escondeu/excluiu da geração automática | `personalId` (ou `global == true`) |
| `historicoCargas` | Histórico de carga por exercício/aluno (alimentado pelo app mobile) | `alunoId` + `personalId` |
| `alunos.programaMuscular` | Metadado do programa de 12 meses atribuído (não é coleção própria, é um campo no doc do aluno) | doc `alunos/{id}` |

Não existe hoje nenhuma coleção `modelosMusculacao` própria para "modelos de musculação reutilizáveis" fora da lógica de `treinos` com `template: true` — ver 1.4.

### 1.3 Como exercícios, séries, reps e descanso são salvos hoje

Dentro de um doc `treinos`, o campo `exercicios` é um **array de objetos livres** (sem schema aplicado no código nem no Firestore). O formato usado por toda a UI (`app/dashboard/treinos/EditarTreinoClient.js`) é:

```js
{
  nome: 'Supino Reto com Barra',   // string — bate com o nome exato da BIBLIOTECA ou de exerciciosCustom
  grupo: 'Peitoral',               // string livre, copiada do grupo da biblioteca (opcional)
  series: [                        // array de "sets" — 1 objeto por série
    { reps: '10-12', carga: '', pausa: '60s' },
    { reps: '10-12', carga: '', pausa: '75s' },
  ],
  metodo: '',                      // nome de um método de METODOS (ex. 'Bi-set'), ou '' se solo
  grupoId: '',                     // ver 1.5 (agrupamento em pares/trios)
  videoUrl: null,                  // só usado pelo programa automático (12 meses); no site normal, o vídeo é resolvido via nome (seção 2)
}
```

Pontos-chave, confirmados na leitura de `EditarTreinoClient.js` (linhas ~59–87) e `lib/programaMusculacao.js` (linhas ~446–457):

- **`reps` é uma string totalmente livre**, não um número nem um range estruturado (não existe `repsMin`/`repsMax`). Isso quer dizer que **faixas como `"4-5"` e valores como `"Falha"` já funcionam hoje sem nenhuma mudança de schema** — é só o personal digitar isso no campo. Não há validação, enum ou máscara nesse input.
- **`pausa` (descanso) também é string livre** (ex. `"60s"`, `"90s"`, `"2min"`), **não é um número em segundos**. Não existe conversão para segundos em lugar nenhum do código — é puramente texto exibido/editado como texto.
- **Não existe campo dedicado para "tempo em segundos" de exercícios isométricos** (ex. prancha). No motor do programa automático (`lib/programaMusculacao.js`, função `I(...)`, linha 165), um exercício isométrico é montado com `reps: '40s'` — ou seja, o "tempo" é só um **valor textual dentro do próprio campo `reps`**, não um campo numérico separado. O mesmo vale para o construtor manual do site: não há UI nem campo para "segundos" — só o texto livre de `reps`.
- `carga` também é string livre (pode ficar vazia — o personal preenche depois, ou o aluno registra no app mobile via `historicoCargas`).
- Há uma função de fallback (`ExCard`, linhas 81–87) que migra treinos **antigos** salvos com `series` como número + `reps`/`descanso` soltos (formato anterior, não-array) para o formato atual de array de sets. Isso mostra que o schema já mudou pelo menos uma vez no passado e o código convive com as duas formas — um indício de que qualquer novo campo precisa do mesmo cuidado de retrocompatibilidade (ver seção 6).

### 1.4 O que é um "modelo/template" de musculação hoje

Não existe um tipo de documento dedicado a "modelo". Um **template** é simplesmente um doc `treinos` com a flag `template: true` e **sem `alunoId`** (biblioteca do personal) — ver `salvarTemplateTreino`, `buscarTemplatesTreinos` em `lib/firestore.js`. Quando o personal "usa" um template com um aluno, o app clona o doc para um novo doc `treinos` com `alunoId` preenchido e `template: false` (`clonarTemplateParaAlunos`). Ou seja: **modelo e treino atribuído usam exatamente o mesmo schema** — a única diferença são as flags `template`/`alunoId`/`global`.

### 1.5 Agrupamento de exercícios (bi-set/tri-set/circuito) já existe

`grupoId` (string) + `metodo` (nome de um método) já implementam agrupamento de exercícios consecutivos num "bloco" (ver `buildGrupos` em `EditarTreinoClient.js`, linhas 37–54). Métodos disponíveis hoje (`lib/treinoData.js`, `METODOS`): `Drop-set`, `Rest-pause`, `Bi-set`, `Tri-set`, `Pico de contração`, `6x20`, `FST-7`, `Giant-set`, `Cluster set`, `Circuito`. Isso é relevante para o item "agrupamento em pares (método contraste)" da seção 5 — ver detalhe lá.

### 1.6 O que a aba "Ciclismo" contém hoje

**Não existe uma aba "Ciclismo" dentro do menu de Musculação.** O que existe é a página `/dashboard/endurance` (`app/dashboard/endurance/page.js`), que é um módulo **inteiramente separado** de "Corrida/Ciclismo" (endurance), com uma variável de estado `modalidade` (`'corrida' | 'ciclismo'`) que troca o conteúdo da tela — não é uma aba de navegação dentro da ficha de musculação, é uma seção própria do sistema.

Dentro de `/dashboard/endurance`, por modalidade, o personal tem:
- **Teste inicial** (VDOT via corrida, FTP via ciclismo — `lib/enduranceZonas.js`) que calcula zonas de treino (Z1–Z5/Z7) e nível do aluno (iniciante/intermediário/avançado);
- **Modelos prontos** (`lib/enduranceModelos.js` — `MODELOS_CORRIDA`/`MODELOS_CICLISMO`, ~14 modelos cada, baseados em literatura: Daniels, Seiler, Coggan, Rønnestad, Pfitzinger, Billat);
- **Sugestão de semana** por fase de periodização (base/build/pico/taper/prova) e por tipo de prova (`criterium`/`granfondo`/`endurance` no ciclismo; `5km/10km/21km/42km` na corrida);
- **Progressão automática semana a semana** com deload a cada 4 semanas, crescimento de longão, alternância de estímulo — tudo calculado em `lib/enduranceModelos.js`, sem persistir "semana" como documento — é recalculado sob demanda a partir da data da prova;
- **Sessões concretas** salvas em `treinosEndurance` (uma por dia, com `medida: 'tempo'|'distancia'`, `valor` numérico em segundos/metros, `zona`, `detalhe` textual).

**Como Musculação, Corrida e Ciclismo se diferenciam hoje (achado central para o seu plano):**

| | Musculação | Corrida / Ciclismo (endurance) |
|---|---|---|
| Coleção do "treino" | `treinos` | `treinosEndurance` |
| Coleção de "modelo/template" | `treinos` (`template: true`) | `modelosEndurance` |
| Unidade de trabalho | exercícios com séries/reps/pausa | sessões com tempo/distância/zona |
| Periodização automática | **por mês** (1–12), sem conceito de semana (seção 4) | **por semana**, calculada a partir de semanas restantes até a prova |
| Compartilhamento global | **existe** (`global: true` em `treinos`) | **não existe** — `modelosEndurance` só filtra por `personalId` |
| Biblioteca de nomes de exercício | `BIBLIOTECA` estática (`lib/treinoData.js`, ~292 itens) + `exerciciosCustom` | `TIPOS_CORRIDA`/`TIPOS_CICLISMO` (catálogo fixo de ~10 *tipos* de treino cada, não de exercícios) |

Ou seja: **hoje, "Ciclismo" é 100% endurance (cardio) — não existe nenhum conceito de "modelo de musculação específico para ciclista" no código.** Criar isso é, na prática, decidir entre (a) estender o schema de `treinos` (musculação) com uma marcação de categoria/objetivo "ciclismo", ou (b) criar uma nova coleção de modelos musculares — ambas as opções são discutidas nas seções 5 e 6.

---

## 2. Biblioteca de vídeos de exercícios (~250)

### 2.1 A lista de nomes está no código — mas os vídeos NÃO

Há duas coisas distintas que são fácil de confundir:

1. **A lista de nomes de exercícios** (o "catálogo"): está hard-coded em `lib/treinoData.js`, export `BIBLIOTECA` — um array de 14 grupos musculares, cada um com uma lista de strings (nomes de exercício). **Contei 292 nomes de exercício** no total (bate com o "cerca de 250" mencionado — na prática já passou disso). Essa lista **não tem `id`, não tem `equipamento`, não tem vídeo** — é só `{ grupo, exercicios: [nomes...] }`.
2. **Os vídeos em si**: ficam na coleção do Firestore `exercicioVideos`, um doc por (personal × nome de exercício), com o vídeo sendo uma **URL externa** (YouTube na prática, ou qualquer link, inclusive Firebase Storage) — **não há upload de arquivo de vídeo pelo site**, só cadastro de URL (`salvarVideoExercicio`, `app/dashboard/exercicios/page.js`).

### 2.2 Como cada exercício é identificado

**Pelo nome exato (string), não por um ID estável.** O vínculo exercício ↔ vídeo é feito por **igualdade de string do campo `nome`**:
- Ao criar um vídeo (`salvarVideoExercicio`, `lib/firestore.js` linha 293), o doc-id em `exercicioVideos` é gerado como `` `${personalId}_${slug(nome)}` ``, onde `slug` é `nome.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')` (não remove acentos — um "é" vira `_`).
- Na hora de exibir o vídeo de um exercício dentro de um treino, a busca é por `nome` (`buscarVideosExercicios` retorna um mapa `{ [nome]: {videoUrl,...} }`), **não por um id compartilhado entre a biblioteca estática e a coleção de vídeos**.

**Implicação prática direta para o seu plano**: se você renomear um exercício na `BIBLIOTECA` (ou usar um nome de exercício de musculação de ciclismo com escrita ligeiramente diferente de um exercício já existente), o vínculo com o vídeo quebra silenciosamente — não há chave estrangeira nem validação de unicidade.

### 2.3 Arquivo exportado

Como a lista de nomes está no código (não no Firestore), gerei o export pedido:

**`exercicios_videos.json`** (na raiz do repo, 292 itens), com o formato:

```json
{
  "id": "supino_reto_com_barra",
  "nome": "Supino Reto com Barra",
  "grupoMuscular": "Peitoral",
  "equipamento": null
}
```

Notas sobre esse arquivo:
- `id`: **não existe no código-fonte** como campo — eu o **derivei** aplicando exatamente o mesmo algoritmo de slug que `salvarVideoExercicio` usa para gerar o doc-id em `exercicioVideos` (sem o prefixo `personalId_`), para que fique consistente com o sistema real caso você queira usar esse id como chave. Confirmei que os 292 ids gerados são únicos (sem colisão).
- `nome`: copiado literalmente da `BIBLIOTECA`.
- `grupoMuscular`: o campo `grupo` de cada bloco da `BIBLIOTECA` (ex. "Peitoral", "Dorsal", "Quadríceps"...).
- `equipamento`: **não existe essa informação em lugar nenhum do código** — o nome do exercício às vezes embute o equipamento no próprio texto (ex. "Supino Reto **com Barra**"), mas não há um campo estruturado. Deixei `null` para todos — **não fabriquei esse dado**.

### 2.4 Onde os vídeos realmente ficam e como exportá-los

Os vídeos (URLs) ficam **só no Firestore**, coleção `exercicioVideos`. O jeito mais simples de exportar essa lista sem escrever código novo:
1. Firebase Console → Firestore Database → coleção `exercicioVideos` → usar o botão de exportar da própria console, **ou**
2. Rodar uma exportação via `gcloud firestore export` (exportação nativa do GCP, gera Datastore-export, depois converte), **ou**
3. Um script simples (Node + Admin SDK, ~10 linhas) que faz `getDocs(collection(db,'exercicioVideos'))` e escreve `snap.docs.map(d=>({id:d.id,...d.data()}))` num JSON — igual ao que `listarVideosExercicios()` já faz em `lib/firestore.js` (linhas 283–291), só que salvando em arquivo em vez de retornar para a UI.

Não é possível exportar isso analisando só este repositório — precisa de acesso ao projeto Firebase (`personalpro-1d4bc`, visto em `lib/firebase.js`) para rodar qualquer uma dessas opções.

---

## 3. Visibilidade

### 3.1 Como os modelos são separados por personal hoje

O isolamento é feito **inteiramente na camada de aplicação** (`lib/firestore.js`), não por estrutura de coleção: todo documento carrega um campo `personalId` (setado a partir de `auth.currentUser.uid` no momento da escrita), e toda leitura filtra com `where('personalId', '==', personalId())`. Não existe sub-coleção por personal (ex. `personals/{id}/treinos`) — é uma coleção plana `treinos` com filtro por campo.

### 3.2 Existe biblioteca global compartilhada entre personais — mas só para musculação

**Sim, para `treinos` (musculação)**: um doc pode ter `global: true`. `buscarTemplatesGlobais()` (`lib/firestore.js`, linha 227) busca `where('global','==',true)` **sem nenhum filtro de `personalId`** — ou seja, **qualquer personal autenticado no app enxerga (e pode ler) todos os templates marcados como globais, de todos os personais**. A tela `/dashboard/biblioteca` (`app/dashboard/biblioteca/page.js`) exibe essa "Biblioteca Global" separada da biblioteca própria do personal, com um botão "Usar template" que **copia** (não referencia) o template global para dentro dos treinos do personal (`copiarTemplateGlobal`).

Também existe compartilhamento global para:
- `exerciciosCustom` (`global: true`) — exercícios customizados visíveis a todos;
- `exercicioVideos` (`global: true` **ou** doc "legado" sem `personalId`, tratado como global por default — ver `listarVideosExercicios`, linha 289: `d.global === true || !d.personalId`);
- `exerciciosOcultos` (`global: true`) — permite ocultar um exercício da geração automática **para todos os personais** de uma vez.

**Não existe** flag global para:
- `modelosEndurance` (modelos de Corrida/Ciclismo) — cada personal só vê os seus;
- O programa automático de 12 meses (`programaMusculacao.js`) — é código fixo compilado no app, não um documento no Firestore, então "global" nem se aplica: é igual para todo mundo por definição.

Quem controla o `global: true` na prática **não é a interface do site**: em nenhum lugar do código deste repositório existe um botão/checkbox para o personal marcar um doc próprio como `global`. A UI só **lê** templates/exercícios/vídeos globais (para copiar), nunca escreve `global: true`. Isso sugere fortemente que a marcação `global: true` é feita por outro canal — o app mobile, ou diretamente no Firebase Console/backend — reforçando o aviso do topo do documento de que a "fonte da verdade" de parte dessas regras está fora deste repo.

### 3.3 O que `firestore.rules` permite hoje

**Este arquivo não existe neste repositório.** Não há `firestore.rules`, `firebase.json`, nem `firestore.indexes.json` em `personalpro-web` — confirmei com busca recursiva no projeto. O que dá para inferir sobre o modelo de segurança **pretendido** é só o que o próprio código-cliente assume (e que comentários no código mencionam sobre as regras reais):

- O comentário em `atribuirProgramaMuscular` (`lib/firestore.js`, linhas 338–342) diz textualmente que a regra de `delete` em `treinos` usa uma função chamada **`meuDado()`** que, para confirmar o dono, faz um **`get()` no doc `/alunos/{alunoId}` por documento apagado** — e que isso tem um **limite de quantidade de `get()`s por regra**, o que já causou `permission-denied` em produção quando um aluno acumulava muitos treinos de programa. Isso é evidência direta (ainda que indireta, via comentário) de que as regras reais fazem verificação cruzada `treinos.personalId == request.auth.uid` **E** possivelmente `treinos.alunoId` pertence a um `alunos` doc do mesmo `personalId`.
- Não há nenhuma menção nas regras (nem indício) de controle de acesso por **papel/role** diferente de "personal autenticado" — não existe conceito de admin, nem de aluno logado neste repo (o app do aluno é outro: pasta `app/treine/` parece ser uma landing estática de marketing, não um cliente autenticado — não usa Firestore).
- Como a app **cliente** confia inteiramente nas regras do servidor para impedir um personal de ler/escrever dado de outro (o filtro `where('personalId','==', personalId())` no código é só uma otimização de query — **não é segurança**), a real garantia de isolamento por personal está 100% nas regras que não estão neste repositório. **Recomendo obter o arquivo `firestore.rules` do projeto de backend/mobile antes de confiar em qualquer suposição de isolamento.**

### 3.4 Como garantir que os novos modelos de ciclismo fiquem visíveis só na conta do dono

Dado o que existe hoje, a forma mais segura e consistente com o padrão do resto do app:
1. Salvar os novos modelos como docs normais em `treinos` (ou numa nova coleção, se você decidir separar — seção 5/6) com `personalId: auth.currentUser.uid` e **sem** setar `global: true` (o padrão já é `false`/ausente).
2. **Não copiar o padrão de `exerciciosOcultos`/`exercicioVideos` "legado sem personalId = global"** — esse é um comportamento peculiar (tratar ausência de `personalId` como global) que existe só nessas duas coleções por causa de dados antigos; para uma coleção nova, é mais seguro exigir `personalId` sempre presente e nunca tratar "campo ausente" como "global".
3. Confirmar nas regras reais do Firestore (fora deste repo) que a coleção escolhida (`treinos` ou nova) **exige** `request.auth.uid == resource.data.personalId` tanto para leitura quanto escrita, e que não existe nenhuma regra permissiva tipo `allow read: if true` nela.
4. Se a intenção é nunca compartilhar isso nem no futuro, vale considerar deliberadamente **não** reusar a coleção `treinos` (que já tem o mecanismo de `global: true` construído e testado por outras telas) — reduz o risco de alguém, no futuro, reaproveitar `buscarTemplatesGlobais()` e vazar sem querer os modelos de ciclismo.

---

## 4. Periodização automática de 12 meses

### 4.1 Como é gerada e atribuída

Implementada em `lib/programaMusculacao.js` (motor "puro", sem Firestore/UI) e orquestrada em `lib/firestore.js`:

- **Granularidade é o MÊS, não a semana.** O ano é dividido em **4 blocos de 3 meses** (`BLOCOS`): Adaptação (1-3), Hipertrofia (4-6), Intensificação (7-9), Choque/Pico (10-12). Cada bloco tem um "RIR" **descritivo** (texto livre, ex. `'2-3 reps na reserva'`) — não há RIR numérico por semana, nem por treino individual.
- **Rotação de exercícios**: a cada mês, o índice de variação (`vIdx = (mês-1) % 4`) escolhe entre o exercício-base e até 3 variações do mesmo padrão de movimento (mapa `VARIACOES`). Exercícios "de força" (compostos pesados) **não rotacionam mês a mês** — ficam fixos dentro do bloco de 3 meses (trocam só na virada de bloco), para permitir progressão de carga no mesmo movimento.
- **Progressão de métodos**: cada slot de exercício tem um `role` opcional (`pico`/`densidade`/`metabolico`) que decide, por bloco, qual método de intensificação aplicar (`TRILHA_METODO`) — ex. Drop-set/Rest-pause no bloco 2, FST-7 a partir do mês 6, Giant-set só no bloco 4. Compostos pesados nunca recebem método.
- **Atribuição a um aluno** (`atribuirProgramaMuscular` em `lib/firestore.js`, linha 335): apaga todos os treinos existentes do aluno com `origem === 'programa'`, gera os treinos do mês inicial (`gerarProgramaMes`) e grava:
  - N documentos novos em `treinos` (um por treino do split escolhido: ex. A/B/C), cada um com `origem: 'programa'`, `programaId`, `programaMes`;
  - Um campo `programaMuscular: { programaId, mesAtual, dataInicio }` **no doc do aluno** (`alunos/{id}`) — é esse campo que "lembra" que o aluno está num programa automático.
- **Avanço automático de mês**: `sincronizarProgramaMuscular` (linha 410) relê o `programaMuscular` do aluno, calcula o mês-alvo pela regra de **30 dias corridos por mês** (`mesAlvoPrograma`, `programaMusculacao.js` linha 506 — não é calendário real, é `Math.floor(dias/30)+1`, capado em 12), e se mudou, **apaga os treinos do mês anterior e cria os do novo mês num único `writeBatch`** (atômico). É chamada ao abrir a ficha do aluno (idempotente).
- **Split (frequência)**: os `PROGRAMAS` (ex. `masc_4x`, `fem_3x`) definem a lista de treinos do split (`['A4','B','C','D']` etc.) — mas **não há um conceito de "dia da semana"** atribuído a cada treino do split; a distribuição na agenda real (quais dias da semana o aluno treina A/B/C) não é modelada aqui, é decidida fora (provavelmente na agenda do app mobile).

### 4.2 Um mesmo aluno pode ter periodização de 12 meses (musculação) + outro conjunto de modelos (ciclismo) ao mesmo tempo?

**Sim, tecnicamente já é possível hoje, porque são sistemas totalmente desacoplados**:
- O programa de 12 meses vive em `treinos` (com `origem: 'programa'`) + campo `programaMuscular` no doc do aluno.
- Um plano de Corrida/Ciclismo vive em `treinosEndurance` (+ `enduranceProfile.{modalidade}` no doc do aluno), gerenciado inteiramente por `/dashboard/endurance`.

Não há nenhuma trava, verificação cruzada ou exclusão mútua entre os dois no código — um aluno pode ter `programaMuscular` ativo **e** sessões em `treinosEndurance` ao mesmo tempo, sem conflito de dados, porque usam coleções e campos diferentes no doc do aluno.

**Onde isso fica frágil para o seu caso específico** (ciclismo seg/qua/sex + musculação tradicional ter/qui): nenhum dos dois sistemas sabe em que **dia da semana** o outro está agendado.
- O programa de 12 meses gera **N treinos por mês, sem data marcada** — eles só existem como itens da biblioteca do aluno (`alunoId` preenchido), a serem "usados" quando o personal/aluno quiser; a agenda real de dias (`sessoes`, coleção separada usada por `/dashboard/agenda`) não referencia `programaId`/`origem` em nada que eu tenha visto em `lib/firestore.js`.
- O plano de endurance, sim, tem data (`treinosEndurance.data`), mas é uma coleção 100% separada de `sessoes` (agenda de atendimento) e de `treinos` (musculação).

Ou seja: **hoje não existe um "calendário unificado" que combine automaticamente treino de musculação de um programa de 12 meses com dias fixos de ciclismo** — isso teria que ser montado manualmente pelo personal (escolher, dos treinos gerados pelo programa, quais usar terça/quinta) ou construído como funcionalidade nova. Não é um risco de quebra — é uma lacuna de funcionalidade a decidir no próximo passo do seu projeto (fora do escopo desta análise, que é só leitura de código).

---

## 5. Campos que faltam

| Campo pedido | Situação |
|---|---|
| **Categoria "ciclismo"** | ❌ Não existe. `treinos` tem um campo livre `categoria` (string), mas hoje só é usado para carimbar o **nome do programa automático** (ex. "Masculino · 4x/semana") em treinos gerados — não é um enum, não tem valor "ciclismo" em lugar nenhum, e templates manuais/da biblioteca (`salvarTemplateTreino`) não setam `categoria` de jeito nenhum hoje. Precisaria ser criado como convenção nova (ou reaproveitar `categoria` como string livre, ou criar um campo dedicado, ex. `perfil: 'ciclismo'`). |
| **Ordem no ciclo (1 a 6)** | ❌ Não existe nada parecido. O programa de 12 meses usa **mês** (1-12) como eixo de progressão, não um "ciclo de 1-6"; a rotação de exercício usa `vIdx = (mês-1)%4` (0-3), que é um conceito diferente (índice de variação de exercício, não posição no ciclo de treino). Precisaria ser criado do zero. |
| **Pré-requisito** | ❌ Não existe em nenhuma coleção (nem em `treinos`, nem em `exerciciosCustom`, nem no programa automático). Precisaria ser criado — provavelmente como uma referência (`preRequisitoId` apontando pra outro doc/modelo) mais lógica de validação na hora de atribuir. |
| **Repetível** | ❌ Não existe flag equivalente. O mais próximo, conceitualmente, é o programa automático **revisitar** o mesmo exercício-base nos meses 1/5/9 (mesma seleção, bloco mais forte) — mas isso é um comportamento fixo do motor, não um campo configurável por modelo. Precisaria ser criado. |
| **Versão do modelo** | ❌ Não existe versionamento em nenhum doc. Não há `versao`, `v`, nem histórico de alterações em `treinos`/`modelosEndurance`/`exerciciosCustom`. `atualizadoEm` existe só como timestamp de última edição (`salvarTreino`), não como número de versão. Precisaria ser criado (campo numérico simples resolveria a maior parte dos casos). |
| **Semanas dentro do modelo** | ⚠️ Existe algo parecido **só no lado endurance** (`lib/enduranceModelos.js`): a semana é **calculada dinamicamente** (`semanaSugerida`) a partir de fase + semanas restantes até a prova — não é armazenada como sub-documento "semana 1, semana 2...". No lado musculação, a unidade é o **mês** (sem quebra em semanas) — ver seção 4. Se o modelo de ciclismo (musculação) precisar de estrutura semanal explícita, isso não existe hoje e precisa ser criado — e não dá pra copiar 1:1 do endurance, porque lá é tudo calculado on-the-fly, não persistido. |
| **RIR alvo por semana** | ⚠️ Existe só como **texto por bloco de 3 meses** (`BLOCOS[i].rir`, ex. `'1-2 reps na reserva'`), não numérico e não por semana. Precisaria virar campo estruturado (ex. `rirAlvo: number`) e granularidade semanal, hoje inexistente. |
| **Marcação de semana de deload** | ⚠️ Existe só no lado endurance, e só como **cálculo**, não persistência: `semanaDeDeload()` (`enduranceModelos.js` linha 516) decide on-the-fly se a semana corrente é deload (a cada 4 semanas, fora de taper/prova) — não existe um campo `isDeload` salvo em nenhum documento. No lado musculação (12 meses), **não existe nenhum conceito de deload** — nem calculado, nem armazenado. |
| **Tipo de sessão (A, B, C)** | ⚠️ Existe só como **parte do nome** do treino (`nome: 'A — Push: Peito + Ombro + Tríceps'`) dentro de `TREINOS_H` — a letra é texto embutido no título, não um campo estruturado `tipoSessao: 'A'`. Não dá pra filtrar/ordenar por isso sem parsear string. Precisaria virar campo próprio se for usado programaticamente (ex. pra montar automaticamente a agenda seg/qua/sex). |
| **Regressão do exercício (ref. a outro exercício)** | ⚠️ Existe algo estruturalmente parecido, mas com propósito diferente: `VARIACOES` (`programaMusculacao.js`) mapeia um exercício-base para até 5 variações do **mesmo padrão de movimento**, usadas para rotação mensal e como fallback anti-colisão (quando o exercício está oculto/já usado) — mas essas variações **não são ordenadas por dificuldade** (não há conceito de "mais fácil"/"mais difícil"), é só "equivalente". Uma "regressão" verdadeira (ex. Supino Barra → Supino Halteres → Flexão de Joelhos, do mais difícil pro mais fácil) precisaria de um campo novo e direcional (ex. `regressaoDe: 'nome-do-exercicio-mais-dificil'`), inexistente hoje. |
| **Exercício unilateral (reps por perna)** | ⚠️ "Unilateral" só existe **dentro do nome** do exercício (ex. "Remada Unilateral na Polia", "Leg Press Horizontal Unilateral") — são ~15 exercícios na `BIBLIOTECA` com "Unilateral" no nome. Não existe um campo booleano `unilateral: true` nem um campo separado "reps por lado" — o personal digitaria isso manualmente dentro do texto livre de `reps` hoje (ex. `"12 cada lado"`). Precisaria ser criado como campo estruturado se quiser tratar programaticamente (ex. dobrar automaticamente o tempo de execução, ou marcar visualmente no app do aluno). |
| **Critério de velocidade para exercícios de potência** | ❌ Não existe nada parecido em lugar nenhum — nem em musculação, nem em endurance (o endurance tem "zona" de intensidade por potência/pace, mas isso é conceitualmente para ciclismo/corrida cardio, não para exercícios de força explosiva tipo "Agachamento com Salto"). Precisaria ser criado do zero (ex. campo `velocidadeMinima`/`percentualVelocidadePico`). |
| **Agrupamento de exercícios em pares (método contraste)** | ✅ **Já existe a mecânica genérica** — `grupoId` + `metodo` (seção 1.5) já agrupa exercícios consecutivos num bloco visual/lógico com um método nomeado (hoje: Bi-set, Tri-set, Circuito, etc., vindos de `METODOS` em `lib/treinoData.js`). **O método "Contraste" especificamente não está na lista `METODOS`** — mas adicionar `'Contraste': { nivel: 'Avançado', cor: '#...' }` ao objeto `METODOS` seria suficiente para reaproveitar 100% da UI de agrupamento já existente (`buildGrupos`, `GRUPO_COR`, os botões de "agrupar"/"desagrupar" em `EditarTreinoClient.js`) sem nenhuma mudança de schema — é o item da lista mais barato de resolver. |

---

## 6. Riscos

### 6.1 Riscos ao mexer nos modelos atuais de musculação (`treinos`)

- **`reps`/`pausa` são strings livres sem validação — bom para flexibilidade, ruim para qualquer novo campo que dependa de parsear esse texto.** Se um campo novo (ex. "critério de velocidade") depender de interpretar o texto de `reps` (para saber se é "4-5" vs "Falha" vs "12 cada lado"), qualquer novo parser vai ter que lidar com texto 100% arbitrário, incluindo o que já foi digitado no passado por personais — **não dá para migrar dados existentes com confiança de que o formato é consistente**. Evite: trate `reps`/`pausa` como texto de exibição, e ponha qualquer novo dado estruturado (RIR, velocidade, unilateral) em **campos novos e paralelos**, nunca tentando extrair de dentro do texto livre.
- **`ExCard` já faz um fallback de migração de formato antigo → novo** (linhas 83–87 de `EditarTreinoClient.js`). Isso prova que a base de dados tem **treinos salvos em pelo menos 2 formatos diferentes de série** coexistindo. Qualquer novo campo obrigatório (ex. "versão do modelo") vai encontrar documentos antigos sem esse campo — **todo código novo precisa tratar o campo como opcional/ausente** (`ex.versao ?? 1`), nunca assumir presença.
- **`resumirSeries()` e `buildGrupos()` assumem a forma atual do array `exercicios`/`series`.** Adicionar campos dentro de cada série (ex. `rirAlvo`) é seguro (campos extras não quebram essas funções), mas **mudar a forma de `series` de array-de-objetos para outra coisa quebraria toda a tela de edição de treino e a tela de biblioteca (`resumirSeries`)** — evite qualquer refatoração de shape, só adicione campos.
- **`atribuirProgramaMuscular`/`sincronizarProgramaMuscular` fazem `delete` em massa de treinos com `origem === 'programa'` e depois recriam.** Se os modelos de ciclismo forem marcados de alguma forma que colida acidentalmente com `origem: 'programa'` (ex. reusar esse mesmo valor de `origem` para identificar "veio de um modelo automático de ciclismo"), rodar `sincronizarProgramaMuscular` de um aluno que também tem ciclismo pode **apagar os treinos de ciclismo por engano**, porque o filtro é só `alunoId + personalId + origem === 'programa'`, sem checar `programaId`. **Se criar um programa automático de ciclismo, use um valor de `origem` diferente** (ex. `'programa-ciclismo'`) para não colidir com esse apaga-e-recria do programa de musculação tradicional.
- **O comentário sobre `meuDado()` e limite de `get()`s nas regras do Firestore** (seção 3.3) é um risco real e já aconteceu em produção: se os novos modelos de ciclismo gerarem **muitos** documentos por aluno (ex. periodização semanal detalhada em vez de mensal), e as regras reais fizerem verificação por `get()` documento a documento em operações de delete/update em lote, você pode bater no limite de `get()`s por regra de segurança do Firestore e receber `permission-denied` mesmo sendo o dono — como já ocorreu com o programa de 12 meses. **Vale confirmar isso com quem mantém o `firestore.rules` real antes de desenhar uma estrutura que gere volume alto de documentos por aluno.**

### 6.2 Riscos ao mexer na periodização automática de 12 meses (`programaMusculacao.js`)

- **É código, não dado** — qualquer mudança de estrutura (ex. adicionar granularidade semanal) exige alterar `gerarProgramaMes`, `blocoDoMes`, `mesAlvoPrograma` e possivelmente `montarExercicio`, que são funções puras hoje **testáveis isoladamente por não terem I/O** — a própria documentação no topo do arquivo elogia isso ("Funções PURAS... testáveis isoladamente"). Misturar campos de calendário/semana aqui sem manter a pureza da função complicaria testes e reuso.
- **`usados` (Set) é compartilhado entre TODOS os treinos do programa dentro de um mês** (`gerarProgramaMes`, linha 483) para garantir que nenhum exercício se repita entre os treinos A/B/C do mesmo mês. Se você adicionar exercícios de ciclismo (ex. variações específicas para pedalar) na `VARIACOES`/biblioteca compartilhada, e esses exercícios coincidirem em nome com exercícios já usados nos treinos tradicionais, o algoritmo anti-colisão vai silenciosamente pular para uma variação alternativa — **teste a geração do mês inteiro depois de adicionar exercícios novos**, não só o exercício isolado.
- **`mesAlvoPrograma` usa uma regra fixa de 30 dias corridos**, sem calendário real e sem respeitar frequência semanal (2x/3x/4x/5x) nem dias específicos. Se a periodização de ciclismo depender de alinhamento **por dia da semana** (seg/qua/sex fixo), ela não pode reusar esse motor de "mês" sem adaptação — são modelos temporais incompatíveis (mês corrido vs. dia fixo da semana). Construir isso em cima do motor atual, sem entender essa diferença, é a causa mais provável de bugs de data ("por que meu treino de ciclismo pulou uma semana?").
- **`METODOS_AVANCADOS`/gatilhos de segurança (ex. FST-7 só a partir do mês 6) são hard-coded para o contexto de hipertrofia geral** (`programaMusculacao.js`) — não foram pensados para um atleta que já treina resistência (ciclista). Se o objetivo é ter um programa de musculação **complementar** ao ciclismo (evitar overreaching combinado), os gatilhos de intensidade atuais não sabem que o aluno também está pedalando 3x/semana — um "Choque/Pico" no mês 10-12 de musculação, empilhado sem ajuste sobre um bloco de pico do ciclismo, é um risco real de overtraining que o código atual não previne, porque os dois motores (`programaMusculacao.js` e `enduranceModelos.js`) **não se comunicam** — nenhum importa o estado do outro.

### 6.3 Como evitar quebrar o que já existe (resumo prático)

1. **Só adicione campos opcionais** em `treinos.exercicios[]`/`treinos.exercicios[].series[]` — nunca renomeie ou remova os existentes (`nome`, `series`, `reps`, `carga`, `pausa`, `metodo`, `grupoId`).
2. **Trate todo campo novo como `undefined` possível** em qualquer leitura (docs antigos não vão ter os campos novos) — siga o padrão já usado no código (`ex.metodo ? ... : null`, `Array.isArray(ex.series) ? ... : fallback`).
3. **Escolha um `origem`/identificador diferente** para os novos treinos gerados automaticamente de ciclismo, para não colidir com a lógica de apagar-e-recriar do programa de 12 meses tradicional (`origem === 'programa'`).
4. **Não reative a marcação `global: true` sem entender quem hoje a define** — nenhuma tela deste repo escreve esse campo; ver de onde ela realmente vem antes de expor esse controle na UI para os modelos de ciclismo.
5. **Confirme as regras reais do Firestore** (fora deste repositório) antes de desenhar volume alto de documentos por aluno, por causa do limite de `get()`s já documentado em comentário no código.
6. **Rode a geração de um mês inteiro do programa automático em ambiente de teste** depois de qualquer alteração na `BIBLIOTECA`/`VARIACOES`, porque o anti-colisão de exercícios (`usados`) é compartilhado entre todos os treinos do mês e pode mudar seleções de exercício de forma não-óbvia.
