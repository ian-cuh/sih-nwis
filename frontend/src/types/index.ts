export interface Well {
  id: number;
  name: string;
  field: string;
  latitude: number;
  longitude: number;
  spud_date: string | null;
  completion_date: string | null;
  total_depth: number;
  current_depth: number;
  well_type: string;
  trajectory: string;
  status: string;
  is_synthetic: boolean;
}

export interface NearbyWell extends Well {
  distance_km: number;
  event_count: number;
}

export interface Formation {
  id: number;
  well_id: number;
  name: string;
  depth_from: number;
  depth_to: number;
}

export interface DrillingEvent {
  id: number;
  well_id: number;
  event_type: string;
  depth_from: number;
  depth_to: number;
  formation_name: string;
  severity: string;
  description: string;
  cause: string;
  mitigation: string;
  outcome: string;
  source_document_id: number | null;
  created_at: string;
}

export interface Document {
  id: number;
  well_id: number;
  filename: string;
  document_type: string;
  date: string | null;
  page: number | null;
  extracted_text: string | null;
}
