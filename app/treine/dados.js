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

export const PRECO = 'R$ 149,90';

// ── PROVA ────────────────────────────────────────────────────────────────────
// Preencher só com autorização por escrito de cada aluno, guardada no WhatsApp.
// A autorização precisa dizer ONDE vai ser publicado (site e Instagram) e a
// pessoa precisa poder escolher entre nome, iniciais, ou sem identificação.

/** @type {{texto:string, quem:string, detalhe?:string}[]} */
export const DEPOIMENTOS = [
  // Exemplo do formato — apagar quando entrar o primeiro de verdade:
  // { texto: 'O que a aluna escreveu, com as palavras dela.',
  //   quem: 'Juliana C., 34 anos', detalhe: '8 meses de consultoria' },
];

/** @type {{antes:string, depois:string, quem:string, resultado:string}[]} */
export const TRANSFORMACOES = [
  // { antes: '/prova/juliana-antes.jpg', depois: '/prova/juliana-depois.jpg',
  //   quem: 'Juliana C., 34 anos', resultado: '12 semanas · −7,2 kg de gordura' },
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

export const RECEBE = [
  {
    t: 'Um programa montado pra você',
    d: 'Não é planilha pronta. Eu monto em cima do que você respondeu: seu objetivo, os dias que você consegue treinar, quanto tempo tem por sessão e a estrutura do lugar onde você treina — academia completa, academia simples ou halteres em casa.',
  },
  {
    t: 'Treino no aplicativo, com vídeo de cada exercício',
    d: 'Você abre no celular e executa. Séries, repetições, carga e descanso na tela, e o vídeo de como fazer cada movimento.',
  },
  {
    t: 'Corrida ou ciclismo junto, se quiser',
    d: 'Planilha periodizada semana por semana, no mesmo valor. A maioria das consultorias cobra à parte ou simplesmente não faz.',
  },
  {
    t: 'Resposta em até 24 horas',
    d: 'Todos os dias, inclusive fim de semana.',
  },
];

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
