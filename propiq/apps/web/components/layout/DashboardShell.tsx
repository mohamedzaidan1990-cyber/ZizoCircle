import type { PublicAgency, PublicUser } from "@propiq/shared";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface Props {
  locale: string;
  user: PublicUser;
  agency: PublicAgency;
  children: React.ReactNode;
}

export function DashboardShell({ locale, user, agency, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar locale={locale} agency={agency} />
        <div className="flex-1 min-h-screen flex flex-col">
          <Header locale={locale} user={user} agency={agency} />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
