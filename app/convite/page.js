import Convite from './Convite';
import SugestaoIdioma from '@/components/SugestaoIdioma';
import { metadataPagina } from '@/lib/seo';
import EncaminharLinkPessoal from '@/components/EncaminharLinkPessoal';

// A tela é a mesma da /es/invitacion/ (Convite.js).
export const metadata = metadataPagina({
  pagina: 'convite',
  idioma: 'pt-BR',
  title: 'Seu personal te convidou · Personal X',
  description: 'Baixe o Personal X e entre com o seu código de convite.',
  // Página de quem recebeu um código: sem valor na busca, fica fora do índice.
  indexar: false,
});

export default function Page() {
  return (
    <>
      <EncaminharLinkPessoal />
      <SugestaoIdioma pagina="convite" />
      <Convite idioma="pt-BR" />
    </>
  );
}
