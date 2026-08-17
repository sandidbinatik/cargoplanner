"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ItemInput } from "@/app/actions/loadlists";
import {
  addDemoCargoAction,
  calculateAction,
  importSkusAction,
  saveItemsAction,
  updateLoadlistMetaAction,
} from "@/app/actions/loadlists";
import { CargoGrid } from "./CargoGrid";
import type { PackResult } from "@/lib/packer";
import { fromG, fromMm, mm3ToM3, type LengthUnit, type WeightUnit } from "@/lib/units";

const Viewer3D = dynamic(() => import("./Viewer3D").then((m) => m.Viewer3D), { ssr: false });

type Equipment = {
  id: string;
  name: string;
  code: string;
  kind: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  payloadG: number;
  color: string;
};

type Sku = {
  id: string;
  sku: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightG: number;
};

type Loadlist = {
  id: string;
  name: string;
  listType: string;
  notes: string;
  etd: string;
  lengthUnit: string;
  weightUnit: string;
  selectedEquipment: string[];
  result: PackResult | null;
  items: ItemInput[];
};

const STEPS = ["Data", "Setup", "Workspace", "Load plan"] as const;

export function Planner({
  loadlist,
  equipment,
  skus,
}: {
  loadlist: Loadlist;
  equipment: Equipment[];
  skus: Sku[];
}) {
  const [step, setStep] = useState<(typeof STEPS)[number]>(loadlist.result ? "Workspace" : "Data");
  const [name, setName] = useState(loadlist.name);
  const [items, setItems] = useState<ItemInput[]>(loadlist.items);
  const [selected, setSelected] = useState<string[]>(loadlist.selectedEquipment);
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(loadlist.lengthUnit as LengthUnit);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(loadlist.weightUnit as WeightUnit);
  const [result, setResult] = useState<PackResult | null>(loadlist.result);
  const [activeContainer, setActiveContainer] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [libOpen, setLibOpen] = useState(false);

  const warnings = useMemo(() => {
    const out: string[] = [];
    for (const i of items) {
      if (!i.lengthMm || !i.widthMm || !i.heightMm || !i.weightG) continue;
      const m3 = mm3ToM3(i.lengthMm * i.widthMm * i.heightMm);
      const kg = i.weightG / 1000;
      const density = m3 > 0 ? kg / m3 : 0;
      if (density > 1800) out.push(`${i.name || "Row"} looks very dense — check units.`);
      if (density > 0 && density < 20) out.push(`${i.name || "Row"} looks very light for its size — check units.`);
    }
    return out.slice(0, 4);
  }, [items]);

  function persistMeta() {
    start(async () => {
      await updateLoadlistMetaAction(loadlist.id, {
        name,
        lengthUnit,
        weightUnit,
        selectedEquipment: selected,
      });
    });
  }

  function calculate() {
    setError("");
    start(async () => {
      try {
        const r = await calculateAction(loadlist.id, items, selected);
        setResult(r);
        setActiveContainer(0);
        setStep("Workspace");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Calculate failed");
      }
    });
  }

  const container = result?.containers[activeContainer] ?? null;

  return (
    <div className="flex min-h-[calc(100vh-49px)] flex-col">
      <div className="no-print flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/loadlists" className="text-sm text-muted hover:text-foreground">
          ← Plans
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={persistMeta}
          className="min-w-[200px] bg-transparent text-sm font-medium outline-none"
        />
        <div className="flex border border-line">
          {STEPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`px-3 py-1.5 text-xs ${step === s ? "bg-accent text-black" : "text-muted hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={calculate}
          className="ml-auto bg-accent px-4 py-1.5 text-sm font-medium text-black hover:bg-accent-2 disabled:opacity-50"
        >
          {pending ? "Working…" : "Create load plan"}
        </button>
      </div>

      {error ? <p className="no-print px-4 py-2 text-sm text-danger">{error}</p> : null}

      {step === "Data" ? (
        <div className="px-4 py-5">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
            <label className="text-muted">
              Length
              <select
                value={lengthUnit}
                onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}
                onBlur={persistMeta}
                className="ml-2 border border-line bg-panel px-2 py-1 text-foreground"
              >
                <option>MM</option>
                <option>CM</option>
                <option>M</option>
                <option>IN</option>
                <option>FT</option>
              </select>
            </label>
            <label className="text-muted">
              Weight
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                onBlur={persistMeta}
                className="ml-2 border border-line bg-panel px-2 py-1 text-foreground"
              >
                <option>KG</option>
                <option>LB</option>
                <option>G</option>
              </select>
            </label>
            <button
              type="button"
              className="border border-line px-3 py-1.5 hover:border-accent"
              onClick={() =>
                start(async () => {
                  await addDemoCargoAction(loadlist.id);
                  window.location.reload();
                })
              }
            >
              Load sample cargo
            </button>
            <button type="button" className="border border-line px-3 py-1.5 hover:border-accent" onClick={() => setLibOpen(true)}>
              From cargo library
            </button>
            <button
              type="button"
              className="border border-line px-3 py-1.5 hover:border-accent"
              onClick={() => start(async () => saveItemsAction(loadlist.id, items))}
            >
              Save
            </button>
          </div>
          {warnings.map((w) => (
            <p key={w} className="mb-2 text-xs text-warn">
              {w}
            </p>
          ))}
          <CargoGrid items={items} onChange={setItems} lengthUnit={lengthUnit} weightUnit={weightUnit} />
          {libOpen ? (
            <LibraryModal
              skus={skus}
              lengthUnit={lengthUnit}
              weightUnit={weightUnit}
              onClose={() => setLibOpen(false)}
              onImport={(ids, qty) =>
                start(async () => {
                  await importSkusAction(loadlist.id, ids, qty);
                  window.location.reload();
                })
              }
            />
          ) : null}
        </div>
      ) : null}

      {step === "Setup" ? (
        <div className="grid gap-6 px-4 py-5 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium">Equipment library</h2>
            <p className="mb-3 text-xs text-muted">Add types the engine may use. It opens as many as needed.</p>
            <div className="flex flex-col gap-2">
              {equipment.map((eq) => {
                const on = selected.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setSelected((s) => (on ? s.filter((id) => id !== eq.id) : [...s, eq.id]))}
                    className={`flex items-center justify-between border px-3 py-2 text-left text-sm ${on ? "border-accent bg-panel" : "border-line hover:border-muted"}`}
                  >
                    <span>
                      <span className="font-medium">{eq.name}</span>
                      <span className="ml-2 text-xs text-muted">{eq.kind}</span>
                    </span>
                    <span className="tabular text-xs text-muted">
                      {(eq.lengthMm / 1000).toFixed(2)}×{(eq.widthMm / 1000).toFixed(2)}×{(eq.heightMm / 1000).toFixed(2)} m ·{" "}
                      {Math.round(eq.payloadG / 1000)} kg
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium">Selected for this plan</h2>
            <p className="mb-3 text-xs text-muted">Order matters: the engine prefers types higher in this list.</p>
            {selected.length === 0 ? (
              <p className="text-sm text-danger">Select at least one equipment type.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {selected.map((id) => {
                  const eq = equipment.find((e) => e.id === id);
                  if (!eq) return null;
                  return (
                    <li key={id} className="border border-line bg-panel px-3 py-2 text-sm">
                      {eq.name}
                    </li>
                  );
                })}
              </ol>
            )}
            <button type="button" onClick={persistMeta} className="mt-4 border border-line px-3 py-1.5 text-xs hover:border-accent">
              Save setup
            </button>
          </div>
        </div>
      ) : null}

      {step === "Workspace" ? (
        <div className="grid gap-4 px-4 py-5 lg:grid-cols-[1fr_320px]">
          <div>
            {result ? (
              <>
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  <Stat label="Equipment" value={`${result.summary.containerCount}`} />
                  <Stat label="Loaded qty" value={`${result.summary.loadedQty}`} />
                  <Stat label="Unloaded" value={`${result.summary.unloadedQty}`} />
                  <Stat label="Volume" value={`${result.summary.volumeM3} m³`} />
                  <Stat label="Weight" value={`${result.summary.weightKg} kg`} />
                  <Stat label="Time" value={`${result.summary.elapsedMs} ms`} />
                </div>
                <p className="mb-3 text-xs text-muted">
                  {Object.entries(result.summary.byType)
                    .map(([k, v]) => `${v}× ${k}`)
                    .join(" · ") || "No containers"}
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {result.containers.map((c, i) => (
                    <button
                      key={c.instanceId}
                      type="button"
                      onClick={() => setActiveContainer(i)}
                      className={`border px-3 py-1 text-xs ${i === activeContainer ? "border-accent text-foreground" : "border-line text-muted"}`}
                    >
                      {i + 1}. {c.name}
                    </button>
                  ))}
                </div>
                <Viewer3D container={container} />
                {container ? (
                  <p className="mt-2 text-xs text-muted">
                    Used L×W×H {container.placements.reduce((m, p) => Math.max(m, p.x + p.l), 0)}×
                    {container.placements.reduce((m, p) => Math.max(m, p.y + p.w), 0)}×
                    {container.placements.reduce((m, p) => Math.max(m, p.z + p.h), 0)} mm ·{" "}
                    {Math.round((container.usedWeightG / container.payloadG) * 100)}% payload · CoG{" "}
                    {Math.round(container.cog.x)}/{Math.round(container.cog.y)}/{Math.round(container.cog.z)} mm
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">No result yet. Enter cargo, pick equipment, then calculate.</p>
            )}
          </div>
          <aside className="border border-line bg-panel p-3">
            <h2 className="text-sm font-medium text-warn">Unloaded items</h2>
            {!result || result.unloaded.length === 0 ? (
              <p className="mt-2 text-xs text-muted">All cargo is loaded.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-xs">
                {result.unloaded.map((u) => (
                  <li key={u.itemId} className="border border-line px-2 py-2">
                    <div className="font-medium text-foreground">
                      {u.name} × {u.qty}
                    </div>
                    <div className="text-muted">{u.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : null}

      {step === "Load plan" ? (
        <div className="px-6 py-6 print:px-0">
          <div className="no-print mb-4 flex gap-2">
            <button type="button" onClick={() => window.print()} className="bg-accent px-4 py-1.5 text-sm text-black">
              Print / PDF
            </button>
          </div>
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="mt-1 text-sm text-muted">
            {loadlist.listType} · {lengthUnit}/{weightUnit}
            {loadlist.etd ? ` · ETD ${loadlist.etd}` : ""}
          </p>
          {!result ? (
            <p className="mt-6 text-sm text-muted">Calculate first.</p>
          ) : (
            result.containers.map((c, idx) => (
              <section key={c.instanceId} className="mt-8 break-inside-avoid">
                <h2 className="text-sm font-semibold">
                  Container {idx + 1} — {c.name}
                </h2>
                <p className="text-xs text-muted">
                  {c.placements.length} pieces · {Math.round(c.usedWeightG / 1000)} kg / {Math.round(c.payloadG / 1000)} kg ·{" "}
                  {mm3ToM3(c.usedVolumeMm3).toFixed(2)} m³
                </p>
                <table className="mt-2 w-full text-left text-xs">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-1 font-medium">Seq</th>
                      <th className="py-1 font-medium">Cargo</th>
                      <th className="py-1 font-medium">L×W×H mm</th>
                      <th className="py-1 font-medium">Pos mm</th>
                      <th className="py-1 font-medium">kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...c.placements]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((p) => (
                        <tr key={p.instanceId} className="border-t border-line">
                          <td className="py-1 tabular">{p.sequence}</td>
                          <td className="py-1">{p.name}</td>
                          <td className="py-1 tabular">
                            {p.l}×{p.w}×{p.h}
                          </td>
                          <td className="py-1 tabular">
                            {Math.round(p.x)}/{Math.round(p.y)}/{Math.round(p.z)}
                          </td>
                          <td className="py-1 tabular">{fromG(p.weightG, "KG")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            ))
          )}
          {result && result.unloaded.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-sm font-semibold">Not loaded</h2>
              <ul className="mt-2 text-xs">
                {result.unloaded.map((u) => (
                  <li key={u.itemId}>
                    {u.name} × {u.qty} — {u.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular text-lg">{value}</div>
    </div>
  );
}

function LibraryModal({
  skus,
  lengthUnit,
  weightUnit,
  onClose,
  onImport,
}: {
  skus: Sku[];
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  onClose: () => void;
  onImport: (ids: string[], qty: Record<string, number>) => void;
}) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto border border-line bg-panel p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Cargo library</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            Close
          </button>
        </div>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {skus.length === 0 ? <li className="text-muted">Library is empty.</li> : null}
          {skus.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border border-line px-2 py-2">
              <input
                type="checkbox"
                checked={picked[s.id] != null}
                onChange={(e) =>
                  setPicked((p) => {
                    const n = { ...p };
                    if (e.target.checked) n[s.id] = 1;
                    else delete n[s.id];
                    return n;
                  })
                }
              />
              <span className="flex-1">
                {s.sku} — {s.name}
                <span className="ml-2 text-xs text-muted">
                  {fromMm(s.lengthMm, lengthUnit)}×{fromMm(s.widthMm, lengthUnit)}×{fromMm(s.heightMm, lengthUnit)}{" "}
                  {lengthUnit.toLowerCase()} · {fromG(s.weightG, weightUnit)} {weightUnit.toLowerCase()}
                </span>
              </span>
              <input
                type="number"
                min={1}
                className="w-16 border border-line bg-background px-1 py-0.5 text-xs"
                value={picked[s.id] ?? 1}
                onChange={(e) => setPicked((p) => ({ ...p, [s.id]: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 bg-accent px-3 py-1.5 text-sm text-black"
          onClick={() => onImport(Object.keys(picked), picked)}
        >
          Add to loadlist
        </button>
      </div>
    </div>
  );
}
