import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCurrentAgency, getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  const [user, agency] = await Promise.all([getCurrentUser(), getCurrentAgency()]);
  if (!user || !agency) {
    redirect(`/${locale}/login`);
  }

  return (
    <DashboardShell locale={locale} user={user} agency={agency}>
      {children}
    </DashboardShell>
  );
}
