import { AuthStatusCard } from "@/components/auth/auth-status-card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          UM Nexus
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">
          UM Nexus is running
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The core platform foundation is ready. Supabase Auth is connected on the
          frontend, and the FastAPI API can sync authenticated users into the local
          application database.
        </p>
        <AuthStatusCard />
      </div>
    </main>
  );
}
