import type { ReactNode } from 'react';

interface DockProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export function Dock({ title, icon, children }: DockProps) {
  return (
    <section className="flex h-full w-80 flex-col overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
      <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 text-lg font-semibold dark:border-neutral-800">
        <span className="text-base">{icon}</span>
        {title}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-2">{children}</div>
    </section>
  );
}
