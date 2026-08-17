import Link from "next/link";
import { readSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await readSession();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print flex items-center gap-6 border-b border-line px-5 py-3">
        <Link href="/loadlists" className="text-sm font-semibold tracking-wide">
          Cargoplanner
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/loadlists" className="hover:text-foreground">
            Load plans
          </Link>
          <Link href="/library" className="hover:text-foreground">
            Cargo library
          </Link>
          <Link href="/equipment" className="hover:text-foreground">
            Equipment
          </Link>
          {user.role === "admin" ? (
            <Link href="/settings" className="hover:text-foreground">
              Settings
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span>{user.email}</span>
          <form action={logoutAction}>
            <button className="border border-line px-2 py-1 hover:border-accent hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
