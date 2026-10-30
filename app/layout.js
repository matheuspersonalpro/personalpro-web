import './globals.css';
import { Sora, Manrope } from 'next/font/google';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';
import { SITE } from '@/lib/idioma';
import { OG_IMAGEM } from '@/lib/seo';

// Sora nos titulos e numeros, Manrope no resto -- a mesma dupla do app depois do
// redesign Grafite & Lima (07/10/2026). Sao fontes variaveis, entao nao precisa
// declarar peso. (Antes: Outfit, que era a fonte do app antigo.)
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

// Padrão de todas as páginas; cada página pública sobrescreve título,
// descrição, canonical e Open Graph (lib/seo.js). `metadataBase` resolve os
// caminhos relativos (imagem de compartilhamento) em URL absoluta.
export const metadata = {
  verification: { google: "5jd2-lCguNR9zjHt8EyusefoIc4OrTY8oRrAxEyE6Vk" },
  metadataBase: new URL(SITE),
  applicationName: 'Personal Pro',
  title: 'Personal Pro',
  description: 'Gestão para personal trainers',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
  openGraph: { siteName: 'Personal Pro', type: 'website', locale: 'pt_BR', images: [OG_IMAGEM] },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`h-full ${sora.variable} ${manrope.variable}`}>
      <body className="h-full bg-[#0A0B0D] text-white antialiased">
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
