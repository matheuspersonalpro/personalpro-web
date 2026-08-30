// Metadata da página de consultoria.
//
// Fica no layout, e não na page, porque `page.js` é componente de cliente (tem
// formulário com estado) e a documentação do Next 16 é explícita: o objeto
// `metadata` só é suportado em componente de servidor.
//
// O título e a descrição são o que aparece quando alguém compartilha o link no
// WhatsApp ou no Instagram — é a primeira impressão de quem recebe, e vale mais
// que qualquer coisa dentro da página pra decidir se a pessoa clica.

export const metadata = {
  title: 'Treine com Matheus Barbosa | Consultoria online',
  description:
    'Consultoria online de musculação, corrida e ciclismo. Treino no aplicativo, com vídeo de cada exercício. Sem fidelidade.',
  openGraph: {
    title: 'Treine com Matheus Barbosa',
    description:
      'Consultoria online de musculação, corrida e ciclismo. Treino no aplicativo, com vídeo de cada exercício. Sem fidelidade.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function TreineLayout({ children }) {
  return children;
}
