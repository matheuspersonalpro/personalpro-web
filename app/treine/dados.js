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
  // Autorizada pelo Matheus em 31/08. Duas coisas foram feitas nas fotos dela
  // antes de subir:
  //
  // 1. Uma MULHER DESCONHECIDA aparecia ao fundo, mexendo no armário do
  //    vestiário. Ela não autorizou nada e o rosto dela iria pra um site
  //    público. Foi pixelizada e, depois, cortada de vez do enquadramento --
  //    a pixelização continua por baixo do corte, como rede de segurança.
  // 2. A "antes" era um plano aberto de vestiário e a "depois" era mais
  //    fechada. Nesse par, a Talita apareceria bem menor de um lado que do
  //    outro, e a diferença viria do enquadramento e não do corpo. As duas
  //    foram recortadas pro mesmo tamanho de corpo no quadro.
  //
  // A ordem antes/depois não foi chute: o cartaz atrás dela na primeira diz
  // "SÁBADO | 29.03", o que data a foto em março.
  {
    antes: '/prova/talita-antes.jpg',
    depois: '/prova/talita-depois.jpg',
    quem: 'Talita, 42 anos',
  },
  // Autorizada pelo Matheus em 31/08. Sem ninguém ao fundo em nenhuma das
  // duas, então não precisou pixelizar nada — só o recorte pro corpo ocupar a
  // mesma fatia do quadro nas duas, que é o cuidado que todas levam aqui.
  {
    antes: '/prova/renata-antes.jpg',
    depois: '/prova/renata-depois.jpg',
    quem: 'Renata, 41 anos',
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
    // Era "Periodização de 12 meses — a carga e os métodos sobem mês a mês".
    // Três problemas num card só:
    //
    // 1. Contradizia o card logo acima. "Programa 100% seu" e um plano de 12
    //    meses pronto não podem ser a mesma coisa, e quem lê os dois seguidos
    //    fica com a sensação de treino de esteira, que é o oposto do que ele
    //    vende.
    // 2. Ao lado de "sem fidelidade", "12 meses" lê como prazo de contrato.
    // 3. Não era verdade: o ritmo de troca de bloco virou configurável
    //    (30/45/60 dias ou manual), então não é "mês a mês"; e nem todo bloco
    //    sobe carga — tem semana de descarga.
    tag: 'Progressão',
    t: 'O treino muda quando precisa mudar',
    d: 'Não é a mesma planilha todo mês. Eu troco o estímulo conforme você responde.',
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
  'Treino que muda de estímulo conforme você evolui',
  'Planilha de corrida ou ciclismo, se quiser',
  'Aplicativo com vídeo de cada exercício',
  'Registro de carga treino a treino',
  'Treino em PDF pra imprimir',
  'Suporte no WhatsApp comigo, resposta em 24h',
  'Reavaliação a cada 90 dias, com fotos e medidas',
  'Ajuste do plano sempre que precisar',
  'Sem fidelidade — cancela quando quiser',
];

// O ACORDO, nas duas direções.
//
// Terceira escrita desta seção, e a mudança agora é estrutural, não de texto.
// Ela era "O que eu preciso de você": quatro coisas que o ALUNO tem que fazer,
// nenhuma que o Matheus se compromete a fazer, tudo isso antes da pessoa
// pagar. Por melhor que estivesse escrita, a estrutura era de contrato de
// academia — e foi isso que continuou incomodando ele mesmo depois de eu
// reescrever o texto duas vezes.
//
// Agora são as duas colunas do mesmo acordo, e a DELE vem primeiro. Isso é o
// que separa quem está seguro do que entrega de quem só cobra: publicar as
// próprias obrigações antes de listar as do outro.
//
// Nada na coluna dele é promessa nova. Tudo já estava dito em algum canto da
// página (24h, ajuste quando precisar, garantia dos 90 dias, sem fidelidade) —
// só nunca tinha aparecido junto, como compromisso assumido.
export const ABERTURA_ACORDO =
  'Eu não estou do seu lado na academia. O que a gente combina aqui é o que faz ' +
  'isso funcionar mesmo assim — e a minha parte vem primeiro.';

export const MINHA_PARTE = [
  {
    t: 'Te responder em até 24 horas',
    d: 'Todo dia, inclusive fim de semana. Não é robô e não é atendente: sou eu.',
  },
  {
    t: 'Mexer no seu treino sempre que precisar',
    d: 'Machucou, mudou de academia, mudou o horário, viajou. Não tem limite de ajuste e não custa a mais.',
  },
  {
    t: 'Olhar os seus números antes de mudar qualquer coisa',
    d: 'Toda alteração sai do que você registrou, não de um calendário que virou a página sozinho.',
  },
  {
    t: 'Refazer tudo do zero se não funcionar',
    d: 'Oito semanas seguindo o plano e sem evolução, eu remonto o seu planejamento inteiro sem cobrar nada.',
  },
];

// A contrapartida do aluno.
//
// Segunda escrita destes itens. A primeira era "mande foto, anote a carga,
// avise se doer", e o Matheus cortou: senso comum. Ele estava certo — qualquer
// personal diria as mesmas frases, então elas não diziam nada sobre ELE.
//
// O que faltava era o porquê específico: o que ele faz com cada informação, e
// o que dá errado de concreto quando ela não chega. Genérico é o que qualquer
// um copia; específico não dá pra copiar.
export const SUA_PARTE = [
  {
    t: 'Fotos a cada 90 dias',
    d: 'A balança mente. Peso parado com o corpo diferente é a coisa mais comum que eu vejo, e é a foto que mostra isso — não o número.',
    // Fica visível, não escondido no protocolo: é a dúvida que trava a pessoa,
    // e responder antes de ela perguntar vale mais que qualquer instrução.
    extra: 'Ficam guardadas na sua conta dentro do aplicativo, visíveis só pra você e pra mim.',
  },
  {
    t: 'A carga que você usou de verdade',
    d: 'Se você fez 12 repetições onde eu pedi 8, o peso está leve e eu preciso saber. Sem esse registro, eu monto o bloco seguinte no escuro e você fica meses no mesmo lugar.',
  },
  {
    t: 'Me avisar no dia em que doer',
    d: 'Dor que aparece na terça e me chega no domingo já virou uma semana inteira de treino errado. Quase sempre a solução era trocar um exercício.',
  },
  {
    t: 'Falar quando a semana foi ruim',
    d: 'Aluno que diz que treinou pra não me decepcionar é o que mais atrapalha o meu trabalho. Se você sumiu, me fala que sumiu — eu remonto a semana e a gente segue. Não vou te dar sermão.',
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

// Segunda escrita, pelo mesmo motivo da seção dos compromissos: a primeira era
// genérica. "Eu monto o seu programa — em cima do que você respondeu" não diz
// nada que a pessoa já não tenha suposto.
//
// O que faltava era responder as duas perguntas que quem está decidindo tem de
// verdade e não pergunta em voz alta: QUANDO eu começo a treinar, e O QUE ele
// vai me perguntar. Por isso cada etapa agora carrega um "quando" na frente e
// diz, em concreto, o que acontece nela.
//
// O `quando` do passo em que ele monta o programa está deliberadamente sem
// prazo em dias — falta o Matheus dizer quanto tempo ele leva de verdade.
// Inventar "em até 48h" aqui seria criar uma promessa que ele não combinou.
export const PASSOS = [
  {
    quando: 'Agora',
    t: 'Você preenche os seus dados aqui',
    d: 'Nome, e-mail, CPF e se quer corrida ou ciclismo junto. Um minuto.',
  },
  {
    quando: 'Assim que o pagamento confirmar',
    t: 'Chega o acesso ao aplicativo e a avaliação',
    d: 'Objetivo, quantos dias por semana você consegue treinar, quanto tempo tem por sessão, onde treina e o que tem lá, há quanto tempo treina, lesão ou dor que eu precise respeitar, e remédio ou condição de saúde que mude alguma coisa.',
  },
  {
    quando: 'Depois das suas respostas',
    t: 'Eu monto o seu programa',
    d: 'Escolho a divisão pelos dias que você tem, monto os treinos em cima da estrutura do seu lugar, e faço a planilha de corrida ou ciclismo se você pediu. Você recebe pelo aplicativo e já treina no mesmo dia.',
  },
  {
    quando: 'Nas primeiras semanas',
    t: 'A gente acerta a carga',
    d: 'É o ajuste mais importante e quase ninguém fala dele. O primeiro programa é um chute educado — só quando eu vejo os pesos que você conseguiu de verdade é que ele vira o seu.',
  },
  {
    quando: 'A cada 90 dias',
    t: 'Reavaliação com foto e medida',
    d: 'Comparo com as anteriores e refaço o planejamento a partir dali. É também quando vale a garantia.',
  },
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
// Oito semanas, decidido pelo Matheus em 31/08 (era 12).
//
// Isso mudou a BASE de verificação junto, e não só o número. Aos 90 dias a
// garantia se apoiava nas fotos novas, porque nessa data existem duas séries
// pra comparar. Em 8 semanas não existe foto nova nenhuma — as próximas só
// chegam aos 90 — então a frase antiga ("nos 90 dias a gente tem os dois lados
// pra comparar") virou mentira no momento em que o prazo encurtou.
//
// A base agora é o registro de carga, que existe toda semana. É até melhor:
// carga parada por oito semanas é um fato verificável dos dois lados, não uma
// impressão sobre a foto.
export const GARANTIA = {
  titulo: 'Oito semanas, e a minha parte se não funcionar',
  texto:
    'Se depois de 8 semanas seguindo o programa você não tiver evoluído, eu ' +
    'refaço o seu planejamento inteiro do zero, sem custo nenhum. E dá pra ' +
    'saber sem discussão: o registro de carga mostra, semana a semana, se você ' +
    'está subindo ou parado no mesmo lugar.',
};
