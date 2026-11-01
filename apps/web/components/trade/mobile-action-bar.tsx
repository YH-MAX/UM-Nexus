"use client";

export function MobileActionBar({ children, label }: Readonly<{ children: React.ReactNode; label: string }>) {
  return (
    <section aria-label={label} className="nexus-mobile-actions lg:hidden">
      <div className="trade-container flex items-center gap-3">{children}</div>
    </section>
  );
}
