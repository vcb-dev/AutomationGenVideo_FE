"use client";

import { LineChart } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  A5_KEYS,
  A5_AREA_BG,
  A5_LINE_COLORS,
  DATA_2025,
  DATA_2026,
  type A5Key,
  type YearKey,
} from "../constants";

const W = 800;
const H = 230;
const pL = 42;
const pR = 16;
const pT = 16;
const cW = W - pL - pR;
const cH = H - pT - 30;

function getSrc(y: YearKey) {
  return y === "2026" ? DATA_2026 : DATA_2025;
}

interface GrowthChart5AProps {
  accent?: "admin" | "leader";
  title?: string;
  footer?: ReactNode;
}

export function GrowthChart5A({
  accent = "admin",
  title = "Tăng trưởng 5A theo tháng",
  footer,
}: GrowthChart5AProps) {
  const [year, setYear] = useState<YearKey>("2026");
  const [monthCount, setMonthCount] = useState(12);
  const [vis, setVis] = useState<Record<A5Key, boolean>>({
    a1: true,
    a2: true,
    a3: true,
    a4: true,
    a5: true,
  });

  const svgInner = useMemo(() => {
    const src = getSrc(year);
    const si = Math.max(0, 12 - monthCount);
    const lbs = src.labels.slice(si, si + monthCount);
    const pts = lbs.length;

    const av: number[] = [];
    A5_KEYS.forEach((k) => {
      src[k].slice(si, si + monthCount).forEach((v) => {
        if (v !== null) av.push(v);
      });
    });
    const mx = Math.max(...av, 1);

    const out: ReactNode[] = [];

    for (let i = 0; i <= 4; i++) {
      const yLine = pT + cH * (1 - i / 4);
      const val = Math.round((mx * i) / 4);
      out.push(
        <line
          key={`g-${i}`}
          x1={pL}
          y1={yLine}
          x2={W - pR}
          y2={yLine}
          stroke="#f0f0f0"
          strokeWidth={1}
        />,
      );
      out.push(
        <text
          key={`gy-${i}`}
          x={pL - 6}
          y={yLine + 3}
          textAnchor="end"
          fill="#9CA3AF"
          fontSize={11}
        >
          {val}
        </text>,
      );
    }

    lbs.forEach((l, i) => {
      const x = pL + (i / Math.max(pts - 1, 1)) * cW;
      out.push(
        <text key={`xl-${i}`} x={x} y={H - 6} textAnchor="middle" fill="#9CA3AF" fontSize={12}>
          {l}
        </text>,
      );
      if (i > 0) {
        out.push(
          <line
            key={`vg-${i}`}
            x1={x}
            y1={pT}
            x2={x}
            y2={pT + cH}
            stroke="#f8f8f8"
            strokeWidth={1}
          />,
        );
      }
    });

    A5_KEYS.forEach((k) => {
      if (!vis[k]) return;
      const vs = src[k].slice(si, si + monthCount);
      const vp: { x: number; y: number; v: number }[] = [];
      vs.forEach((v, i) => {
        if (v === null) return;
        const x = pL + (i / Math.max(pts - 1, 1)) * cW;
        const y = pT + cH * (1 - v / mx);
        vp.push({ x, y, v });
      });
      if (vp.length < 2) return;
      const ap = vp.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
      const last = vp[vp.length - 1];
      const first = vp[0];
      const areaD = `${ap} L${last.x},${pT + cH} L${first.x},${pT + cH} Z`;
      out.push(<path key={`area-${k}`} d={areaD} fill={A5_AREA_BG[k]} opacity={0.5} />);
      out.push(
        <path
          key={`line-${k}`}
          d={ap}
          fill="none"
          stroke={A5_LINE_COLORS[k]}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      );
      vp.forEach((p, i) => {
        out.push(
          <circle
            key={`c-${k}-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={A5_LINE_COLORS[k]}
            stroke="white"
            strokeWidth={2}
          />,
        );
        if (i === vp.length - 1 || i % 3 === 0) {
          out.push(
            <text
              key={`tv-${k}-${i}`}
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill={A5_LINE_COLORS[k]}
              fontSize={11}
              fontWeight={700}
            >
              {p.v}
            </text>,
          );
        }
      });
    });

    out.push(
      <line
        key="ay"
        x1={pL}
        y1={pT}
        x2={pL}
        y2={pT + cH}
        stroke="#e5e7eb"
        strokeWidth={1}
      />,
    );
    out.push(
      <line
        key="ax"
        x1={pL}
        y1={pT + cH}
        x2={W - pR}
        y2={pT + cH}
        stroke="#e5e7eb"
        strokeWidth={1}
      />,
    );

    return <g>{out}</g>;
  }, [year, monthCount, vis]);

  const activeBtn =
    accent === "admin"
      ? "border-indigo-600 bg-indigo-600 text-white"
      : "border-amber-500 bg-amber-500 text-white";
  const inactiveBtn = "border-gray-200 bg-white text-gray-500";

  const toggle = (k: A5Key) => setVis((v) => ({ ...v, [k]: !v[k] }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-base font-bold">
          <LineChart className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
          <span>{title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMonthCount(n)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium",
                monthCount === n ? activeBtn : inactiveBtn,
              )}
            >
              {n} tháng
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-gray-200 sm:inline-block" />
          <select
            value={year}
            onChange={(e) => setYear(e.target.value as YearKey)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} 260`} className="h-[260px] min-w-[640px] w-full" role="img" aria-label="Biểu đồ 5A">
          {svgInner}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs sm:gap-4">
        {A5_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            style={{ opacity: vis[k] ? 1 : 0.3 }}
            className="flex cursor-pointer items-center gap-1.5"
          >
            <span className="h-3 w-3 rounded-full" style={{ background: A5_LINE_COLORS[k] }} />
            <b style={{ color: A5_LINE_COLORS[k] }}>{k.toUpperCase()}</b>
          </button>
        ))}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
