export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-6">
      <div className="w-full max-w-md card p-8">{children}</div>
    </main>
  );
}
