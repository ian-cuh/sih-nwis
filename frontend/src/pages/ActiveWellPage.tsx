import { useState, useEffect } from 'react';
import { Target, Activity, Map, ArrowRight } from 'lucide-react';

export function ActiveWellPage() {
  const [similarityData, setSimilarityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8001/api/wells/1/similar')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch similarity data');
        return res.json();
      })
      .then(data => {
        setSimilarityData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-slate-400">Loading well data and computing similarity scores...</div>;
  if (error) return <div className="p-10 text-red-400">Error: {error}</div>;
  if (!similarityData) return null;

  const { active_well, similar_wells, disclaimer } = similarityData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full gap-5 overflow-auto pb-10">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Target size={20} className="text-amber-400" />
          Active Well: {active_well.name}
        </h2>
        <div className="text-sm text-slate-400 mt-2 flex gap-6">
          <span>Field: <strong className="text-slate-200">{active_well.field}</strong></span>
          <span>Target Depth: <strong className="text-slate-200">{active_well.total_depth} m</strong></span>
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs uppercase tracking-wider">Active Drilling</span>
        </div>
      </div>

      {/* Similarity Engine Section */}
      <div className="mt-4 border-t border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Activity size={18} className="text-amber-400" />
              Offset Well Similarity Engine
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Algorithms computed across distance, formations, depth, trajectory, and drilling context.
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded flex items-start gap-2 text-xs text-amber-200/70 mb-5">
          <span>⚠️ {disclaimer}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {similar_wells.map((well: any, idx: number) => (
            <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700/50">
                <div>
                  <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    {well.well_name}
                    {idx === 0 && <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 uppercase tracking-widest">Most Similar</span>}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Overall Historical Relevance</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(well.overall_score)}`}>
                    {well.overall_score.toFixed(0)}<span className="text-lg text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {well.components.map((comp: any, cidx: number) => (
                  <div key={cidx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">{comp.name}</span>
                      <span className={`font-mono ${getScoreColor(comp.score)}`}>{comp.score.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${comp.score >= 80 ? 'bg-green-500' : comp.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${comp.score}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-24 text-right truncate" title={comp.reason}>{comp.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
