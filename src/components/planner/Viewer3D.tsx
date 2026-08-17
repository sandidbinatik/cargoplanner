"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useMemo, useState } from "react";
import type { PackedContainer } from "@/lib/packer";

function ContainerFrame({ L, W, H }: { L: number; W: number; H: number }) {
  const l = L / 1000;
  const w = W / 1000;
  const h = H / 1000;
  return (
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[l, h, w]} />
      <meshBasicMaterial color="#8aa0b5" wireframe transparent opacity={0.55} />
    </mesh>
  );
}

function CargoMesh({
  p,
  L,
  W,
  selected,
  onSelect,
}: {
  p: PackedContainer["placements"][number];
  L: number;
  W: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const l = p.l / 1000;
  const w = p.w / 1000;
  const h = p.h / 1000;
  const x = (p.x + p.l / 2 - L / 2) / 1000;
  const y = (p.z + p.h / 2) / 1000;
  const z = (p.y + p.w / 2 - W / 2) / 1000;
  return (
    <mesh position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <boxGeometry args={[l * 0.98, h * 0.98, w * 0.98]} />
      <meshStandardMaterial
        color={p.color}
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.18 : 0}
        roughness={0.55}
        metalness={0.05}
      />
    </mesh>
  );
}

export function Viewer3D({ container }: { container: PackedContainer | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const cog = useMemo(() => {
    if (!container) return null;
    return [
      (container.cog.x - container.L / 2) / 1000,
      container.cog.z / 1000,
      (container.cog.y - container.W / 2) / 1000,
    ] as [number, number, number];
  }, [container]);

  if (!container) {
    return (
      <div className="flex h-[420px] items-center justify-center border border-line bg-panel text-sm text-muted">
        Calculate a load plan to inspect a container.
      </div>
    );
  }

  const sel = container.placements.find((p) => p.instanceId === selected);
  const dist = Math.max(container.L, container.W, container.H) / 700;

  return (
    <div className="border border-line bg-black">
      <div className="h-[420px]">
        <Canvas camera={{ position: [dist, dist * 0.7, dist], fov: 45 }} onPointerMissed={() => setSelected(null)}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} />
          <directionalLight position={[-6, 4, -4]} intensity={0.35} />
          <gridHelper args={[Math.max(container.L, container.W) / 500, 10, "#24303a", "#1a222a"]} />
          <ContainerFrame L={container.L} W={container.W} H={container.H} />
          {container.placements.map((p) => (
            <CargoMesh
              key={p.instanceId}
              p={p}
              L={container.L}
              W={container.W}
              selected={selected === p.instanceId}
              onSelect={() => setSelected(p.instanceId)}
            />
          ))}
          {cog ? (
            <mesh position={cog}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color="#f0c14b" />
            </mesh>
          ) : null}
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
            <GizmoViewport />
          </GizmoHelper>
        </Canvas>
      </div>
      <div className="border-t border-line bg-panel px-3 py-2 text-xs text-muted">
        Drag to orbit, scroll to zoom. Click a cargo to select.
        {sel ? (
          <span className="ml-2 text-foreground">
            {sel.name} · {sel.l}×{sel.w}×{sel.h} mm · seq {sel.sequence}
          </span>
        ) : (
          <span className="ml-2">Gold sphere is center of gravity.</span>
        )}
      </div>
    </div>
  );
}
