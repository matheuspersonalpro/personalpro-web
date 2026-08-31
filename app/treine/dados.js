// Conteúdo da página de consultoria, separado do layout.
//
// Fica em arquivo próprio por um motivo prático: a prova (depoimentos e fotos
// de transformação) depende de autorização de aluno, e vai chegando aos poucos.
// As seções correspondentes só aparecem quando houver conteúdo aqui — assim a
// página vai ao ar sem buraco, e ganha a prova conforme ela existir, sem tocar
// no arquivo da tela.
//
// NADA aqui pode ser inventado. Depoimento é o que a pessoa escreveu; número é
// o que foi medido na avaliação dela. Depoimento fabricado com nome de aluno
// real quebra a confiança de quem treina com ele e é propaganda enganosa.

// WhatsApp: (19) 99798-4847. Só dígitos, com o 55 na frente — formato do wa.me.
export const WHATSAPP = '5519997984847';

// As três fotos que se alternam no topo. A ordem importa: a de personal vem
// primeiro porque é o rosto dele em contexto de trabalho, e é com ela que a
// pessoa precisa se deparar ao chegar. As outras duas provam, sem precisar
// escrever, que a corrida e o ciclismo que ele vende ele também faz — a de
// corrida tem número de peito com o nome dele.
//
// `pos` é o enquadramento no celular, onde a foto ocupa a tela inteira e o
// texto fica por cima; `posLg` é no computador, onde ela fica na coluna do
// lado. As três têm proporção diferente (9:16, 2:3 e 3:4), então cada uma
// precisa do seu recorte pra não cortar cabeça nem pé.
export const FOTOS_TOPO = [
  { src: '/matheus.jpg',           alt: 'Matheus Barbosa na academia',        pos: 'center 12%', posLg: 'top' },
  { src: '/matheus-corrida.jpg',   alt: 'Matheus Barbosa correndo uma prova', pos: 'center 25%', posLg: 'center 20%' },
  // Trocada em 30/08 por uma na estrada, em movimento. Ela e 3:4 exata, que e
  // a proporcao da coluna do computador -- entra inteira, sem recorte nenhum.
  // No celular sobra largura e falta altura, entao corta so pelos lados, e o
  // rosto esta no meio: 'center' resolve as duas.
  { src: '/matheus-ciclismo.jpg',  alt: 'Matheus Barbosa pedalando na estrada', pos: 'center',     posLg: 'center' },
];

export const PRECO = 'R$ 149,90';

// ── PROVA ────────────────────────────────────────────────────────────────────
// Preencher só com autorização por escrito de cada aluno, guardada no WhatsApp.
// A autorização precisa dizer ONDE vai ser publicado (site e Instagram) e a
// pessoa precisa poder escolher entre nome, iniciais, ou sem identificação.

/** @type {{texto:string, quem:string, detalhe?:string}[]} */
export const DEPOIMENTOS = [
  // Formato — o carrossel liga sozinho quando o primeiro entrar aqui:
  // { texto: 'O que a pessoa escreveu, com as palavras dela.',
  //   quem: 'Primeiro nome, idade', detalhe: '8 meses de consultoria' },
];

/** @type {{antes:string, depois:string, quem:string, resultado:string}[]} */
export const TRANSFORMACOES = [
  // Autorizada por ela em 30/08/2026, pelo WhatsApp, sabendo que vai pro site.
  // Pediu pra aparecer só como "Juliana" — sem sobrenome. Respeitar isso: o
  // nome completo dela não pode entrar aqui nem no nome do arquivo.
  // Sem número na legenda, por decisão do Matheus: "a foto fala por si".
  // Tem um ganho aí além do estético — sem dado declarado, não há nada pra
  // alguém contestar. O campo `resultado` continua existindo pra quem vier
  // depois; é só opcional.
  {
    antes: '/prova/juliana-antes.jpg',
    depois: '/prova/juliana-depois.jpg',
    quem: 'Juliana, 40 anos',
  },
];

// Números que ele confirmar. Enquanto estiverem vazios, a faixa não aparece —
// número inventado numa página de venda é o tipo de coisa que se descobre.
/** @type {{n:string, oq:string}[]} */
export const NUMEROS = [
  // { n: '8 anos', oq: 'de profissão' },
  // { n: '+200', oq: 'alunos atendidos' },
];

// ── CONTEÚDO FIXO ────────────────────────────────────────────────────────────

// Faz a pessoa se reconhecer. É a seção que mais funciona na página que ele
// mandou de referência: quem lê para numa das linhas e a partir dali está
// lendo sobre ela mesma.
export const PARA_VOCE = [
  'Treina há um tempo e não vê mais resultado.',
  'Já tentou seguir treino de internet e travou na primeira semana.',
  'Tem pouco tempo e precisa que cada sessão valha a pena.',
  'Mora longe, viaja a trabalho, ou não tem horário fixo.',
  'Quer correr ou pedalar sem largar a musculação.',
  'Está voltando depois de meses parado e não sabe por onde começar.',
];

// Etiqueta + título curto + UMA linha. Era parágrafo antes, e o Matheus tinha
// razão: quem chega de Instagram passa o olho, não lê. Cada item aqui tem que
// caber num relance.
//
// Tudo o que está escrito aqui é recurso que existe no aplicativo hoje. Não
// entra nada de "em breve" nem nada que dependa de estar presente — avaliação
// com as 7 dobras, por exemplo, ficou de fora porque exige adipômetro na mão,
// e consultoria é à distância.
export const RECEBE = [
  {
    tag: 'Plano',
    t: 'Programa 100% seu',
    d: 'Montado no seu objetivo, nos seus dias e no que tem no seu lugar de treino.',
  },
  {
    tag: 'Plataforma',
    t: 'Treino no aplicativo, com vídeo de cada exercício',
    d: 'Séries, repetições, carga e descanso na tela. Você abre e executa.',
  },
  {
    tag: 'Progressão',
    t: 'Periodização de 12 meses',
    d: 'A carga e os métodos sobem mês a mês, sem repetir o mesmo treino.',
  },
  {
    tag: 'Endurance',
    t: 'Corrida ou ciclismo junto',
    d: 'Planilha periodizada semana a semana, no mesmo valor.',
  },
  {
    tag: 'Suporte',
    t: 'Falo com você direto no WhatsApp',
    d: 'Resposta em até 24 horas, todo dia, inclusive fim de semana.',
  },
  {
    tag: 'Evolução',
    t: 'Reavaliação a cada 90 dias',
    d: 'Fotos e medidas comparadas lado a lado, e o plano muda com você.',
  },
  {
    tag: 'Registro',
    t: 'Sua carga guardada, treino a treino',
    d: 'Você vê a evolução de cada exercício, e eu também.',
  },
  {
    tag: 'PDF',
    t: 'O treino em PDF, se você preferir no papel',
    d: 'Pra imprimir e levar na academia, sem depender do celular.',
  },
];

// Lista do que está dentro do valor, logo abaixo do preço. É a mesma entrega
// da seção de cima, mas em forma de conferência: ali a pessoa está conhecendo,
// aqui ela está decidindo — e na hora de decidir ela quer ver tudo junto.
export const INCLUSO = [
  'Programa de musculação montado pra você',
  'Periodização de 12 meses, sem repetir treino',
  'Planilha de corrida ou ciclismo, se quiser',
  'Aplicativo com vídeo de cada exercício',
  'Registro de carga treino a treino',
  'Treino em PDF pra imprimir',
  'Suporte no WhatsApp comigo, resposta em 24h',
  'Reavaliação a cada 90 dias, com fotos e medidas',
  'Ajuste do plano sempre que precisar',
  'Sem fidelidade — cancela quando quiser',
];

// A contrapartida do aluno. Três compromissos de MESMO peso — antes o das
// fotos ocupava dez vezes mais espaço que os outros dois, porque levava junto
// o protocolo inteiro (ângulos, posição de braço, tipo de roupa).
//
// Esse protocolo saiu daqui. Posição de braço é informação de quem JÁ
// contratou; quem está decidindo lê aquilo e pensa "que trabalheira", e a
// exigência assusta antes da pessoa entender por que ela existe. Agora fica
// atrás de um clique, em PROTOCOLO_FOTOS, pra quem quiser conferir.
export const COMPROMISSOS = [
  {
    t: 'Fotos a cada 90 dias',
    d: 'A primeira no seu primeiro dia. É como eu enxergo a sua evolução de longe — sem elas, o ajuste vira chute.',
    // Fica visível, não escondido no protocolo: é a dúvida que trava a pessoa,
    // e responder antes de ela perguntar vale mais que qualquer instrução.
    extra: 'Ficam guardadas na sua conta dentro do aplicativo, visíveis só pra você e pra mim.',
  },
  {
    t: 'Registrar a carga que você usou',
    d: 'Leva dois segundos por exercício, e é o que me diz se o estímulo está certo ou se está na hora de subir.',
  },
  {
    t: 'Avisar no dia em que doer',
    d: 'Não na semana seguinte. Ajustar cedo evita parar depois.',
  },
];

// O passo a passo das fotos, atrás de um clique. Quem está decidindo não
// precisa; quem já decidiu quer saber exatamente o que fazer.
export const PROTOCOLO_FOTOS = {
  angulos: [
    ['Frontal', 'de frente, corpo relaxado.'],
    ['Lateral', 'mulheres com os braços erguidos à frente; homens com os braços estendidos ao lado do corpo.'],
    ['Posterior', 'de costas, mesma posição para todos.'],
  ],
  roupa:
    'De preferência roupa de piscina, que é o que mostra melhor a composição ' +
    'corporal. Se você não se sentir à vontade, top e shorts para mulheres e ' +
    'shorts para homens resolvem.',
};

export const PASSOS = [
  { t: 'Você preenche seus dados aqui', d: 'Leva um minuto.' },
  { t: 'Recebe o acesso e responde a avaliação', d: 'Objetivo, rotina, histórico de treino e saúde. É o que eu uso pra montar.' },
  { t: 'Eu monto o seu programa', d: 'Em cima do que você respondeu.' },
  { t: 'Você treina e eu acompanho', d: 'Você registra a carga, eu vejo a evolução e ajusto ao longo do caminho.' },
];

export const FAQ = [
  {
    q: 'Preciso de academia?',
    r: 'Não necessariamente. Dá pra montar com academia completa, academia simples ou halteres em casa. Você me diz o que tem na avaliação, e eu monto com isso.',
  },
  {
    q: 'Tem fidelidade?',
    r: 'Não. É mensal e você cancela quando quiser, sem multa e sem precisar justificar. O acesso vale até o fim do mês já pago, e a cobrança do mês seguinte não acontece.',
  },
  {
    q: 'A corrida e o ciclismo custam à parte?',
    r: 'Não. Entram no mesmo valor, se você quiser.',
  },
  {
    q: 'Sou iniciante. Serve pra mim?',
    r: 'Serve. O ponto de partida é o seu — quem nunca treinou não começa no mesmo lugar de quem treina há cinco anos, e o programa respeita isso.',
  },
  {
    q: 'E se eu não conseguir seguir alguma semana?',
    r: 'Acontece. Me avisa que a gente ajusta. O que atrapalha de verdade é sumir sem falar nada.',
  },
  {
    q: 'As fotos são obrigatórias?',
    r: 'São como eu enxergo a sua evolução à distância — sem elas, o ajuste vira chute. Você manda no primeiro dia e a cada 90. Elas ficam guardadas na sua conta dentro do aplicativo, visíveis só pra você e pra mim.',
  },
];

// ── GARANTIA ─────────────────────────────────────────────────────────────────
// Fica atrelada aos 90 dias de propósito: é a data em que chegam as segundas
// fotos, ou seja, a única em que existe medida de antes e depois pra comparar.
// Garantia sem critério de verificação vira discussão; esta tem foto dos dois
// lados e os registros de carga no aplicativo.
//
// É refazer o programa, não devolver dinheiro — decisão do Matheus a confirmar.
export const GARANTIA = {
  titulo: 'Doze semanas, e a minha parte se não funcionar',
  texto:
    'Se depois de 12 semanas seguindo o programa você não tiver evoluído, eu ' +
    'refaço o seu planejamento inteiro do zero, sem custo nenhum. É por isso ' +
    'que as fotos e o registro de carga importam: nos 90 dias a gente tem os ' +
    'dois lados pra comparar, e não precisa ficar no achismo.',
};
