import { axisTicks, labelIndexes, niceMax } from "@/lib/insights/chart";
import type { DailyPoint } from "@/lib/insights/overview";
import { formatCount, shortDay } from "@/lib/insights/period";

const W = 640;
const H = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

/**
 * Daily views (bars) and visitors (line) as inline SVG. Accessible: the figure has a text summary, each day has
 * a <title> tooltip, and the full data is available as a table. Colours are CSS tokens (the back office is
 * light-only today; a `.dark` / `data-theme="dark"` ancestor swaps in the dark palette). Series use the koi
 * tokens: views = koi-sea bars, visitors = koi-orange line (both >= 3:1 against white).
 */
export default function InsightsChart({ daily }: { daily: DailyPoint[] }) {
  const n = daily.length;
  const top = niceMax(Math.max(0, ...daily.map((d) => Math.max(d.views, d.visitors))));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = n > 0 ? plotW / n : plotW;
  const barW = Math.max(2, Math.min(24, slot * 0.7));
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const line = daily.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.visitors).toFixed(1)}`).join(" ");
  const totalViews = daily.reduce((s, d) => s + d.views, 0);
  const peak = daily.reduce((best, d) => (d.views > best.views ? d : best), daily[0] ?? { day: "", views: 0, visitors: 0 });
  const summary = `Daily page views and visitors, ${n} days. ${formatCount(totalViews)} views in total${
    totalViews > 0 ? `, busiest day ${shortDay(peak.day)} with ${formatCount(peak.views)} views` : ""
  }.`;

  return (
    <figure className="ins-chart m-0">
      <style>{`
        .ins-chart { --ins-views: var(--color-koi-sea, #1b8cff); --ins-visitors: var(--color-koi-orange, #ff5a2c); --ins-grid: rgba(10,15,31,.08); --ins-text: rgba(10,15,31,.65); }
        .dark .ins-chart, [data-theme="dark"] .ins-chart { --ins-views: var(--color-koi-foam, #7fd0ff); --ins-visitors: #ff8a63; --ins-grid: #374151; --ins-text: #9ca3af; }
      `}</style>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-koi-ink/75">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--ins-views)" }} />
          Page views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden width="16" height="8" viewBox="0 0 16 8">
            <line x1="0" y1="4" x2="16" y2="4" stroke="var(--ins-visitors)" strokeWidth="2" />
            <circle cx="8" cy="4" r="2.5" fill="var(--ins-visitors)" />
          </svg>
          Visitors
        </span>
      </div>
      <svg role="img" aria-label={summary} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
        {axisTicks(top).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--ins-grid)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ins-text)">
              {formatCount(t)}
            </text>
          </g>
        ))}
        {daily.map((d, i) => (
          <g key={d.day}>
            <title>{`${shortDay(d.day)}: ${formatCount(d.views)} views, ${formatCount(d.visitors)} visitors`}</title>
            {/* Full-height hit area so thin bars are easy to hover. */}
            <rect x={x(i) - slot / 2} y={PAD.top} width={slot} height={plotH} fill="transparent" />
            {d.views > 0 ? (
              <rect x={x(i) - barW / 2} y={y(d.views)} width={barW} height={Math.max(1, PAD.top + plotH - y(d.views))} rx="2" fill="var(--ins-views)" opacity="0.9" />
            ) : null}
          </g>
        ))}
        {n > 1 ? <path d={line} fill="none" stroke="var(--ins-visitors)" strokeWidth="2" strokeLinejoin="round" /> : null}
        {n <= 31
          ? daily.map((d, i) => (d.visitors > 0 ? <circle key={d.day} cx={x(i)} cy={y(d.visitors)} r="2.5" fill="var(--ins-visitors)" /> : null))
          : null}
        {labelIndexes(n).map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ins-text)">
            {shortDay(daily[i]!.day)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2">
        <details className="text-sm text-koi-ink/75">
          <summary className="cursor-pointer text-xs text-koi-ink/60 underline">View data as a table</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded border border-koi-ink/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-koi-paper text-koi-ink/60">
                <tr>
                  <th scope="col" className="px-2 py-1 font-medium">Day</th>
                  <th scope="col" className="px-2 py-1 text-right font-medium">Views</th>
                  <th scope="col" className="px-2 py-1 text-right font-medium">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.day} className="border-t border-koi-ink/5">
                    <th scope="row" className="px-2 py-1 font-normal">{shortDay(d.day)}</th>
                    <td className="px-2 py-1 text-right tabular-nums">{formatCount(d.views)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatCount(d.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figcaption>
    </figure>
  );
}
