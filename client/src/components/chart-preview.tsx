import { useMemo } from "react";
import { TrendingUp } from "lucide-react";

type Candle = { o: number; h: number; l: number; c: number };

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCandles(seed: number, count: number): Candle[] {
  const rand = seededRandom(seed || 1);
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 6) * 1.2;
    const change = (rand() - 0.5) * 4 + trend;
    const o = price;
    const c = Math.max(20, o + change);
    const h = Math.max(o, c) + rand() * 1.8;
    const l = Math.min(o, c) - rand() * 1.8;
    candles.push({ o, h, l, c });
    price = c;
  }
  return candles;
}

type ChartVariant = "hero" | "signal-example";

interface ChartPreviewProps {
  symbol?: string;
  seed?: number;
  className?: string;
  variant?: ChartVariant;
}

const TIMEFRAMES = ["5m", "15m", "1H", "4H", "1D"];

export function ChartPreview({ symbol = "NIFTY 50", seed = 42, className = "", variant = "hero" }: ChartPreviewProps) {
  const candles = useMemo(() => generateCandles(seed, 36), [seed]);

  const { minP, maxP } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const c of candles) {
      if (c.l < mn) mn = c.l;
      if (c.h > mx) mx = c.h;
    }
    const pad = (mx - mn) * 0.08;
    return { minP: mn - pad, maxP: mx + pad };
  }, [candles]);

  const W = 600;
  const H = 320;
  const padL = 8, padR = 56, padT = 12, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const cw = innerW / candles.length;
  const yScale = (p: number) => padT + ((maxP - p) / (maxP - minP)) * innerH;

  const sweepIdx = Math.floor(candles.length * 0.32);
  const sellIdx = Math.floor(candles.length * 0.48);
  const buyIdx = Math.floor(candles.length * 0.78);
  const resistanceY = yScale(maxP - (maxP - minP) * 0.18);
  const supportY = yScale(minP + (maxP - minP) * 0.16);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#0b0f17] text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] ${className}`}
      data-testid="chart-preview"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight" data-testid="text-chart-symbol">{symbol}</span>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf, i) => (
            <button
              key={tf}
              type="button"
              className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                i === 1 ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}
              data-testid={`button-tf-${tf}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
            </linearGradient>
            <pattern id="grid" width="40" height="32" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 32" fill="none" stroke="url(#gridFade)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#grid)" />

          {/* Resistance line */}
          <line x1={padL} y1={resistanceY} x2={W - padR} y2={resistanceY}
            stroke="#f87171" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          <text x={W - padR + 4} y={resistanceY + 3} fill="#f87171" fontSize="9" fontFamily="system-ui">R</text>

          {/* Support line */}
          <line x1={padL} y1={supportY} x2={W - padR} y2={supportY}
            stroke="#4ade80" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          <text x={W - padR + 4} y={supportY + 3} fill="#4ade80" fontSize="9" fontFamily="system-ui">S</text>

          {/* Candles */}
          {candles.map((c, i) => {
            const x = padL + i * cw + cw / 2;
            const bullish = c.c >= c.o;
            const color = bullish ? "#22c55e" : "#ef4444";
            const yO = yScale(c.o);
            const yC = yScale(c.c);
            const yH = yScale(c.h);
            const yL = yScale(c.l);
            const bw = Math.max(2, cw * 0.6);
            return (
              <g key={i}>
                <line x1={x} y1={yH} x2={x} y2={yL} stroke={color} strokeWidth="1" />
                <rect x={x - bw / 2} y={Math.min(yO, yC)} width={bw}
                  height={Math.max(1, Math.abs(yC - yO))} fill={color} />
              </g>
            );
          })}

          {/* Price axis labels */}
          {[0.2, 0.5, 0.8].map((t) => {
            const p = maxP - (maxP - minP) * t;
            const y = padT + innerH * t;
            return (
              <text key={t} x={W - padR + 4} y={y + 3} fill="#64748b" fontSize="9" fontFamily="system-ui">
                {p.toFixed(2)}
              </text>
            );
          })}

          {variant === "hero" && (
            <>
              {/* Hero: minimal Liquidity Sweep + SELL + BUY annotations */}
              <g>
                <circle cx={padL + sweepIdx * cw + cw / 2} cy={yScale(candles[sweepIdx].h) - 6} r="3" fill="#a855f7" />
                <text x={padL + sweepIdx * cw + cw / 2 + 6} y={yScale(candles[sweepIdx].h) - 4}
                  fill="#c4b5fd" fontSize="9" fontFamily="system-ui">Liquidity Sweep</text>
              </g>
              <g>
                <polygon
                  points={`${padL + sellIdx * cw + cw / 2 - 4},${yScale(candles[sellIdx].h) - 10} ${padL + sellIdx * cw + cw / 2 + 4},${yScale(candles[sellIdx].h) - 10} ${padL + sellIdx * cw + cw / 2},${yScale(candles[sellIdx].h) - 4}`}
                  fill="#ef4444"
                />
                <text x={padL + sellIdx * cw + cw / 2 + 6} y={yScale(candles[sellIdx].h) - 8}
                  fill="#fca5a5" fontSize="9" fontWeight="600" fontFamily="system-ui">SELL</text>
              </g>
              <g>
                <polygon
                  points={`${padL + buyIdx * cw + cw / 2 - 4},${yScale(candles[buyIdx].l) + 10} ${padL + buyIdx * cw + cw / 2 + 4},${yScale(candles[buyIdx].l) + 10} ${padL + buyIdx * cw + cw / 2},${yScale(candles[buyIdx].l) + 4}`}
                  fill="#22c55e"
                />
                <text x={padL + buyIdx * cw + cw / 2 + 6} y={yScale(candles[buyIdx].l) + 12}
                  fill="#86efac" fontSize="9" fontWeight="600" fontFamily="system-ui">BUY</text>
              </g>
            </>
          )}

          {variant === "signal-example" && (
            <>
              {/* Signal-example: detailed entry / SL / TP / R:R box */}
              {(() => {
                const entryX = padL + buyIdx * cw + cw / 2;
                const entryY = yScale(candles[buyIdx].l);
                const slY = yScale(minP + (maxP - minP) * 0.06);
                const tpY = yScale(maxP - (maxP - minP) * 0.10);
                return (
                  <>
                    {/* TP zone */}
                    <rect x={entryX} y={tpY} width={W - padR - entryX} height={Math.max(2, entryY - tpY)}
                      fill="#22c55e" opacity="0.08" />
                    {/* SL zone */}
                    <rect x={entryX} y={entryY} width={W - padR - entryX} height={Math.max(2, slY - entryY)}
                      fill="#ef4444" opacity="0.08" />
                    {/* Entry line */}
                    <line x1={entryX} y1={entryY} x2={W - padR} y2={entryY}
                      stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={W - padR + 4} y={entryY + 3} fill="#60a5fa" fontSize="9" fontFamily="system-ui">Entry</text>
                    {/* TP line */}
                    <line x1={entryX} y1={tpY} x2={W - padR} y2={tpY}
                      stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={W - padR + 4} y={tpY + 3} fill="#86efac" fontSize="9" fontFamily="system-ui">TP</text>
                    {/* SL line */}
                    <line x1={entryX} y1={slY} x2={W - padR} y2={slY}
                      stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={W - padR + 4} y={slY + 3} fill="#fca5a5" fontSize="9" fontFamily="system-ui">SL</text>
                    {/* Entry triangle */}
                    <polygon
                      points={`${entryX - 5},${entryY + 12} ${entryX + 5},${entryY + 12} ${entryX},${entryY + 4}`}
                      fill="#3b82f6"
                    />
                    <text x={entryX + 8} y={entryY + 14}
                      fill="#93c5fd" fontSize="9" fontWeight="600" fontFamily="system-ui">LONG ENTRY</text>
                    {/* R:R label */}
                    <g>
                      <rect x={entryX - 70} y={tpY - 22} width="62" height="16" rx="3"
                        fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                      <text x={entryX - 39} y={tpY - 11} textAnchor="middle"
                        fill="#e2e8f0" fontSize="9" fontWeight="600" fontFamily="system-ui">R:R 1:2.4</text>
                    </g>
                  </>
                );
              })()}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
