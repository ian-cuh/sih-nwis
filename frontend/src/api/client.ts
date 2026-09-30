import type { Well, NearbyWell, Formation, DrillingEvent, Document } from '../types';

const BASE_URL = 'http://localhost:8000/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  getWells: () => get<Well[]>('/wells'),
  getWell: (id: number) => get<Well>(`/wells/${id}`),

  getNearbyWells: (lat: number, lng: number, radiusKm: number) =>
    get<NearbyWell[]>(`/wells/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`),

  getFormations: (wellId: number) => get<Formation[]>(`/formations?well_id=${wellId}`),
  getEvents: (wellId: number) => get<DrillingEvent[]>(`/events?well_id=${wellId}`),
  getDocuments: (wellId: number) => get<Document[]>(`/documents?well_id=${wellId}`),
};
