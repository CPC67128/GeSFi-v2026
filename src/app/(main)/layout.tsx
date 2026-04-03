import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Desktop sidebar — server component, hidden on mobile */}
      <Sidebar className="hidden md:flex w-64 shrink-0 border-r flex-col h-full" />

      {/* Mobile header — client component, receives sidebar as server-rendered children */}
      <MobileHeader sidebar={<Sidebar className="h-full border-r flex flex-col" />} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
