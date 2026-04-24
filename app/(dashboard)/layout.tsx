import { Sidebar } from "@/components/layout/Sidebar";
import { QuotaBadge } from "@/components/usage/QuotaBadge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar quotaSlot={<QuotaBadge />} />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
