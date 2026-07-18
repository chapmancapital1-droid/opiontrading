import AppShell from "@/components/AppShell";
import LeadGate from "@/components/LeadGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LeadGate>
      <AppShell>{children}</AppShell>
    </LeadGate>
  );
}
