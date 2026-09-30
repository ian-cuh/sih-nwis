import { useState, useEffect } from 'react';
import { Target, AlertTriangle, Shield, Search, X } from 'lucide-react';
import { OffsetWellMap } from '../features/map/OffsetWellMap';
import { HistoricalSearchPage } from './HistoricalSearchPage';
import { DepthCorrelationPage } from './DepthCorrelationPage';

export function DashboardPage() {
  const [activeWell, setActiveWell] = useState<any>(null);
  const [nearby, setNearby] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    // Fetch Active Well
    fetch('http://localhost:8001/api/wells/1')
      .then(r => r.json())
      .then(data => setActiveWell(data));

    // Fetch Nearby
    fetch('http://localhost:8001/api/wells/nearby?lat=60.3&lng=2.1&radius_km=20')
      .then(r => r.json())
      .then(data => setNearby(data));

    // Fetch Alerts
    fetch('http://localhost:8001/api/alerts/active/1')
      .then(r => r.json())
      .then(data => setAlerts(data));
  }, []);

  const totalEvents = nearby.reduce((sum, w) => sum + (w.event_count || 0), 0);
  const comparableCount = nearby.filter(w => w.field === 'Troll').length; // simple approximation for UI

  if (!activeWell) return <div className="p-10 text-slate-400">Loading dashboard...</div>;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden relative">
      
      {/* 1. TOP ROW: Active Well Info */}
      <div className="flex-shrink-0 flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400">
              <Target size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Well</p>
              <p className="text-2xl font-bold text-slate-100">{activeWell.name}</p>
            </div>
          </div>
          <div className="h-8 border-r border-slate-700" />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Current Depth</p>
            <p className="text-xl font-bold text-slate-100">{activeWell.current_depth} <span className="text-sm font-normal text-slate-400">m</span></p>
          </div>
          <div className="h-8 border-r border-slate-700" />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Current Formation</p>
            <p className="text-xl font-bold text-slate-100">Shetland</p>
          </div>
          <div className="h-8 border-r border-slate-700" />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Well Status</p>
            <p className="text-lg font-bold text-green-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Drilling
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 text-right">
          <span className="px-2 py-1 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] uppercase font-bold tracking-widest rounded shadow-inner">
            Synthetic Demo Data
          </span>
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 rounded-md transition-colors font-semibold text-sm shadow-lg shadow-amber-500/5"
          >
            <Search size={16} /> AI Historical Search
          </button>
        </div>
      </div>

      {/* 2. SECOND ROW: Metrics */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-4">
        <MetricCard label="Nearby Wells" value={nearby.length} sub="Within 20 km" type="Historical" />
        <MetricCard label="Comparable Wells" value={comparableCount} sub="Same field & profile" type="Calculated" />
        <MetricCard label="Historical Events" value={totalEvents} sub="Recorded in area" type="Historical" />
        <MetricCard label="Active Look-Ahead Alerts" value={alerts.length} sub="Within 200m ahead" type="Calculated" highlight={alerts.length > 0} />
      </div>

      {/* 3. MAIN AREA: Map, Alerts, Correlation */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        
        {/* Left Column (Map + Correlation) */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Map */}
          <div className="flex-[3] relative rounded-lg border border-slate-700 overflow-hidden bg-slate-800 flex flex-col">
            <div className="absolute top-4 right-4 z-[1000] flex gap-2 pointer-events-none">
               <span className="px-2 py-1 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300 text-[10px] uppercase font-bold rounded shadow-lg pointer-events-auto">
                 Historical GIS
               </span>
            </div>
            <OffsetWellMap radiusKm={20} />
          </div>

          {/* Depth Correlation */}
          <div className="flex-[2] rounded-lg border border-slate-700 overflow-hidden bg-slate-800 relative">
             <div className="absolute top-4 right-4 z-[1000] flex gap-2 pointer-events-none">
               <span className="px-2 py-1 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300 text-[10px] uppercase font-bold rounded shadow-lg pointer-events-auto">
                 Calculated Correlation
               </span>
            </div>
            {/* We scale down the correlation page slightly to fit nicely without its own padding overriding */}
            <div className="h-full w-full overflow-hidden [&>div]:p-4 [&>div>div:first-child]:hidden">
               <DepthCorrelationPage />
            </div>
          </div>
        </div>

        {/* Right Column (Look-Ahead Alerts) */}
        <div className="w-[380px] bg-slate-800 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between flex-shrink-0">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Look-Ahead Alerts
            </h3>
            <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 text-[9px] uppercase font-bold rounded">
              Calculated
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {alerts.length === 0 ? (
               <div className="text-center py-10 text-slate-500">
                 <Shield size={24} className="mx-auto mb-2 opacity-30" />
                 <p className="text-sm">No active alerts ahead.</p>
               </div>
            ) : (
              alerts.map((alert, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-red-500/30 rounded p-3 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-red-400 font-bold">{alert.event_type}</span>
                    <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold rounded">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">
                    Interval: <span className="font-mono text-amber-400">{alert.depth_from}–{alert.depth_to} m</span>
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
                    {alert.reason}
                  </p>
                  <div className="flex justify-end gap-2 border-t border-slate-700/50 pt-2">
                    <button className="text-[10px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors">Dismiss</button>
                    <button className="text-[10px] font-bold text-green-400 hover:text-green-300 uppercase tracking-wider transition-colors">Acknowledge</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* AI Historical Search Overlay / Panel */}
      {searchOpen && (
        <div className="absolute inset-0 z-[2000] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="w-[800px] bg-slate-900 h-full shadow-2xl border-l border-slate-700 flex flex-col relative z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
              <div className="flex items-center gap-3">
                <Search className="text-amber-400" size={20} />
                <h2 className="text-lg font-bold text-slate-100">AI Historical Search</h2>
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] uppercase font-bold rounded ml-2">
                  AI-Generated
                </span>
              </div>
              <button onClick={() => setSearchOpen(false)} className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {/* Inject the actual search page component here. We hide its native header via css to blend it. */}
              <div className="absolute inset-0 [&>div>div:first-child]:hidden [&>div]:h-full [&>div]:p-6">
                <HistoricalSearchPage />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ label, value, sub, type, highlight = false }: { label: string, value: string | number, sub: string, type: string, highlight?: boolean }) {
  return (
    <div className={`bg-slate-800 border rounded-lg p-4 flex flex-col relative overflow-hidden ${highlight ? 'border-red-500/50' : 'border-slate-700'}`}>
      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
        {type}
      </span>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-red-400' : 'text-slate-100'}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}
