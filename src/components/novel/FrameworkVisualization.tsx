import { FrameworkBeat, StoryFramework } from "@/lib/story-frameworks";

type VizMode = "linear" | "grid" | "circle" | "pyramid";

interface FrameworkVisualizationProps {
  framework: StoryFramework;
  mode: VizMode;
  /** Set of beat IDs that have at least one scene assigned. */
  filledBeatIds?: Set<string>;
}

export default function FrameworkVisualization({ framework, mode, filledBeatIds }: FrameworkVisualizationProps) {
  const { beats } = framework;

  if (mode === "grid") return <GridViz beats={beats} filledBeatIds={filledBeatIds} />;
  if (mode === "circle") return <CircleViz beats={beats} name={framework.shortName} filledBeatIds={filledBeatIds} />;
  if (mode === "pyramid") return <PyramidViz beats={beats} filledBeatIds={filledBeatIds} />;
  return <LinearViz beats={beats} filledBeatIds={filledBeatIds} />;
}

function LinearViz({ beats, filledBeatIds }: { beats: FrameworkBeat[]; filledBeatIds?: Set<string> }) {
  return (
    <div className="space-y-1.5">
      {beats.map((beat, i) => {
        const filled = filledBeatIds?.has(beat.id) ?? false;
        return (
          <div
            key={beat.id}
            className={`flex items-start gap-3 rounded-sm border-2 px-4 py-3 shadow-none transition-colors ${
              filled
                ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500/70"
                : "border-border/70 bg-card/80 hover:border-primary/30"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border text-[11px] font-bold font-mono ${
                filled
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "border-primary/30 bg-primary/15 text-primary"
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">{beat.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono">~{beat.percentage}%</span>
                {beat.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-sm border border-border bg-secondary px-1.5 py-0 text-[9px] font-medium text-secondary-foreground"
                  >
                    {t}
                  </span>
                ))}
                {filled && (
                  <span className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                    ✓ scene assigned
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{beat.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridViz({ beats, filledBeatIds }: { beats: FrameworkBeat[]; filledBeatIds?: Set<string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Beat</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">%</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tags</th>
          </tr>
        </thead>
        <tbody>
          {beats.map((beat, i) => {
            const filled = filledBeatIds?.has(beat.id) ?? false;
            return (
              <tr
                key={beat.id}
                className={`border-b border-border/30 transition-colors hover:bg-muted ${filled ? "bg-emerald-500/5" : ""}`}
              >
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                  {filled ? <span className="text-emerald-600 font-bold">✓</span> : i + 1}
                </td>
                <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{beat.title}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{beat.description}</td>
                <td className="px-3 py-2.5 text-right text-xs font-mono text-muted-foreground">{beat.percentage}%</td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    {beat.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-sm border border-border bg-secondary px-1.5 py-0 text-[9px] font-medium text-secondary-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CircleViz({
  beats,
  name,
  filledBeatIds,
}: {
  beats: FrameworkBeat[];
  name: string;
  filledBeatIds?: Set<string>;
}) {
  const size = 280;
  const center = size / 2;
  const radius = 110;

  return (
    <div className="flex justify-center py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer circle */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <circle
          cx={center}
          cy={center}
          r={radius - 30}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />

        {/* Center label */}
        <text x={center} y={center - 6} textAnchor="middle" className="fill-primary text-[11px] font-semibold">
          {name}
        </text>
        <text x={center} y={center + 10} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          {beats.length} beats
        </text>

        {/* Beat nodes */}
        {beats.map((beat, i) => {
          const angle = (i / beats.length) * Math.PI * 2 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const labelRadius = radius + 28;
          const lx = center + labelRadius * Math.cos(angle);
          const ly = center + labelRadius * Math.sin(angle);

          return (
            <g key={beat.id}>
              {/* Connector */}
              <line x1={center} y1={center} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* Node */}
              <circle
                cx={x}
                cy={y}
                r={8}
                className={
                  filledBeatIds?.has(beat.id)
                    ? "fill-emerald-500/30 stroke-emerald-500"
                    : "fill-primary/20 stroke-primary"
                }
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={y + 3.5}
                textAnchor="middle"
                className={
                  filledBeatIds?.has(beat.id)
                    ? "fill-emerald-700 text-[8px] font-bold font-mono"
                    : "fill-primary text-[8px] font-bold font-mono"
                }
              >
                {filledBeatIds?.has(beat.id) ? "✓" : i + 1}
              </text>
              {/* Label - shortened */}
              <text x={lx} y={ly + 3} textAnchor="middle" className="fill-foreground text-[8px]">
                {beat.title.length > 16 ? beat.title.slice(0, 14) + "…" : beat.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PyramidViz({ beats, filledBeatIds }: { beats: FrameworkBeat[]; filledBeatIds?: Set<string> }) {
  const width = 500;
  const height = 200;
  const padding = 40;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  // Find the climax (highest point) — usually near the middle
  const climaxIdx = beats.findIndex((b) => b.title.toLowerCase().includes("climax"));
  const peakIdx = climaxIdx >= 0 ? climaxIdx : Math.floor(beats.length / 2);

  const points = beats.map((_, i) => {
    const x = padding + (i / (beats.length - 1)) * usableWidth;
    // Create pyramid shape peaking at climax
    const distFromPeak = Math.abs(i - peakIdx) / Math.max(peakIdx, beats.length - 1 - peakIdx);
    const y = padding + usableHeight - (1 - distFromPeak) * usableHeight;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="flex justify-center py-4 overflow-x-auto">
      <svg width={width} height={height + 30} viewBox={`0 0 ${width} ${height + 30}`}>
        {/* Baseline */}
        <line
          x1={padding}
          y1={padding + usableHeight}
          x2={width - padding}
          y2={padding + usableHeight}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        {/* Curve */}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${padding + usableHeight} L ${points[0].x} ${padding + usableHeight} Z`}
          fill="hsl(var(--primary))"
          fillOpacity="0.08"
        />
        {/* Nodes */}
        {points.map((p, i) => {
          const beat = beats[i];
          const filled = filledBeatIds?.has(beat.id) ?? false;
          return (
            <g key={beat.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                className={filled ? "fill-emerald-500/40 stroke-emerald-500" : "fill-primary/30 stroke-primary"}
                strokeWidth="1.5"
              />
              <text x={p.x} y={height + 14} textAnchor="middle" className="fill-foreground text-[8px]">
                {beat.title.length > 14 ? beat.title.slice(0, 12) + "…" : beat.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
