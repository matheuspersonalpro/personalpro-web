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
  { src: '/matheus.jpg',           alt: 'Matheus Barbosa na academia',          pos: 'center 12%', posLg: 'top' },
  // Ordem escolhida pelo Matheus: personal, ciclismo, corrida. A do ciclismo é
  // 3:4 exata, que é a proporção da coluna — entra inteira, sem recorte nenhum.
  { src: '/matheus-ciclismo.jpg',  alt: 'Matheus Barbosa pedalando na estrada', pos: 'center',     posLg: 'center' },
  { src: '/matheus-corrida.jpg',   alt: 'Matheus Barbosa correndo uma prova',   pos: 'center 25%', posLg: 'center 20%' },
];


// ── PROVA ────────────────────────────────────────────────────────────────────
// Preencher só com autorização por escrito de cada aluno, guardada no WhatsApp.
// A autorização precisa dizer ONDE vai ser publicado (site e Instagram) e a
// pessoa precisa poder escolher entre nome, iniciais, ou sem identificação.

/** @type {{texto:string, quem:string, detalhe?:string}[]} */
export const DEPOIMENTOS = [
  // Juliana — a mesma aluna das fotos, que já tinha autorizado a publicação.
  //
  // O CONTEÚDO É DELA, A REDAÇÃO NÃO É A ORIGINAL, e vale registrar por quê.
  // O texto que chegou era, frase por frase, o depoimento da Just Move (o
  // concorrente da cidade que o Matheus mandou de referência), com o número e
  // o nome trocados: "já se foram 23 quilos... minha aparência e mentalidade
  // foram transformadas por completo. Eu amo minha rotina, disciplina e
  // regularidade."
  //
  // O Matheus confirmou que a Juliana disse aquilo e assinou embaixo, então o
  // que ela quis dizer está preservado inteiro: os 19 kg (que batem com o
  // 79→60 que ele passou), a mudança de cabeça e a rotina. O que mudou foi a
  // escrita — publicar o texto do concorrente com outro nome é o que alguém
  // pode apontar, e o estrago não seria "copiou uma frase", seria "os
  // depoimentos dele são inventados", jogando suspeita nas três
  // transformações reais que estão logo acima na página.
  //
  // A primeira frase aparece MAIOR no cartão, então ela sozinha tem que valer
  // a leitura -- por isso o número abre o depoimento.
  {
    texto:
      'Perdi 19 quilos desde que comecei o acompanhamento com o Matheus. ' +
      'Mas o que mais mudou não foi nem o corpo, foi a cabeça: hoje eu tenho ' +
      'uma rotina que eu gosto, consigo manter a disciplina e não falto mais. ' +
      'Nunca me senti tão bem.',
    quem: 'Juliana, 40 anos',
  },
  // Os quatro abaixo chegaram em 31/08, escritos por eles. A ÚNICA coisa
  // mexida foi acento e pontuação -- gente escreve no WhatsApp sem acento, e
  // "sao impecaveis" num site parece desleixo do dono da página, não de quem
  // escreveu. Palavra nenhuma foi trocada, nem a ordem delas.
  {
    texto:
      'O treino encaixa perfeitamente na minha rotina corrida. Pela primeira ' +
      'vez consigo ser constante.',
    quem: 'Célia',
  },
  {
    // Ela trocou o depoimento em 31/08. Chegou como três frases soltas, na
    // ordem: pernas e glúteos, massa magra, e "evoluí mais em 3 meses do que
    // em 1 ano sozinha".
    //
    // A ÚNICA edição foi de ORDEM, não de palavra: a comparação com o ano
    // sozinha veio por último e é de longe a frase mais forte -- e no cartão só
    // a primeira frase sai em destaque. Enterrada no fim, ela seria lida por
    // quem já tinha decidido ler tudo; na frente, é ela que segura quem passa
    // o olho. Se o Matheus preferir a ordem original, é só remontar.
    texto:
      'Evoluí mais em 3 meses do que em 1 ano sozinha. Minhas pernas e ' +
      'glúteos mudaram muito, e consegui ganhar massa magra sem ficar com ' +
      'aspecto pesado. Treinos muito intensos!',
    quem: 'Talita, 42 anos',
  },
  {
    texto:
      'Cada treino é pensado exclusivamente para as minhas dores e objetivos. ' +
      'Me sinto acompanhado o tempo todo.',
    quem: 'Mario',
  },
  {
    // Este menciona correção de vídeo pelo WhatsApp -- que é coisa que ele faz
    // hoje e a página NÃO conta em lugar nenhum. Fica registrado como pergunta
    // aberta pro Matheus: se vale pra todo mundo, é argumento de venda perdido
    // e devia estar no plano Essencial; se é só pra alguns, o depoimento
    // promete o que nem todo aluno recebe.
    texto:
      'Achei que a consultoria online seria fria, que seria apenas mais um ' +
      'treino, mas o suporte diário e a correção de vídeos pelo WhatsApp e o ' +
      'bate-papo com o Matheus são impecáveis.',
    quem: 'Renata, 41 anos',
  },
  {
    texto: 'Minhas roupas voltaram a servir. O suporte é maravilhoso.',
    quem: 'Fernanda',
  },
  {
    texto:
      'Resultado real e sem neura. Minha autoestima mudou completamente: ' +
      'olho no espelho e amo o que vejo hoje.',
    quem: 'Karina',
  },
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

// ── AS TELAS DO APLICATIVO ───────────────────────────────────────────────────
// A seção só aparece quando houver imagem aqui.
//
// É a maior falta da página hoje. Os dois concorrentes que ele mandou de
// referência mostram a plataforma deles em telas de celular; esta página
// descreve a dele em texto e não mostra nada. E a dele é a mais forte das três
// — o aplicativo é PRÓPRIO, enquanto os outros alugam plataforma de terceiro.
// Descrever software é o jeito mais difícil de vender software.
//
// AS IMAGENS PRECISAM SER DA TELA DO ALUNO, não da tela dele de personal: a de
// personal tem nome de aluno na lista, e nome de cliente não vai pra página
// pública (foi o cuidado que a gente já teve no Reels, onde a lista rolava e a
// tarja curta deixava escapar quem entrava depois).
//
// Recorte: 9:19.5 (proporção de celular moderno). Print da tela inteira, sem a
// barra de status se der.
/** @type {{src:string, titulo:string, d:string}[]} */
export const TELAS_APP = [
  // { src: '/app/treino.png',   titulo: 'O treino do dia',
  //   d: 'Séries, repetições, carga e descanso. Você abre e executa.' },
  // { src: '/app/execucao.png', titulo: 'Vídeo de execução',
  //   d: 'Na dúvida de como fazer, o vídeo está no próprio exercício.' },
  // { src: '/app/carga.png',    titulo: 'A sua carga guardada',
  //   d: 'Cada exercício com o histórico do que você levantou.' },
];

// ── QUEM ELE É ───────────────────────────────────────────────────────────────
// A página tinha três fotos dele e não dizia uma linha sobre quem ele é. Todo
// concorrente tem essa seção, e é o que separa "um cara na internet" de um
// profissional registrado.
//
// O CREF pesa MAIS aqui do que pesaria numa academia, e o texto diz isso na
// cara: à distância a pessoa vai seguir um programa feito por alguém que nunca
// a viu pessoalmente. O registro é o que responde "por que eu confiaria nisso".
//
// Faltam dois dados que ele ainda não passou — há quantos anos atua e quantos
// alunos atende. Ficam de fora até ele dizer: número de aluno inventado numa
// página de venda é o tipo de coisa que se descobre.
export const SOBRE = {
  nome: 'Matheus Wruck Barbosa',
  cref: 'CREF 167779-G/SP',
  formacao: [
    'Bacharelado e Licenciatura em Educação Física — UNIMEP',
    'Pós-graduação em Biomecânica, Cinesiologia e Treinamento Físico',
  ],
  texto:
    'Numa consultoria à distância você vai seguir um programa feito por alguém ' +
    'que nunca te viu pessoalmente. Por isso eu começo dizendo quem eu sou: o ' +
    'CREF é o registro que permite prescrever treino no Brasil, e o meu está ' +
    'aqui em cima pra você conferir antes de decidir qualquer coisa.',
};

// ── CONTEÚDO FIXO ────────────────────────────────────────────────────────────

// Faz a pessoa se reconhecer. É a seção que mais funciona na página que ele
// mandou de referência: quem lê para numa das linhas e a partir dali está
// lendo sobre ela mesma.
export const PARA_VOCE = [
  'Treina há anos e o corpo parou de responder.',
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
    // Era "vídeo de CADA exercício". A biblioteca de vídeo é um mapa por nome
    // de exercício e não cobre a lista inteira -- boa parte dos exercícios do
    // motor só existe como personalizado, sem vídeo associado. "Com vídeo de
    // execução" é verdade; "de cada" não era.
    t: 'Treino no aplicativo, com vídeo de execução',
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
    // "Ilimitado" e "24h" respondem medos diferentes e por isso ficam os
    // dois. Ilimitado responde "posso incomodar?"; as 24 horas respondem "vou
    // ficar no vácuo?". Quem já foi abandonado por consultoria tem os dois.
    //
    // O concorrente da cidade só diz "ilimitado" porque não pode prometer
    // tempo: são duas pessoas para 500 alunos. Aqui o prazo é justamente onde
    // ele ganha deles — tirar o número seria abrir mão da vantagem.
    tag: 'Suporte',
    t: 'WhatsApp direto comigo, sem limite',
    d: 'Pergunte quantas vezes quiser. Eu respondo em até 24 horas, todo dia, inclusive fim de semana.',
  },
  {
    // "Avaliação FÍSICA" ficou de fora de propósito, mesmo tendo sido a
    // sugestão inicial. No Brasil o termo significa o protocolo presencial com
    // adipômetro (as 7 dobras) e consultoria é à distância — prometer isso e
    // entregar comparação de foto é o tipo de coisa que o aluno cobra na
    // primeira vez. "Avaliação" sem o sobrenome descreve o que de fato
    // acontece.
    //
    // E o ciclo virou 12 SEMANAS em toda a página, no lugar de 90 dias: a
    // garantia já falava em 12 semanas, então havia dois números pro mesmo
    // ciclo. São 84 dias em vez de 90 — seis dias de diferença que não mudam
    // nada no corpo e resolvem a incoerência.
    tag: 'Evolução',
    t: 'Avaliação a cada 12 semanas',
    d: 'Suas fotos comparadas lado a lado com as anteriores, e o plano refeito a partir dali.',
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

// Os três planos.
//
// A ESCADA É POR ATENÇÃO, NÃO POR CONTEÚDO. A divisão óbvia seria fatiar por
// modalidade — musculação num plano, corrida e ciclismo noutro — e é
// exatamente o que não pode ser feito: hoje o endurance entra no mesmo valor,
// e "a maioria cobra à parte ou simplesmente não faz" é uma das frases mais
// fortes da página. Fatiando por modalidade, ele VIRA a maioria.
//
// O que não escala é o tempo dele. Conteúdo o aplicativo entrega igual pra 10
// ou pra 100; olhar o treino de alguém, não. Então é o olhar que custa mais, e
// a escada inteira é uma coisa só: quão de perto ele acompanha a execução.
// WhatsApp -> relatório e revisão mensal -> chamada de vídeo.
//
// O DO MEIO PRECISA ENTREGAR UM OBJETO, não um comportamento. "Eu olho os seus
// números todo mês" é impossível de valorar pra quem nunca foi aluno dele. O
// relatório em PDF é uma coisa que chega, tem data e dá pra mostrar pra
// alguém — e é o que nenhum concorrente consegue copiar, porque depende de ter
// o histórico de carga do aluno. Ele já gera PDF hoje.
//
// Valores decididos pelo Matheus em 31/08. Ele tinha proposto começar em
// 139,90 e voltou pros 149,90 por um motivo prático: os alunos atuais pagam
// isso, e publicar mais barato criaria uma conversa ruim com quem já está com
// ele.
//
// Nomes em português de propósito. O concorrente usa Light/Standard/Plus e
// funciona pra ELES porque Just Move é uma marca, que carrega o sentido que o
// nome genérico não tem. Aqui quem está sendo vendido é o Matheus, numa página
// inteira na voz dele — três palavras em inglês seriam as únicas estrangeiras
// no meio.
export const PLANOS = [
  {
    nome: 'Essencial',
    preco: 'R$ 149,90',
    // Não usar a palavra "completo" aqui: é o nome do plano do meio, e dizer
    // que o Essencial já é o completo esvazia o de cima antes de a pessoa ler.
    resumo: 'O treino inteiro, com acompanhamento por WhatsApp.',
    itens: [
      'Programa de musculação montado pra você',
      'Corrida ou ciclismo junto, se quiser',
      'Vídeo de execução dentro do treino',
      'Registro de carga treino a treino',
      'Treino em PDF pra imprimir',
      'WhatsApp direto comigo, sem limite',
      'Avaliação a cada 12 semanas',
      'Ajuste sempre que você precisar',
    ],
  },
  {
    nome: 'Completo',
    preco: 'R$ 219,90',
    destaque: 'Mais escolhido',
    // O resumo diz o QUE muda; os itens dizem o que eu FAÇO. Antes o primeiro
    // item repetia o resumo com as mesmas palavras -- sobrou de quando o
    // relatório em PDF saiu daqui, e ficou dizendo a mesma coisa duas vezes no
    // mesmo cartão.
    resumo: 'Eu vou atrás dos seus números, sem você precisar pedir.',
    herda: 'Essencial',
    // O RELATÓRIO VOLTOU em 31/08. Ele tinha saído daqui enquanto não existia,
    // e voltou quando ficou pronto no aplicativo. A página não chegou a ser
    // divulgada nesse meio-tempo, então ninguém viu a promessa antes da
    // entrega. Fica a regra: linha de plano só entra depois que existe.
    //
    // E "você recebe o que mudou e por quê" saiu pra abrir espaço: o relatório
    // mensal É esse aviso, em forma de documento. As duas linhas gastavam o
    // dobro do espaço com a mesma promessa.
    itens: [
      'Relatório de evolução todo mês, em PDF',
      'Todo mês eu abro o seu histórico de carga',
      'Troco o que travou, antes de você reclamar',
    ],
  },
  {
    nome: 'Individual',
    preco: 'R$ 279,90',
    resumo: 'A sua execução conferida por mim, ao vivo.',
    herda: 'Completo',
    itens: [
      'Videochamada de 30 minutos por mês',
      'Você grava dois exercícios e eu corrijo na chamada',
      'A gente decide junto o mês seguinte',
    ],
  },
];

// Vale pros três planos, e por isso fica fora dos cards: repetir em cada um
// gastaria três vezes o espaço pra dizer a mesma coisa.
export const VALE_PARA_TODOS = [
  'Sem fidelidade — cancela quando quiser',
  'Resposta em até 24 horas, todo dia',
  'Garantia de 12 semanas',
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
// página (24h, ajuste quando precisar, garantia das 12 semanas, sem fidelidade) —
// só nunca tinha aparecido junto, como compromisso assumido.
export const ABERTURA_ACORDO =
  'Eu não estou do seu lado na academia. O que a gente combina aqui é o que faz ' +
  'isso funcionar mesmo assim — e a minha parte vem primeiro.';

export const MINHA_PARTE = [
  {
    t: 'Te responder em até 24 horas, sempre',
    d: 'Todo dia, inclusive fim de semana, quantas vezes você precisar. Não é robô e não é atendente: sou eu.',
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
    d: 'Doze semanas seguindo o plano e sem evolução, eu remonto o seu planejamento inteiro sem cobrar nada.',
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
    t: 'Fotos a cada 12 semanas',
    d: 'A balança mente. Peso parado com o corpo diferente é a coisa mais comum que eu vejo, e é a foto que mostra isso — não o número.',
    // Fica visível, não escondido no protocolo: é a dúvida que trava a pessoa,
    // e responder antes de ela perguntar vale mais que qualquer instrução.
    extra: 'Ficam guardadas na sua conta dentro do aplicativo, visíveis só pra você e pra mim.',
  },
  {
    // "Bloco" saiu: é palavra de dentro da profissão. O aluno sabe o que é o
    // treino do mês seguinte; não sabe o que é um bloco de periodização.
    t: 'A carga que você usou de verdade',
    d: 'Se você fez 12 repetições onde eu pedi 8, o peso está leve e eu preciso saber. Sem esse registro, eu monto o treino do mês seguinte no escuro e você fica meses no mesmo lugar.',
  },
  {
    // Era "quase sempre a SOLUÇÃO ERA trocar um exercício", e o Matheus
    // corrigiu: solução é ajuste. "Solução" trata a dor como um problema que
    // ficou grande; a palavra certa é a que diz que quase sempre é pequeno —
    // e é exatamente por ser pequeno que vale avisar no mesmo dia.
    t: 'Me avisar no dia em que doer',
    d: 'Dor que aparece na terça e me chega no domingo já virou uma semana inteira de treino errado. E quase sempre o ajuste é pequeno: trocar um exercício.',
  },
  {
    // Terceira escrita deste item, e a correção veio do Matheus: "cara de
    // personal frouxo".
    //
    // Ele estava certo e o erro era de fundo. A versão anterior terminava em
    // "não vou te dar sermão", escrita pra tirar a vergonha de quem sumiu — mas
    // o efeito é o contrário do que ele vende: soa como o personal que deixa
    // passar. Quem paga por acompanhamento não está comprando tolerância.
    //
    // O pedido real nunca foi "não se cobre". Era EXIGIR A VERDADE, e exigir é
    // forte. A consequência também mudou de lado: antes falava do sentimento
    // dele ("atrapalha o meu trabalho"), agora fala do estrago no treino do
    // aluno, que é o que interessa a quem lê.
    t: 'A verdade sobre a sua semana',
    d: 'Se você não treinou, me diz que não treinou. Eu trabalho com o que aconteceu, não com o que você gostaria de ter feito. Semana ruim eu remonto em dez minutos; semana inventada me faz montar o mês inteiro em cima de um dado falso.',
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
    d: 'Nome, WhatsApp e se quer corrida ou ciclismo junto. Leva um minuto.',
  },
  {
    // Falava em "mando a cobrança", e o Matheus cortou com razão: dinheiro no
    // primeiro contato esfria a conversa. A tranquilidade que a frase queria
    // passar — que ninguém paga às cegas — continua aqui, mas dita pelo lado
    // que interessa a quem lê: primeiro a gente conversa.
    quando: 'No mesmo dia',
    t: 'Eu te chamo no WhatsApp',
    d: 'A gente conversa sobre o seu objetivo, a sua rotina e o que você já treinou até aqui. Nada é decidido antes dessa conversa.',
  },
  {
    quando: 'Quando você quiser começar',
    t: 'Chega o seu acesso ao aplicativo',
    d: 'Com o programa já montado em cima do que você me contou: os dias que você tem, o tempo por sessão e o que existe no lugar onde você treina.',
  },
  {
    quando: 'Nas primeiras semanas',
    t: 'A gente acerta a carga',
    d: 'É o ajuste mais importante e quase ninguém fala dele. O primeiro programa é um chute educado — só quando eu vejo os pesos que você conseguiu de verdade é que ele vira o seu.',
  },
  {
    quando: 'A cada 12 semanas',
    t: 'Avaliação com as suas fotos',
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
    r: 'Você me avisa e eu remonto. O que quebra o acompanhamento não é a semana que você perdeu — é a semana perdida que eu só descubro um mês depois, com o treino seguinte já montado em cima de um dado que não era verdade.',
  },
  {
    q: 'As fotos são obrigatórias?',
    r: 'São como eu enxergo a sua evolução à distância — sem elas, o ajuste vira chute. Você manda no primeiro dia e a cada 12 semanas. Elas ficam guardadas na sua conta dentro do aplicativo, visíveis só pra você e pra mim.',
  },
];

// ── GARANTIA ─────────────────────────────────────────────────────────────────
// Doze semanas, e o prazo está preso às FOTOS de propósito: 12 semanas dão 84
// dias, então a reavaliação dos 90 cai logo em seguida e existem duas séries
// de foto pra comparar.
//
// Chegou a virar 8 semanas em 31/08 e voltou no mesmo dia, quando o Matheus
// lembrou disso. Vale registrar por quê, pra ninguém encurtar de novo sem
// perceber o efeito colateral: em 8 semanas não existe foto nova nenhuma, e a
// garantia perde o árbitro. Mexer no número aqui obriga a mexer também no que
// serve de prova.
export const GARANTIA = {
  titulo: 'Doze semanas, e a minha parte se não funcionar',
  texto:
    'Se depois de 12 semanas seguindo o programa você não tiver evoluído, eu ' +
    'refaço o seu planejamento inteiro do zero, sem custo nenhum. É por isso ' +
    'que as fotos e o registro de carga importam: nessa altura a gente tem os ' +
    'dois lados pra comparar, e não precisa ficar no achismo.',
};
