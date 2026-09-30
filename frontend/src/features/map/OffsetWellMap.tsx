import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip, useMap } from 'react-leaflet';
import type { NearbyWell } from '../../types';
import { WellDetailPanel } from './WellDetailPanel';
import { api } from '../../api/client';
import 'leaflet/dist/leaflet.css';

// Custom dark tile layer URL (CartoDB dark matter)
const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_44m4_1_97ec2d44cec8c83fba4f7eb0';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// The active demo well fixed position
const ACTIVE_WELL_ID_NAME = 'W-104';

interface Props {
  radiusKm: number;
}

// Helper to recenter map when radiusKm changes
function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function isComparable(well: NearbyWell, activeWell: NearbyWell): boolean {
  if (well.id === activeWell.id) return false;
  const depthRatio = Math.abs(well.total_depth - activeWell.total_depth) / activeWell.total_depth;
  return well.field === activeWell.field && depthRatio < 0.30;
}

export function OffsetWellMap({ radiusKm }: Props) {
  const [wells, setWells] = useState<NearbyWell[]>([]);
  const [activeWell, setActiveWellState] = useState<NearbyWell | null>(null);
  const [selected, setSelected] = useState<NearbyWell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Use W-104's known coordinates as the query center
    api.getNearbyWells(60.3, 2.1, radiusKm)
      .then(data => {
        setWells(data);
        const active = data.find(w => w.name === ACTIVE_WELL_ID_NAME) || null;
        setActiveWellState(active);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [radiusKm]);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-slate-900 text-slate-400">
      Loading offset wells…
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full bg-slate-900 text-red-400">
      Error: {error}
    </div>
  );

  const center: [number, number] = [60.3, 2.1];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={11}
        className="h-full w-full"
        style={{ background: '#0f172a' }}
        zoomControl={true}
      >
        <MapFlyTo center={center} />
        <TileLayer url={DARK_TILE} attribution={TILE_ATTR} />

        {/* Search radius ring */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#f59e0b', weight: 1, dashArray: '6 4', fillOpacity: 0.04, fillColor: '#f59e0b' }}
        />

        {wells.map(well => {
          const isActive = well.name === ACTIVE_WELL_ID_NAME;
          const isSelected = selected?.id === well.id;
          const comparable = activeWell ? isComparable(well, activeWell) : false;

          // Color logic
          let color = '#64748b'; // grey – generic offset
          if (isActive) color = '#22c55e';     // green – active well
          else if (isSelected) color = '#f59e0b'; // amber – selected
          else if (comparable) color = '#f59e0b'; // amber – comparable

          return (
            <CircleMarker
              key={well.id}
              center={[well.latitude, well.longitude]}
              radius={isActive ? 10 : 7}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isActive ? 0.9 : 0.5,
                weight: isActive ? 3 : isSelected ? 2.5 : 1.5,
              }}
              eventHandlers={{
                click: () => setSelected(well),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent={isActive}>
                <div className="text-xs font-mono">
                  <span className="font-bold">{well.name}</span>
                  {isActive && ' ★ ACTIVE'}
                  {!isActive && comparable && ' ◆'}
                  <br />
                  {well.field} · {well.distance_km.toFixed(2)} km
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Well detail panel */}
      {selected && activeWell && (
        <WellDetailPanel
          well={selected}
          activeWell={activeWell}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 border border-slate-700 rounded p-3 text-xs space-y-1.5">
        <p className="text-slate-300 font-semibold mb-2 text-[11px] uppercase tracking-wider">Legend</p>
        <LegendItem color="#22c55e" label="Active Well (W-104)" />
        <LegendItem color="#f59e0b" label="Comparable Offset Well" />
        <LegendItem color="#64748b" label="Other Offset Well" />
      </div>

      {/* Well list sidebar */}
      <div className="absolute top-4 left-4 z-[1000] w-52 bg-slate-900/90 border border-slate-700 rounded max-h-[60%] overflow-y-auto">
        <p className="px-3 py-2 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-700 font-semibold">
          {wells.length} Wells · {radiusKm} km
        </p>
        {wells.map(w => {
          const isActive = w.name === ACTIVE_WELL_ID_NAME;
          const comparable = activeWell ? isComparable(w, activeWell) : false;
          return (
            <button
              key={w.id}
              onClick={() => setSelected(w)}
              className={`w-full text-left px-3 py-2 text-xs border-b border-slate-800 hover:bg-slate-800 transition-colors ${
                selected?.id === w.id ? 'bg-slate-800' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: isActive ? '#22c55e' : comparable ? '#f59e0b' : '#64748b' }}
                />
                <span className="font-semibold text-slate-200">{w.name}</span>
                {comparable && <span className="text-amber-500 text-[10px]">◆</span>}
              </div>
              <p className="text-slate-400 mt-0.5 pl-3.5">
                {w.distance_km.toFixed(2)} km · {w.event_count} events
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </div>
  );
}
