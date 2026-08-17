import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const q = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center px-6">
      <div className="w-full max-w-md border border-line bg-panel p-8">
        <p className="text-xs tracking-[0.25em] text-accent">INTERNAL</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Cargoplanner</h1>
        <p className="mt-2 text-sm text-muted">
          Load plans for your company. Sign in with the admin account from your
          environment, or a user created under Settings.
        </p>
        <form action={loginAction} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="next" value={q.next || "/loadlists"} />
          <label className="text-xs text-muted">
            Email
            <input
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              className="mt-1 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Password
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          {q.error ? (
            <p className="text-sm text-danger">Wrong email or password.</p>
          ) : null}
          <button
            type="submit"
            className="mt-2 bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-2"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-xs text-muted">
          Default local login is admin@local / admin123. Change this before you
          deploy.
        </p>
      </div>
    </div>
  );
}
