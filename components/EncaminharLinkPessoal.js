import { scriptEncaminharLinkPessoal } from '@/lib/linkPessoal';

// Link pessoal (#t=) aberto sem o app: vai pro formulário "crie sua senha"
// (regras em lib/linkPessoal.js). Componente de servidor, pra sair no HTML
// estático e rodar antes do resto da página — inclusive antes da sugestão de
// idioma, senão o aluno passaria por /es/ ou /en/ antes.
export default function EncaminharLinkPessoal() {
  return <script dangerouslySetInnerHTML={{ __html: scriptEncaminharLinkPessoal() }} />;
}
