import { ReactNode } from 'react';

export default function RegulariserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-white py-8 px-4">
      {children}
    </div>
  );
}
