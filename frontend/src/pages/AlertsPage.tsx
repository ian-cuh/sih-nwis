import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Shield, CheckCircle, XCircle } from 'lucide-react';

interface Evidence {
  event_id: number;
  well_id: number;
  well_name: string;
  depth_from: number;
  depth_to: number;
  severity: string;
  description: string;
  mitigation: string;
  outcome: string;
  formation_name: string;
  source_document_id: number | null;
}

interface LookaheadAlert {
  active_well_id: number;
  active_well_name: string;
  current_depth: number;
  alert_type: string;
  event_type: string;
  depth_from: number;
  depth_to: number;
  severity: string;
  formation_names: string[];
  comparable_well_count: number;
  evidence_count: number;
  reason: string;
  evidence: Evidence[];
  disclaimer: string;
}

const SEV: Record<string, { border: string; badge: string; icon: string }> = {
  Severe: { border: 'border-red-500/50', badge: 'bg-red-500/10 text-red-400 border-red-500/30', icon: 'text-red-400' },
  High:   { border: 'border-orange-500/50', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: 'text-orange-400' },
  Medium: { border: 'border-yellow-500/50', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', icon: 'text-yellow-400' },
  Low:    { border: 'border-sky-500/50', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: 'text-sky-400' },
};

function EvidenceCard({ ev }: { ev: Evidence }) {
  const sev = SEV[ev.severity] || SEV.Low;
  return (
    <div className={`bg-slate-800/60 border rounded p-3 text-xs ${sev.border}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-bold text-slate-200">{ev.well_name}</span>
        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${sev.badge}`}>{ev.severity}</span>
      </div>
      <p className="text-slate-400 mb-1">{ev.depth_from.toFixed(0)}–{ev.depth_to.toFixed(0)} m · {ev.formation_name}</p>
      <p className="text-slate-300 mb-1">{ev.description}</p>
      <p className="text-slate-400"><span className="text-slate-500 font-medium">Mitigation:</span> {ev.mitigation}</p>
      {ev.source_document_id && (
        <button className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/20 transition-colors">
          <FileText size={12} /> Open Source Document #{ev.source_document_id}
        </button>
      )}
    </div>
  );
}

function AlertCard({ alert, onDismiss }: { alert: LookaheadAlert, onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const sev = SEV[alert.severity] || SEV.Low;

  const distance = Math.max(0, alert.depth_from - alert.current_depth);

  return (
    <div className={`bg-slate-800 border rounded-lg overflow-hidden transition-all ${acknowledged ? 'opacity-60 border-slate-700' : sev.border}`}>
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className={acknowledged ? 'text-slate-500' : sev.icon} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{alert.alert_type}</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${acknowledged ? 'bg-slate-700 text-slate-400 border-slate-600' : sev.badge}`}>{alert.severity}</span>
                {acknowledged && <span className="text-[10px] text-green-400 font-bold ml-2 flex items-center gap-1"><CheckCircle size={10} /> ACKNOWLEDGED</span>}
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-0.5">{alert.event_type}</h3>
            </div>
          </div>
          <div className="text-right text-xs flex-shrink-0">
            <p className="text-slate-400">Distance to interval</p>
            <p className="text-slate-200 font-mono font-semibold">{distance.toFixed(0)} m</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-3 mt-4 text-xs">
          <Metric label="Current Depth" value={`${alert.current_depth} m`} />
          <Metric label="Event Interval" value={`${alert.depth_from}–${alert.depth_to} m`} />
          <Metric label="Offset Wells" value={String(alert.comparable_well_count)} sub="with this event" />
          <Metric label="Formation(s)" value={alert.formation_names.join(', ') || '—'} />
        </div>

        {/* Reason */}
        <div className="mt-4 p-3 bg-slate-900/60 rounded border border-slate-700 text-xs text-slate-300 leading-relaxed">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Why this alert was triggered</p>
          {alert.reason}
        </div>

        {/* Disclaimer */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 text-[10px] text-slate-500 max-w-xl">
            <Shield size={11} className="mt-0.5 flex-shrink-0" />
            <span>{alert.disclaimer}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => setAcknowledged(true)} 
              disabled={acknowledged}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${acknowledged ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed' : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'}`}
            >
              <CheckCircle size={14} /> Acknowledge
            </button>
            <button 
              onClick={onDismiss}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors"
            >
              <XCircle size={14} /> Dismiss
            </button>
          </div>
        </div>
      </div>

      {/* Evidence toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/40 border-t border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-colors"
      >
        <span className="font-semibold">View Evidence ({alert.evidence.length} historical events from offset wells)</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="p-4 border-t border-slate-700 space-y-2 bg-slate-900/20">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">
            Historical drilling events — source: offset well records
          </p>
          {alert.evidence.map(ev => <EvidenceCard key={ev.event_id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-900/50 rounded p-2 border border-slate-700">
      <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-slate-100 font-bold mt-0.5">{value}</p>
      {sub && <p className="text-slate-500 text-[10px]">{sub}</p>}
    </div>
  );
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<LookaheadAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // W-104 is always well id=1 in our seeded data
  const ACTIVE_WELL_ID = 1;

  useEffect(() => {
    fetch(`http://localhost:8001/api/alerts/active/${ACTIVE_WELL_ID}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => { setAlerts(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleDismiss = (index: number) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full overflow-auto gap-5">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Look-ahead Historical Context Alerts</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active Well: <strong className="text-slate-200">W-104</strong> · Current Depth: <strong className="text-slate-200">2725 m</strong> · Look-ahead window: 200 m
            </p>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded border text-xs font-bold ${alerts.length > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}`}>
                {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Clarification banner */}
        <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded flex items-start gap-2 text-xs text-amber-200/70">
          <Shield size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <span>
            <strong className="text-amber-400">Decision Support Tool Only.</strong> These alerts are based on
            historical events recorded in comparable offset wells. They are not predictions and do not
            guarantee any event will occur. Always apply professional drilling engineering judgement.
          </span>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-4">
        {loading && <p className="text-slate-500 text-center py-10">Computing look-ahead alerts…</p>}
        {error && <p className="text-red-400 text-center py-10">Error loading alerts: {error}</p>}
        {!loading && !error && alerts.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Shield size={32} className="mx-auto mb-3 opacity-30" />
            <p>No historical events found in the look-ahead window for comparable offset wells.</p>
          </div>
        )}
        {alerts.map((a, i) => (
          <AlertCard key={i} alert={a} onDismiss={() => handleDismiss(i)} />
        ))}
      </div>
    </div>
  );
}
