export const LENGTH_UNITS = ["MM", "CM", "M", "IN", "FT"] as const;
export const WEIGHT_UNITS = ["G", "KG", "LB"] as const;

export type LengthUnit = (typeof LENGTH_UNITS)[number];
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

const TO_MM: Record<LengthUnit, number> = {
  MM: 1,
  CM: 10,
  M: 1000,
  IN: 25.4,
  FT: 304.8,
};

const TO_G: Record<WeightUnit, number> = {
  G: 1,
  KG: 1000,
  LB: 453.59237,
};

export function toMm(value: number, unit: LengthUnit): number {
  return Math.round(value * TO_MM[unit]);
}

export function fromMm(mm: number, unit: LengthUnit): number {
  return roundDisplay(mm / TO_MM[unit]);
}

export function toG(value: number, unit: WeightUnit): number {
  return Math.round(value * TO_G[unit]);
}

export function fromG(g: number, unit: WeightUnit): number {
  return roundDisplay(g / TO_G[unit]);
}

export function mm3ToM3(mm3: number): number {
  return mm3 / 1_000_000_000;
}

function roundDisplay(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function formatMm(mm: number, unit: LengthUnit): string {
  return `${fromMm(mm, unit)} ${unit.toLowerCase()}`;
}

export function formatG(g: number, unit: WeightUnit): string {
  return `${fromG(g, unit)} ${unit.toLowerCase()}`;
}
