import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createUserAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/loadlists");
  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Add colleagues. They can log in on the same hosted URL. Keep the admin
        password out of git — it lives in environment variables.
      </p>
      <form action={createUserAction} className="mt-6 flex flex-col gap-3 border border-line bg-panel p-4">
        <label className="text-xs text-muted">
          Name
          <input name="name" className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Email
          <input name="email" type="email" required className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Password
          <input name="password" type="password" required minLength={6} className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <button className="bg-accent px-4 py-2 text-sm text-black">Add user</button>
      </form>
      <ul className="mt-8 divide-y divide-line border border-line">
        {users.map((u) => (
          <li key={u.id} className="flex justify-between px-3 py-2 text-sm">
            <span>
              {u.name} <span className="text-muted">{u.email}</span>
            </span>
            <span className="text-xs text-muted">{u.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
