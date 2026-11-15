import Convite from '@/app/convite/Convite';
import { metadataPagina } from '@/lib/seo';
import EncaminharLinkPessoal from '@/components/EncaminharLinkPessoal';

// /convite/ em inglês. O código chega na query (?codigo=), igual ao português.
export const metadata = metadataPagina({
  pagina: 'convite',
  idioma: 'en',
  title: 'Your trainer invited you · Personal X',
  description: 'Download Personal X and join with your invite code.',
  // Página de quem recebeu um código: sem valor na busca, fica fora do índice.
  indexar: false,
});

export default function Page() {
  return (
    <>
      <EncaminharLinkPessoal />
      <Convite idioma="en" />
    </>
  );
}
