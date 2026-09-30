import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';

// Formation colours - consistent palette
const FORMATION_COLORS: Record<string, string> = {
  Utsira: '#3b82f6',
  Hordaland: '#8b5cf6',
  Rogaland: '#f59e0b',
  Shetland: '#ef4444',
  'Cromer Knoll': '#10b981',
};
const DEFAULT_FORMATION_COLOR = '#64748b';

const EVENT_COLORS: Record<string, string> = {
  'Lost Circulation': '#ef4444',
  'Stuck Pipe': '#f97316',
  'High Torque': '#eab308',
  'Kick/Influx': '#dc2626',
  Vibration: '#a78bfa',
  'Hole Instability': '#fb923c',
  'Mud Issues': '#60a5fa',
  'Cementing Issues': '#34d399',
};

// ---- Types ----
interface FormationRow { name: string; depth_from: number; depth_to: number }
interface EventRow { id: number; event_type: string; depth_from: number; depth_to: number; severity: string; description: string; mitigation: string }
interface WellCorrelation {
  id: number; name: string; field: string; total_depth: number; current_depth: number;
  status: string; is_active: boolean;
  formations: FormationRow[];
  events: EventRow[];
}
interface CorrelationData { active_well: WellCorrelation; offset_wells: WellCorrelation[] }

// ---- Constants ----
const COL_W = 140;          // px per well column
const DEPTH_SCALE = 0.12;   // px per metre
const MIN_DEPTH = 0;

function depthToPx(depth: number) { return depth * DEPTH_SCALE; }

// ---- Formation stripe ----
function FormationStripe({ f, totalDepth }: { f: FormationRow; totalDepth: number }) {
  const top = depthToPx(f.depth_from);
  const height = depthToPx(Math.min(f.depth_to, totalDepth) - f.depth_from);
  const color = FORMATION_COLORS[f.name] || DEFAULT_FORMATION_COLOR;
  return (
    <div
      className="absolute left-0 right-0 flex items-center px-1 text-[9px] font-semibold overflow-hidden"
      style={{ top, height, background: color + '22', borderTop: `1px solid ${color}55`, color }}
    >
      {height > 16 ? f.name : ''}
    </div>
  );
}

// ---- Event marker ----
function EventMarker({ ev, tooltip, onHover }: { ev: EventRow; tooltip: boolean; onHover: (e: EventRow | null) => void }) {
  const top = depthToPx(ev.depth_from);
  const height = Math.max(depthToPx(ev.depth_to - ev.depth_from), 4);
  const color = EVENT_COLORS[ev.event_type] || '#f59e0b';
  return (
    <div
      className="absolute left-1 right-1 rounded cursor-pointer transition-opacity hover:opacity-100 opacity-80"
      style={{ top, height, background: color + '60', border: `1px solid ${color}`, zIndex: 10 }}
      onMouseEnter={() => onHover(ev)}
      onMouseLeave={() => onHover(null)}
    >
      {height > 12 && (
        <span className="text-[8px] font-bold leading-none px-0.5" style={{ color }}>
          {ev.event_type.slice(0, 4).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ---- Current depth marker ----
function CurrentDepthLine({ depth, maxDepth }: { depth: number; maxDepth: number }) {
  if (depth <= 0 || depth > maxDepth) return null;
  return (
    <div
      className="absolute left-0 right-0 border-t-2 border-dashed border-green-400 z-20 pointer-events-none"
      style={{ top: depthToPx(depth) }}
    >
      <span className="absolute right-0 text-[8px] text-green-400 font-bold -top-3">↓ {depth}m</span>
    </div>
  );
}

// ---- Depth ruler ----
function DepthRuler({ maxDepth }: { maxDepth: number }) {
  const ticks = [];
  for (let d = 0; d <= maxDepth; d += 500) {
    ticks.push(d);
  }
  return (
    <div className="relative flex-shrink-0" style={{ width: 52, height: depthToPx(maxDepth) }}>
      {ticks.map(d => (
        <div key={d} className="absolute right-0 flex items-center" style={{ top: depthToPx(d) - 7 }}>
          <span className="text-[9px] text-slate-500 pr-1">{d}</span>
          <div className="w-2 border-t border-slate-600" />
        </div>
      ))}
    </div>
  );
}

// ---- Well column ----
function WellColumn({
  well, maxDepth, onEventHover,
}: {
  well: WellCorrelation; maxDepth: number; onEventHover: (e: EventRow | null) => void;
}) {
  const heightPx = depthToPx(maxDepth);
  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: COL_W }}>
      {/* Well header */}
      <div className={`w-full text-center py-1.5 rounded-t text-xs font-bold mb-1 border-b ${
        well.is_active
          ? 'bg-green-500/10 text-green-400 border-green-500/30'
          : 'bg-slate-700 text-slate-300 border-slate-600'
      }`}>
        {well.name}
        {well.is_active && <span className="block text-[9px] text-green-500 font-normal">ACTIVE</span>}
        <span className="block text-[9px] text-slate-400 font-normal">{well.total_depth.toFixed(0)} m TD</span>
      </div>

      {/* Column body */}
      <div className="relative bg-slate-800/40 border border-slate-700 w-full" style={{ height: heightPx }}>
        {/* Formation stripes */}
        {well.formations.map(f => <FormationStripe key={f.name} f={f} totalDepth={maxDepth} />)}
        {/* Event markers */}
        {well.events.map(ev => <EventMarker key={ev.id} ev={ev} tooltip={false} onHover={onEventHover} />)}
        {/* Current depth line */}
        {well.is_active && <CurrentDepthLine depth={well.current_depth} maxDepth={maxDepth} />}
      </div>
    </div>
  );
}

export function DepthCorrelationPage() {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<EventRow | null>(null);

  const ACTIVE_WELL_ID = 1;

  useEffect(() => {
    fetch(`http://localhost:8001/api/depth-correlation/${ACTIVE_WELL_ID}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400">Loading depth correlation…</div>;
  if (error) return <div className="flex items-center justify-center h-full text-red-400">Error: {error}</div>;
  if (!data) return null;

  const allWells = [data.active_well, ...data.offset_wells];
  const maxDepth = Math.max(...allWells.map(w => w.total_depth));
  const totalHeightPx = depthToPx(maxDepth);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex-shrink-0">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BarChart2 size={20} className="text-amber-400" />
          Depth Correlation
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Formation and event alignment across active well and comparable offset wells. Hover events for detail.
        </p>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 flex-shrink-0">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Formations</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FORMATION_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1 text-[10px] text-slate-300">
                <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: color + '55', border: `1px solid ${color}` }} />
                {name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Events</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EVENT_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1 text-[10px] text-slate-300">
                <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: color + '60', border: `1px solid ${color}` }} />
                {name}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-5 h-0 border-t-2 border-dashed border-green-400 inline-block" /> Current depth
            </span>
          </div>
        </div>
      </div>

      {/* Hovered event tooltip */}
      {hoveredEvent && (
        <div className="flex-shrink-0 p-3 bg-slate-800 border border-amber-500/30 rounded text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-amber-400">{hoveredEvent.event_type}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">{hoveredEvent.depth_from.toFixed(0)}–{hoveredEvent.depth_to.toFixed(0)} m</span>
            <span className="text-slate-400">·</span>
            <span className={`font-semibold ${hoveredEvent.severity === 'Severe' ? 'text-red-400' : hoveredEvent.severity === 'High' ? 'text-orange-400' : 'text-yellow-400'}`}>{hoveredEvent.severity}</span>
          </div>
          <p className="text-slate-300">{hoveredEvent.description}</p>
          <p className="text-slate-400 mt-1"><span className="font-medium">Mitigation:</span> {hoveredEvent.mitigation}</p>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 overflow-auto bg-slate-900 rounded-lg border border-slate-700 p-4">
        <div className="flex gap-4 items-start" style={{ minWidth: allWells.length * COL_W + 80 }}>
          {/* Depth ruler */}
          <DepthRuler maxDepth={maxDepth} />

          {/* Well columns */}
          {allWells.map(well => (
            <WellColumn
              key={well.id}
              well={well}
              maxDepth={maxDepth}
              onEventHover={setHoveredEvent}
            />
          ))}
        </div>

        {/* Depth grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ top: 0, left: 52 }}
        >
          {Array.from({ length: Math.floor(maxDepth / 500) + 1 }, (_, i) => i * 500).map(d => (
            <div
              key={d}
              className="absolute left-0 right-0 border-t border-slate-700/40"
              style={{ top: depthToPx(d) + 50 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
