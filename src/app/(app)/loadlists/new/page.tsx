import { createLoadlistAction } from "@/app/actions/loadlists";

export default function NewLoadlistPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <h1 className="text-2xl font-semibold">New load plan</h1>
      <form action={createLoadlistAction} className="mt-8 flex flex-col gap-4">
        <label className="text-xs text-muted">
          Name *
          <input
            name="name"
            required
            placeholder="e.g. Rotterdam week 34"
            className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs text-muted">
          Type of loadlist *
          <select
            name="listType"
            className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            defaultValue="SEA"
          >
            <option value="SEA">Sea containers</option>
            <option value="ROAD">Road / trailer</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          ETD
          <input
            name="etd"
            type="date"
            className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-xs text-muted">
            Length unit
            <select
              name="lengthUnit"
              defaultValue="CM"
              className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-foreground"
            >
              <option>MM</option>
              <option>CM</option>
              <option>M</option>
              <option>IN</option>
              <option>FT</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Weight unit
            <select
              name="weightUnit"
              defaultValue="KG"
              className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-foreground"
            >
              <option>KG</option>
              <option>LB</option>
              <option>G</option>
            </select>
          </label>
        </div>
        <label className="text-xs text-muted">
          Notes
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <button className="mt-2 bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-2">
          Create
        </button>
      </form>
    </div>
  );
}
