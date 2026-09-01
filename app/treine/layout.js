// Metadata da página de consultoria.
//
// Fica no layout, e não na page, porque `page.js` é componente de cliente (tem
// formulário com estado) e a documentação do Next 16 é explícita: o objeto
// `metadata` só é suportado em componente de servidor.
//
// O título e a descrição são o que aparece quando alguém compartilha o link no
// WhatsApp ou no Instagram — é a primeira impressão de quem recebe, e vale mais
// que qualquer coisa dentro da página pra decidir se a pessoa clica.

// `metadataBase` existe porque o Open Graph exige URL absoluta: caminho
// relativo nao e resolvido pelo WhatsApp nem pelo Instagram, e a imagem
// simplesmente nao aparece.
export const metadata = {
  metadataBase: new URL('https://personalpro.app.br'),
  title: 'Treine com Matheus Barbosa | Consultoria online',
  description:
    'Consultoria online de musculação, corrida e ciclismo. Treino no aplicativo, com vídeo de cada exercício. Sem fidelidade.',
  openGraph: {
    title: 'Treine com Matheus Barbosa',
    description:
      'Consultoria online de musculação, corrida e ciclismo. Treino no aplicativo, com vídeo de cada exercício. Sem fidelidade.',
    type: 'website',
    locale: 'pt_BR',
    url: '/treine',
    // Sem imagem o link chegava como texto puro no WhatsApp, que e onde ele
    // manda esse link o dia inteiro -- e onde a foto decide se a pessoa toca
    // ou passa reto. 1200x630 e o recorte das duas plataformas.
    images: [{
      url: '/og-treine.jpg',
      width: 1200,
      height: 630,
      alt: 'Matheus Barbosa — consultoria online de musculação, corrida e ciclismo',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Treine com Matheus Barbosa',
    images: ['/og-treine.jpg'],
  },
};

export default function TreineLayout({ children }) {
  return children;
}
