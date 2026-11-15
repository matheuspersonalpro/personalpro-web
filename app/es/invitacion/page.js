import Convite from '@/app/convite/Convite';
import { metadataPagina } from '@/lib/seo';
import EncaminharLinkPessoal from '@/components/EncaminharLinkPessoal';

// /convite/ em espanhol. O código chega na query (?codigo=), igual ao português.
export const metadata = metadataPagina({
  pagina: 'convite',
  idioma: 'es',
  title: 'Tu entrenador te invitó · Personal X',
  description: 'Descarga Personal X y entra con tu código de invitación.',
  // Página de quem recebeu um código: sem valor na busca, fica fora do índice.
  indexar: false,
});

export default function Page() {
  return (
    <>
      <EncaminharLinkPessoal />
      <Convite idioma="es" />
    </>
  );
}
