"use client";

import { useMemo, useRef } from "react";
import type { ItemInput } from "@/app/actions/loadlists";
import {
  fromG,
  fromMm,
  toG,
  toMm,
  type LengthUnit,
  type WeightUnit,
} from "@/lib/units";

const PALETTE = ["#c9a227", "#4aa3c2", "#d06b4a", "#6bbf8a", "#8b7ad6", "#d48bb8", "#7a9e4e", "#c47a3a"];

function emptyRow(index: number): ItemInput {
  return {
    name: "",
    sku: "",
    lengthMm: 0,
    widthMm: 0,
    heightMm: 0,
    weightG: 0,
    qty: 1,
    notStackable: false,
    bottomOnly: false,
    rotatable: true,
    tiltable: false,
    color: PALETTE[index % PALETTE.length],
  };
}

type Props = {
  items: ItemInput[];
  onChange: (items: ItemInput[]) => void;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
};

export function CargoGrid({ items, onChange, lengthUnit, weightUnit }: Props) {
  const rows = useMemo(() => (items.length ? items : [emptyRow(0)]), [items]);
  const fileRef = useRef<HTMLInputElement>(null);

  function update(i: number, patch: Partial<ItemInput>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  }

  function numLen(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return toMm(n, lengthUnit);
  }

  function numWt(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return toG(n, weightUnit);
  }

  function addRow() {
    onChange([...rows, emptyRow(rows.length)]);
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [emptyRow(0)]);
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const parsed = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split("\t").map((c) => c.trim()));
    const start = rows.every((r) => !r.name && !r.lengthMm) ? 0 : rows.length;
    const next = [...rows];
    if (start === 0) next.length = 0;
    for (const cols of parsed) {
      if (cols.every((c) => !c)) continue;
      const looksHeader = /name|item|length|sku/i.test(cols[0] ?? "") && cols.length > 2;
      if (looksHeader) continue;
      const idx = next.length;
      next.push({
        ...emptyRow(idx),
        name: cols[0] || String(idx + 1),
        lengthMm: numLen(cols[1] ?? "0"),
        widthMm: numLen(cols[2] ?? "0"),
        heightMm: numLen(cols[3] ?? "0"),
        weightG: numWt(cols[4] ?? "0"),
        qty: Math.max(1, Number(cols[5] ?? 1) || 1),
      });
    }
    onChange(next);
  }

  async function importFile(file: File) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const next: ItemInput[] = json.map((row, idx) => {
      const get = (...keys: string[]) => {
        for (const [k, v] of Object.entries(row)) {
          if (keys.some((key) => k.toLowerCase().replace(/\s/g, "") === key)) return v;
        }
        return undefined;
      };
      const stackable = String(get("stackable") ?? "yes").toLowerCase();
      return {
        ...emptyRow(idx),
        name: String(get("item", "name", "sku") ?? idx + 1),
        sku: String(get("sku") ?? ""),
        lengthMm: numLen(String(get("length", "l") ?? 0)),
        widthMm: numLen(String(get("width", "w") ?? 0)),
        heightMm: numLen(String(get("height", "h") ?? 0)),
        weightG: numWt(String(get("weight", "wt") ?? 0)),
        qty: Math.max(1, Number(get("quantity", "qty") ?? 1) || 1),
        notStackable: stackable === "no" || stackable === "false",
        bottomOnly: /yes|true|1/i.test(String(get("bottomonly", "bottom") ?? "")),
        rotatable: !/no|false/i.test(String(get("rotatable", "tiltable") ?? "yes")),
      };
    });
    onChange(next.filter((r) => r.lengthMm && r.widthMm && r.heightMm && r.weightG));
  }

  async function exportFile() {
    const XLSX = await import("xlsx");
    const data = rows
      .filter((r) => r.lengthMm && r.widthMm && r.heightMm)
      .map((r) => ({
        Item: r.name,
        SKU: r.sku,
        Length: fromMm(r.lengthMm, lengthUnit),
        Width: fromMm(r.widthMm, lengthUnit),
        Height: fromMm(r.heightMm, lengthUnit),
        Weight: fromG(r.weightG, weightUnit),
        Quantity: r.qty,
        Stackable: r.notStackable ? "No" : "Yes",
        BottomOnly: r.bottomOnly ? "Yes" : "No",
        Rotatable: r.rotatable ? "Yes" : "No",
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cargo");
    XLSX.writeFile(wb, "cargo.xlsx");
  }

  return (
    <div onPaste={onPaste}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={addRow} className="border border-line px-3 py-1.5 hover:border-accent">
          Add row
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="border border-line px-3 py-1.5 hover:border-accent">
          Import Excel
        </button>
        <button type="button" onClick={exportFile} className="border border-line px-3 py-1.5 hover:border-accent">
          Export Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
        <span className="text-muted">
          Paste from Excel (name, L, W, H, weight, qty). Units: {lengthUnit} / {weightUnit}.
        </span>
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="bg-panel-2 text-muted">
            <tr>
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">SKU</th>
              <th className="px-2 py-2 font-medium">L</th>
              <th className="px-2 py-2 font-medium">W</th>
              <th className="px-2 py-2 font-medium">H</th>
              <th className="px-2 py-2 font-medium">Wt</th>
              <th className="px-2 py-2 font-medium">Qty</th>
              <th className="px-2 py-2 font-medium">No stack</th>
              <th className="px-2 py-2 font-medium">Floor</th>
              <th className="px-2 py-2 font-medium">Rotate</th>
              <th className="px-2 py-2 font-medium">Tilt</th>
              <th className="px-2 py-2 font-medium">Color</th>
              <th className="px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-2 py-1 tabular text-muted">{i + 1}</td>
                <td className="px-1 py-1">
                  <input
                    value={r.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="w-full bg-transparent px-1 py-1 outline-none focus:bg-panel-2"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    value={r.sku ?? ""}
                    onChange={(e) => update(i, { sku: e.target.value })}
                    className="w-28 bg-transparent px-1 py-1 outline-none focus:bg-panel-2"
                  />
                </td>
                {(["lengthMm", "widthMm", "heightMm"] as const).map((key) => (
                  <td key={key} className="px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={r[key] ? fromMm(r[key], lengthUnit) : ""}
                      onChange={(e) => update(i, { [key]: numLen(e.target.value) })}
                      className="w-20 bg-transparent px-1 py-1 tabular outline-none focus:bg-panel-2"
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={r.weightG ? fromG(r.weightG, weightUnit) : ""}
                    onChange={(e) => update(i, { weightG: numWt(e.target.value) })}
                    className="w-20 bg-transparent px-1 py-1 tabular outline-none focus:bg-panel-2"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={1}
                    value={r.qty}
                    onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 bg-transparent px-1 py-1 tabular outline-none focus:bg-panel-2"
                  />
                </td>
                {(
                  [
                    ["notStackable", r.notStackable],
                    ["bottomOnly", r.bottomOnly],
                    ["rotatable", r.rotatable],
                    ["tiltable", r.tiltable],
                  ] as const
                ).map(([key, val]) => (
                  <td key={key} className="px-2 py-1 text-center">
                    <input type="checkbox" checked={val} onChange={(e) => update(i, { [key]: e.target.checked })} />
                  </td>
                ))}
                <td className="px-2 py-1">
                  <input
                    type="color"
                    value={r.color}
                    onChange={(e) => update(i, { color: e.target.value })}
                    className="h-6 w-8 cursor-pointer bg-transparent"
                  />
                </td>
                <td className="px-2 py-1">
                  <button type="button" onClick={() => removeRow(i)} className="text-muted hover:text-danger">
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
