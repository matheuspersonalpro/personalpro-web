import './globals.css';
import { Outfit } from 'next/font/google';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';

// Outfit — mesma fonte do app mobile, pra identidade visual unificada
// (antes o site usava Inter, que destoava do app e tinha cara genérica).
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'PersonalPro',
  description: 'Gestão para personal trainers',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`h-full ${outfit.variable}`}>
      <body className="h-full bg-[#080f1d] text-white antialiased">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
