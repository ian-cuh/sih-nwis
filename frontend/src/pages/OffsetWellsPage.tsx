import { useState } from 'react';
import { OffsetWellMap } from '../features/map/OffsetWellMap';

const RADIUS_OPTIONS = [5, 10, 20, 50];

export function OffsetWellsPage() {
  const [radiusKm, setRadiusKm] = useState(10);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Offset Wells — GIS View</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Geospatial search centred on Active Well <strong className="text-slate-200">W-104</strong> (60.300°N, 2.100°E)
          </p>
        </div>

        {/* Radius selector */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded px-3 py-2">
          <span className="text-xs text-slate-400 font-medium">Radius</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  radiusKm === r
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend row */}
      <div className="flex items-center gap-4 text-xs text-slate-400 flex-shrink-0 -mt-2">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Active Well</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Comparable (same field, depth ±30%)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />Other Offset Well</span>
        <span className="ml-auto flex items-center gap-1 text-slate-500">
          <span className="bg-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono">SYNTHETIC</span>
          &nbsp;Demo data only — not real OIL data
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-slate-700 min-h-0">
        <OffsetWellMap radiusKm={radiusKm} />
      </div>
    </div>
  );
}
