import './globals.css';
import { Sora, Manrope } from 'next/font/google';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';

// Sora nos titulos e numeros, Manrope no resto -- a mesma dupla do app depois do
// redesign Grafite & Lima (07/10/2026). Sao fontes variaveis, entao nao precisa
// declarar peso. (Antes: Outfit, que era a fonte do app antigo.)
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata = {
  title: 'PersonalPro',
  description: 'Gestão para personal trainers',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`h-full ${sora.variable} ${manrope.variable}`}>
      <body className="h-full bg-[#0A0B0D] text-white antialiased">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
