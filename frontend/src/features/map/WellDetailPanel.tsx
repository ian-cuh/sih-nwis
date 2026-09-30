import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { DrillingEvent, Formation, Document as WellDoc, NearbyWell } from '../../types';
import { X, AlertTriangle, Layers, FileText, Info } from 'lucide-react';

const SEVERITY_COLOR: Record<string, string> = {
  Severe: 'text-red-400 bg-red-400/10 border-red-500/30',
  High: 'text-orange-400 bg-orange-400/10 border-orange-500/30',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  Low: 'text-sky-400 bg-sky-400/10 border-sky-500/30',
};

// Deterministic comparable check: same field, completed, total_depth within 30%
function isComparable(well: NearbyWell, activeWell: NearbyWell): boolean {
  if (well.id === activeWell.id) return false;
  const depthRatio = Math.abs(well.total_depth - activeWell.total_depth) / activeWell.total_depth;
  return well.field === activeWell.field && depthRatio < 0.30;
}

interface Props {
  well: NearbyWell;
  activeWell: NearbyWell;
  onClose: () => void;
}

export function WellDetailPanel({ well, activeWell, onClose }: Props) {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [events, setEvents] = useState<DrillingEvent[]>([]);
  const [docs, setDocs] = useState<WellDoc[]>([]);
  const [tab, setTab] = useState<'info' | 'formations' | 'events' | 'docs'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getFormations(well.id),
      api.getEvents(well.id),
      api.getDocuments(well.id),
    ]).then(([f, e, d]) => {
      setFormations(f);
      setEvents(e);
      setDocs(d);
      setLoading(false);
    });
  }, [well.id]);

  const comparable = isComparable(well, activeWell);

  const tabs = [
    { key: 'info', label: 'Info', icon: <Info size={13} /> },
    { key: 'formations', label: `Formations (${formations.length})`, icon: <Layers size={13} /> },
    { key: 'events', label: `Events (${events.length})`, icon: <AlertTriangle size={13} /> },
    { key: 'docs', label: `Docs (${docs.length})`, icon: <FileText size={13} /> },
  ] as const;

  return (
    <div className="absolute top-4 right-4 z-[1000] w-80 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl flex flex-col max-h-[calc(100%-2rem)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-start justify-between gap-2 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-100">{well.name}</h3>
            {comparable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                ◆ COMPARABLE
              </span>
            )}
            {well.is_synthetic && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                SYNTHETIC
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{well.field} Field · {well.distance_km.toFixed(2)} km away</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 mt-0.5 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 p-4 text-xs">
        {loading ? (
          <p className="text-slate-500 text-center py-6">Loading...</p>
        ) : (
          <>
            {tab === 'info' && (
              <div className="space-y-3">
                <Row label="Status" value={well.status} highlight={well.status === 'Active'} />
                <Row label="Well Type" value={well.well_type} />
                <Row label="Trajectory" value={well.trajectory} />
                <Row label="Total Depth" value={`${well.total_depth.toFixed(0)} m`} />
                <Row label="Current Depth" value={`${well.current_depth.toFixed(0)} m`} />
                <Row label="Distance" value={`${well.distance_km.toFixed(2)} km`} />
                <Row label="Historical Events" value={String(events.length)} />
                <Row label="Spud Date" value={well.spud_date ? new Date(well.spud_date).toLocaleDateString() : '—'} />
                <Row label="Completion" value={well.completion_date ? new Date(well.completion_date).toLocaleDateString() : 'Active'} />
                {well.is_synthetic && (
                  <p className="mt-3 text-slate-500 border-t border-slate-700 pt-3">
                    ⚠ Synthetic demo data. Not real well data.
                  </p>
                )}
              </div>
            )}

            {tab === 'formations' && (
              formations.length === 0 ? <Empty text="No formations recorded." /> :
              <div className="space-y-2">
                {formations.map(f => (
                  <div key={f.id} className="bg-slate-800 border border-slate-700 rounded p-2">
                    <p className="font-semibold text-slate-200">{f.name}</p>
                    <p className="text-slate-400">{f.depth_from.toFixed(0)} – {f.depth_to.toFixed(0)} m</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'events' && (
              events.length === 0 ? <Empty text="No drilling events recorded." /> :
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className={`border rounded p-2 ${SEVERITY_COLOR[e.severity] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold">{e.event_type}</p>
                      <span className="text-xs opacity-80 flex-shrink-0">{e.severity}</span>
                    </div>
                    <p className="opacity-70 mt-0.5">{e.depth_from.toFixed(0)} – {e.depth_to.toFixed(0)} m · {e.formation_name}</p>
                    <p className="text-slate-300 mt-1">{e.description}</p>
                    <p className="text-slate-400 mt-1"><span className="font-medium">Mitigation:</span> {e.mitigation}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'docs' && (
              docs.length === 0 ? <Empty text="No documents available." /> :
              <div className="space-y-2">
                {docs.map(d => (
                  <div key={d.id} className="bg-slate-800 border border-slate-700 rounded p-2 flex items-start gap-2">
                    <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-200">{d.filename}</p>
                      <p className="text-slate-400">{d.document_type} · {d.date ? new Date(d.date).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium text-right ${highlight ? 'text-green-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-slate-500 text-center py-4">{text}</p>;
}
