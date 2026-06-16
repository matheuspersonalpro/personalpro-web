'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePersonal } from '@/lib/AuthContext';

export default function Home() {
  const personal = usePersonal();
  const router = useRouter();

  useEffect(() => {
    if (personal === undefined) return;
    if (personal) router.replace('/dashboard');
    else router.replace('/login');
  }, [personal, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
