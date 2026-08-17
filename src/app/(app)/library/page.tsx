import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteSkuAction, upsertSkuAction } from "@/app/actions/library";
import { fromG, fromMm } from "@/lib/units";

export default async function LibraryPage() {
  await requireUser();
  const skus = await prisma.cargoSku.findMany({ orderBy: { sku: "asc" } });

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Cargo library</h1>
      <p className="mt-1 text-sm text-muted">
        SKUs you ship often. Import them into a load plan and only type quantities.
      </p>
      <form action={upsertSkuAction} className="mt-6 grid grid-cols-2 gap-3 border border-line bg-panel p-4 md:grid-cols-4">
        <Field name="sku" label="SKU" required />
        <Field name="name" label="Name" required />
        <Field name="lengthMm" label="Length mm" type="number" />
        <Field name="widthMm" label="Width mm" type="number" />
        <Field name="heightMm" label="Height mm" type="number" />
        <Field name="weightG" label="Weight grams" type="number" />
        <Field name="color" label="Color" type="color" defaultValue="#c9a227" />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input name="notStackable" type="checkbox" /> Not stackable
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input name="bottomOnly" type="checkbox" /> Floor only
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input name="rotatable" type="checkbox" defaultChecked /> Rotatable
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input name="tiltable" type="checkbox" /> Tiltable
        </label>
        <div className="col-span-2 md:col-span-4">
          <button className="bg-accent px-4 py-2 text-sm text-black">Save SKU</button>
        </div>
      </form>
      <div className="mt-8 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">L×W×H cm</th>
              <th className="px-3 py-2 font-medium">kg</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {skus.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-3 py-2">{s.sku}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2 tabular">
                  {fromMm(s.lengthMm, "CM")}×{fromMm(s.widthMm, "CM")}×{fromMm(s.heightMm, "CM")}
                </td>
                <td className="px-3 py-2 tabular">{fromG(s.weightG, "KG")}</td>
                <td className="px-3 py-2 text-right">
                  <form action={deleteSkuAction.bind(null, s.id)}>
                    <button className="text-xs text-muted hover:text-danger">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="text-xs text-muted">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full border border-line bg-background px-2 py-1.5 text-sm text-foreground"
      />
    </label>
  );
}
