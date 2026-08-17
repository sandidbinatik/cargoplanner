import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bootstrap } from "@/app/actions/auth";
import { createEquipmentAction, deleteEquipmentAction } from "@/app/actions/library";

export default async function EquipmentPage() {
  await requireUser();
  await bootstrap();
  const items = await prisma.equipment.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Equipment</h1>
      <p className="mt-1 text-sm text-muted">
        Inside dimensions and payload. System types are seeded; add your own trailers or boxes here.
      </p>
      <form action={createEquipmentAction} className="mt-6 grid grid-cols-2 gap-3 border border-line bg-panel p-4 md:grid-cols-4">
        <label className="text-xs text-muted">
          Name
          <input name="name" required className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Code
          <input name="code" required placeholder="MY40" className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Kind
          <select name="kind" className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm">
            <option value="container">container</option>
            <option value="trailer">trailer</option>
            <option value="pallet">pallet</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Length mm
          <input name="lengthMm" type="number" required className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Width mm
          <input name="widthMm" type="number" required className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Height mm
          <input name="heightMm" type="number" required className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted">
          Payload kg
          <input name="payloadKg" type="number" required className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm" />
        </label>
        <div className="flex items-end">
          <button className="bg-accent px-4 py-2 text-sm text-black">Add equipment</button>
        </div>
      </form>
      <div className="mt-8 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Inside m</th>
              <th className="px-3 py-2 font-medium">Payload kg</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.code}</td>
                <td className="px-3 py-2 text-muted">{e.kind}</td>
                <td className="px-3 py-2 tabular">
                  {(e.lengthMm / 1000).toFixed(3)}×{(e.widthMm / 1000).toFixed(3)}×{(e.heightMm / 1000).toFixed(3)}
                </td>
                <td className="px-3 py-2 tabular">{Math.round(e.payloadG / 1000)}</td>
                <td className="px-3 py-2 text-right">
                  {e.isSystem ? (
                    <span className="text-xs text-muted">system</span>
                  ) : (
                    <form action={deleteEquipmentAction.bind(null, e.id)}>
                      <button className="text-xs text-muted hover:text-danger">Delete</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
