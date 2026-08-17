export type PackItem = {
  id: string;
  name: string;
  l: number;
  w: number;
  h: number;
  weightG: number;
  qty: number;
  notStackable: boolean;
  bottomOnly: boolean;
  rotatable: boolean;
  tiltable: boolean;
  color: string;
};

export type PackContainerType = {
  id: string;
  name: string;
  L: number;
  W: number;
  H: number;
  payloadG: number;
  color: string;
};

export type Placement = {
  instanceId: string;
  itemId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
  weightG: number;
  color: string;
  sequence: number;
  notStackable: boolean;
};

export type PackedContainer = {
  instanceId: string;
  typeId: string;
  name: string;
  L: number;
  W: number;
  H: number;
  payloadG: number;
  color: string;
  placements: Placement[];
  usedWeightG: number;
  usedVolumeMm3: number;
  cog: { x: number; y: number; z: number };
};

export type UnloadedItem = {
  itemId: string;
  name: string;
  reason: string;
  qty: number;
  l: number;
  w: number;
  h: number;
  weightG: number;
  color: string;
};

export type PackResult = {
  containers: PackedContainer[];
  unloaded: UnloadedItem[];
  summary: {
    containerCount: number;
    byType: Record<string, number>;
    loadedQty: number;
    unloadedQty: number;
    volumeM3: number;
    weightKg: number;
    elapsedMs: number;
  };
};

type Space = { x: number; y: number; z: number; l: number; w: number; h: number };

type OpenContainer = PackedContainer & { spaces: Space[] };

const MIN = 5;
const MAX_CONTAINERS = 40;
const MAX_PIECES = 1200;
const MAX_SPACES = 350;

function volume(l: number, w: number, h: number) {
  return l * w * h;
}

function orientations(item: PackItem): Array<[number, number, number]> {
  const { l, w, h } = item;
  const raw: Array<[number, number, number]> = item.tiltable
    ? [
        [l, w, h],
        [w, l, h],
        [l, h, w],
        [h, l, w],
        [w, h, l],
        [h, w, l],
      ]
    : item.rotatable
      ? [
          [l, w, h],
          [w, l, h],
        ]
      : [[l, w, h]];
  const seen = new Set<string>();
  const out: Array<[number, number, number]> = [];
  for (const o of raw) {
    const k = o.join("x");
    if (!seen.has(k)) {
      seen.add(k);
      out.push(o);
    }
  }
  return out;
}

function intersects(a: Space, b: Space) {
  return (
    a.x < b.x + b.l &&
    a.x + a.l > b.x &&
    a.y < b.y + b.w &&
    a.y + a.w > b.y &&
    a.z < b.z + b.h &&
    a.z + a.h > b.z
  );
}

function subtract(space: Space, box: Space): Space[] {
  if (!intersects(space, box)) return [space];
  const out: Space[] = [];
  const x0 = Math.max(space.x, box.x);
  const x1 = Math.min(space.x + space.l, box.x + box.l);
  const y0 = Math.max(space.y, box.y);
  const y1 = Math.min(space.y + space.w, box.y + box.w);
  const z0 = Math.max(space.z, box.z);
  const z1 = Math.min(space.z + space.h, box.z + box.h);

  if (box.x > space.x) {
    out.push({ x: space.x, y: space.y, z: space.z, l: box.x - space.x, w: space.w, h: space.h });
  }
  if (box.x + box.l < space.x + space.l) {
    out.push({
      x: box.x + box.l,
      y: space.y,
      z: space.z,
      l: space.x + space.l - (box.x + box.l),
      w: space.w,
      h: space.h,
    });
  }
  if (box.y > space.y) {
    out.push({ x: x0, y: space.y, z: space.z, l: Math.max(0, x1 - x0), w: box.y - space.y, h: space.h });
  }
  if (box.y + box.w < space.y + space.w) {
    out.push({
      x: x0,
      y: box.y + box.w,
      z: space.z,
      l: Math.max(0, x1 - x0),
      w: space.y + space.w - (box.y + box.w),
      h: space.h,
    });
  }
  if (box.z > space.z) {
    out.push({
      x: x0,
      y: y0,
      z: space.z,
      l: Math.max(0, x1 - x0),
      w: Math.max(0, y1 - y0),
      h: box.z - space.z,
    });
  }
  if (box.z + box.h < space.z + space.h) {
    out.push({
      x: x0,
      y: y0,
      z: box.z + box.h,
      l: Math.max(0, x1 - x0),
      w: Math.max(0, y1 - y0),
      h: space.z + space.h - (box.z + box.h),
    });
  }
  return out.filter((s) => s.l >= MIN && s.w >= MIN && s.h >= MIN);
}

function containedIn(a: Space, b: Space) {
  return (
    a.x >= b.x &&
    a.y >= b.y &&
    a.z >= b.z &&
    a.x + a.l <= b.x + b.l &&
    a.y + a.w <= b.y + b.w &&
    a.z + a.h <= b.z + b.h
  );
}

function pruneSpaces(spaces: Space[]): Space[] {
  const valid = spaces.filter((s) => s.l >= MIN && s.w >= MIN && s.h >= MIN);
  const kept: Space[] = [];
  for (const s of valid) {
    if (kept.some((k) => containedIn(s, k) && (k.l !== s.l || k.w !== s.w || k.h !== s.h || k.x !== s.x))) {
      continue;
    }
    for (let i = kept.length - 1; i >= 0; i--) {
      if (containedIn(kept[i], s) && (kept[i].l !== s.l || kept[i].w !== s.w || kept[i].h !== s.h)) {
        kept.splice(i, 1);
      }
    }
    kept.push(s);
  }
  kept.sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y);
  return kept.slice(0, MAX_SPACES);
}

function xyOverlap(a: { x: number; y: number; l: number; w: number }, b: { x: number; y: number; l: number; w: number }) {
  const x = Math.max(0, Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.w, b.y + b.w) - Math.max(a.y, b.y));
  return x * y;
}

function hasSupport(
  container: OpenContainer,
  x: number,
  y: number,
  z: number,
  l: number,
  w: number,
): boolean {
  if (z <= MIN) return true;
  const need = l * w * 0.55;
  let area = 0;
  for (const p of container.placements) {
    if (p.notStackable) continue;
    if (Math.abs(p.z + p.h - z) > 3) continue;
    area += xyOverlap(p, { x, y, l, w });
    if (area >= need) return true;
  }
  return area >= need;
}

function openContainer(type: PackContainerType, index: number): OpenContainer {
  return {
    instanceId: `${type.id}-${index}`,
    typeId: type.id,
    name: type.name,
    L: type.L,
    W: type.W,
    H: type.H,
    payloadG: type.payloadG,
    color: type.color,
    placements: [],
    usedWeightG: 0,
    usedVolumeMm3: 0,
    cog: { x: type.L / 2, y: type.W / 2, z: 0 },
    spaces: [{ x: 0, y: 0, z: 0, l: type.L, w: type.W, h: type.H }],
  };
}

function updateCog(c: OpenContainer) {
  let tw = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of c.placements) {
    tw += p.weightG;
    x += (p.x + p.l / 2) * p.weightG;
    y += (p.y + p.w / 2) * p.weightG;
    z += (p.z + p.h / 2) * p.weightG;
  }
  if (tw <= 0) {
    c.cog = { x: c.L / 2, y: c.W / 2, z: 0 };
    return;
  }
  c.cog = { x: x / tw, y: y / tw, z: z / tw };
}

function tryPlace(
  container: OpenContainer,
  item: PackItem,
  instanceId: string,
  sequence: number,
): boolean {
  if (container.usedWeightG + item.weightG > container.payloadG + 1) return false;
  let best: { space: Space; l: number; w: number; h: number; score: number } | null = null;
  for (const space of container.spaces) {
    if (item.bottomOnly && space.z > MIN) continue;
    for (const [l, w, h] of orientations(item)) {
      if (l > space.l + 0.5 || w > space.w + 0.5 || h > space.h + 0.5) continue;
      if (space.z + h > container.H + 0.5) continue;
      if (!hasSupport(container, space.x, space.y, space.z, l, w)) continue;
      const leftover = volume(space.l, space.w, space.h) - volume(l, w, h);
      const score = space.z * 1e12 + leftover + space.x * 1e3 + space.y;
      if (!best || score < best.score) best = { space, l, w, h, score };
    }
  }
  if (!best) return false;
  const p: Placement = {
    instanceId,
    itemId: item.id,
    name: item.name,
    x: best.space.x,
    y: best.space.y,
    z: best.space.z,
    l: best.l,
    w: best.w,
    h: best.h,
    weightG: item.weightG,
    color: item.color,
    sequence,
    notStackable: item.notStackable,
  };
  container.placements.push(p);
  container.usedWeightG += item.weightG;
  container.usedVolumeMm3 += volume(p.l, p.w, p.h);
  const box: Space = { x: p.x, y: p.y, z: p.z, l: p.l, w: p.w, h: p.h };
  const next: Space[] = [];
  for (const s of container.spaces) {
    if (!intersects(s, box)) next.push(s);
    else next.push(...subtract(s, box));
  }
  if (item.notStackable) {
    container.spaces = pruneSpaces(next.filter((s) => !(s.z >= p.z + p.h - 1 && xyOverlap(s, p) > 0 && s.z < p.z + p.h + s.h)));
  } else {
    container.spaces = pruneSpaces(next);
  }
  updateCog(container);
  return true;
}

function itemFitsType(item: PackItem, type: PackContainerType): { ok: boolean; reason?: string } {
  const fitsDim = orientations(item).some(
    ([l, w, h]) => l <= type.L && w <= type.W && h <= type.H,
  );
  if (!fitsDim) return { ok: false, reason: "Too large for selected equipment" };
  if (item.weightG > type.payloadG) return { ok: false, reason: "Too heavy for selected equipment" };
  return { ok: true };
}

export function packLoad(items: PackItem[], types: PackContainerType[]): PackResult {
  const started = Date.now();
  const containers: OpenContainer[] = [];
  const unloaded: UnloadedItem[] = [];
  let seq = 1;
  let pieceCount = 0;

  if (types.length === 0) {
    const qty = items.reduce((s, i) => s + Math.max(0, i.qty), 0);
    return {
      containers: [],
      unloaded: items
        .filter((i) => i.qty > 0)
        .map((i) => ({
          itemId: i.id,
          name: i.name,
          reason: "No equipment selected",
          qty: i.qty,
          l: i.l,
          w: i.w,
          h: i.h,
          weightG: i.weightG,
          color: i.color,
        })),
      summary: {
        containerCount: 0,
        byType: {},
        loadedQty: 0,
        unloadedQty: qty,
        volumeM3: 0,
        weightKg: 0,
        elapsedMs: Date.now() - started,
      },
    };
  }

  const pieces: PackItem[] = [];
  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.qty));
    for (let i = 0; i < qty; i++) {
      if (pieceCount >= MAX_PIECES) {
        unloaded.push({
          itemId: item.id,
          name: item.name,
          reason: `Piece cap (${MAX_PIECES}) reached`,
          qty: qty - i,
          l: item.l,
          w: item.w,
          h: item.h,
          weightG: item.weightG,
          color: item.color,
        });
        break;
      }
      pieces.push(item);
      pieceCount++;
    }
  }

  pieces.sort((a, b) => volume(b.l, b.w, b.h) - volume(a.l, a.w, a.h) || b.weightG - a.weightG);

  const leftoverQty = new Map<string, UnloadedItem>();

  for (const item of pieces) {
    let placed = false;
    for (const c of containers) {
      if (tryPlace(c, item, `${item.id}-${seq}`, seq)) {
        placed = true;
        seq++;
        break;
      }
    }
    if (placed) continue;

    const fit = types.map((t) => ({ t, ...itemFitsType(item, t) }));
    const usable = fit.filter((f) => f.ok);
    if (usable.length === 0) {
      const reason = fit[0]?.reason ?? "Does not fit selected equipment";
      const prev = leftoverQty.get(item.id);
      if (prev) prev.qty += 1;
      else
        leftoverQty.set(item.id, {
          itemId: item.id,
          name: item.name,
          reason,
          qty: 1,
          l: item.l,
          w: item.w,
          h: item.h,
          weightG: item.weightG,
          color: item.color,
        });
      continue;
    }

    if (containers.length >= MAX_CONTAINERS) {
      const prev = leftoverQty.get(item.id);
      if (prev) prev.qty += 1;
      else
        leftoverQty.set(item.id, {
          itemId: item.id,
          name: item.name,
          reason: `Container cap (${MAX_CONTAINERS}) reached`,
          qty: 1,
          l: item.l,
          w: item.w,
          h: item.h,
          weightG: item.weightG,
          color: item.color,
        });
      continue;
    }

    let opened: OpenContainer | null = null;
    for (const u of usable) {
      const trial = openContainer(u.t, containers.length + 1);
      if (tryPlace(trial, item, `${item.id}-${seq}`, seq)) {
        opened = trial;
        break;
      }
    }
    if (opened) {
      containers.push(opened);
      seq++;
    } else {
      const prev = leftoverQty.get(item.id);
      if (prev) prev.qty += 1;
      else
        leftoverQty.set(item.id, {
          itemId: item.id,
          name: item.name,
          reason: "Could not place with current stacking rules",
          qty: 1,
          l: item.l,
          w: item.w,
          h: item.h,
          weightG: item.weightG,
          color: item.color,
        });
    }
  }

  unloaded.push(...leftoverQty.values());

  const byType: Record<string, number> = {};
  let vol = 0;
  let weight = 0;
  let loadedQty = 0;
  const packed = containers.map((c) => {
    byType[c.name] = (byType[c.name] ?? 0) + 1;
    vol += c.usedVolumeMm3;
    weight += c.usedWeightG;
    loadedQty += c.placements.length;
    const { spaces: _s, ...rest } = c;
    return rest;
  });

  return {
    containers: packed,
    unloaded,
    summary: {
      containerCount: packed.length,
      byType,
      loadedQty,
      unloadedQty: unloaded.reduce((s, u) => s + u.qty, 0),
      volumeM3: Math.round((vol / 1_000_000_000) * 1000) / 1000,
      weightKg: Math.round((weight / 1000) * 100) / 100,
      elapsedMs: Date.now() - started,
    },
  };
}
