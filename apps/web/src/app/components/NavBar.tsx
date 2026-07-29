"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NavBar() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.documentElement;
      isDark ? el.classList.add('dark') : el.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <nav className="bg-[#D4AF37] border-b border-border px-4 py-2 flex justify-between items-center">
      <div>
        <Link href="/operations/dashboard" className="mr-4 text-black font-semibold">Operations</Link>
        <Link href="/client/home" className="text-black font-semibold">Client</Link>
      </div>
      <button
        onClick={() => setIsDark(!isDark)}
        className="bg-[#D4AF37] text-white py-2 px-4 rounded"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >{isDark ? '☀️' : '🌙'}</button>
    </nav>
  );
}
