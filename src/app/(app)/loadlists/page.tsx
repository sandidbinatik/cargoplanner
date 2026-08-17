import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bootstrap } from "@/app/actions/auth";
import { deleteLoadlistAction } from "@/app/actions/loadlists";

export default async function LoadlistsPage() {
  await requireUser();
  await bootstrap();
  const lists = await prisma.loadlist.findMany({
    orderBy: [{ etd: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Load plans</h1>
          <p className="mt-1 text-sm text-muted">
            Create a list, enter cargo, pick equipment, calculate, then print.
          </p>
        </div>
        <Link
          href="/loadlists/new"
          className="bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-2"
        >
          New load plan
        </Link>
      </div>
      <div className="mt-8 overflow-hidden border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">ETD</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {lists.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No load plans yet. Create one to start.
                </td>
              </tr>
            ) : (
              lists.map((l) => (
                <tr key={l.id} className="border-t border-line hover:bg-panel">
                  <td className="px-4 py-3">
                    <Link href={`/loadlists/${l.id}`} className="hover:text-accent">
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{l.listType}</td>
                  <td className="px-4 py-3 tabular text-muted">
                    {l.etd ? l.etd.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular">{l._count.items}</td>
                  <td className="px-4 py-3 tabular text-muted">
                    {l.updatedAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteLoadlistAction.bind(null, l.id)}>
                      <button className="text-xs text-muted hover:text-danger">Delete</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
