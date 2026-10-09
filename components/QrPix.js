'use client';
// QR code gerado NO NAVEGADOR (biblioteca `qrcode`): o código PIX, que contém a chave, não sai
// da máquina. Fundo branco e módulos escuros para qualquer banco ler.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrPix({ valor, tamanho = 180, className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let vivo = true;
    if (!valor) { setSrc(''); return undefined; }
    QRCode.toDataURL(valor, { width: tamanho * 2, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0A0B0D', light: '#FFFFFF' } })
      .then(url => { if (vivo) setSrc(url); })
      .catch(() => { if (vivo) setSrc(''); });
    return () => { vivo = false; };
  }, [valor, tamanho]);
  if (!src) return <div style={{ width: tamanho, height: tamanho }} className={`bg-white/[0.04] rounded-[14px] ${className}`} />;
  return <img src={src} alt="QR Code PIX" width={tamanho} height={tamanho} className={`bg-white rounded-[14px] ${className}`} />;
}
