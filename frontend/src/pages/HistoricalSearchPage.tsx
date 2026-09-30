import { useState } from 'react';
import { Search, Loader2, Bot, Database, ShieldAlert, BookOpen } from 'lucide-react';

interface AskResponse {
  question: string;
  answer: string;
  evidence: any[];
  relevant_wells: any[];
  provider: {
    name: string;
    is_mock: boolean;
  };
  disclaimer: string;
}

export function HistoricalSearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('http://localhost:8001/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const SEV_COLORS: Record<string, string> = {
    Severe: 'text-red-400 border-red-400/30 bg-red-400/10',
    High: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    Medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    Low: 'text-sky-400 border-sky-400/30 bg-sky-400/10',
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex-shrink-0">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Search size={20} className="text-amber-400" />
          Historical Search & RAG
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Ask questions about historical drilling events, mitigations, and formations across all offset wells.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex-shrink-0 flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-500" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            placeholder="e.g. What mitigation was used for lost circulation in the Shetland formation?"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-amber-600 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
          {loading ? 'Analysing...' : 'Ask NWIS AI'}
        </button>
      </form>

      {/* Pre-canned examples (shown if no result and no loading) */}
      {!loading && !result && !error && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-slate-500 mr-1 mt-1">Examples:</span>
          {["What drilling problems occurred near 2750 m?", "Which nearby wells had lost circulation?", "What happened in Formation X?", "What mitigation was used for lost circulation?"].map(ex => (
            <button
              key={ex}
              type="button"
              onClick={() => { setQuery(ex); }}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results Area */}
      {result && (
        <div className="flex-1 overflow-auto flex flex-col gap-5 min-h-0">
          
          {/* AI Answer Block */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-amber-400" />
                <h3 className="font-semibold text-slate-200">NWIS AI Synthesis</h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${result.provider.is_mock ? 'bg-slate-700/50 text-slate-400 border-slate-600' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                {result.provider.name.toUpperCase()}
              </span>
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap">
              {result.answer}
            </div>

            <div className="mt-5 p-3 bg-amber-500/5 border border-amber-500/20 rounded flex items-start gap-2 text-xs text-amber-200/70">
              <ShieldAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <span>{result.disclaimer}</span>
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Database size={16} />
              <h3 className="font-semibold text-sm">Supporting Evidence from Database</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {result.evidence.length} historical events found
              </span>
            </div>

            {result.evidence.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-500 text-sm">
                No historical events matched this query in the current dataset.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {result.evidence.map((ev: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-200 text-sm">{ev.well_name}</span>
                        <span className="text-slate-500 ml-2">{ev.well_field} Field</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${SEV_COLORS[ev.severity] || SEV_COLORS.Low}`}>
                        {ev.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 font-mono mt-1">
                      <span>{ev.depth_from.toFixed(0)}–{ev.depth_to.toFixed(0)} m</span>
                      <span>·</span>
                      <span className="text-slate-300 font-sans font-medium">{ev.event_type}</span>
                    </div>

                    {ev.formation_name && (
                      <p className="text-slate-400"><span className="text-slate-500">Formation:</span> {ev.formation_name}</p>
                    )}

                    <div className="mt-1 space-y-1.5">
                      <p className="text-slate-300"><span className="text-slate-500 font-medium">Description:</span> {ev.description}</p>
                      <p className="text-slate-300"><span className="text-slate-500 font-medium">Mitigation:</span> {ev.mitigation}</p>
                    </div>

                    {ev.source_document && (
                      <div className="mt-auto pt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <BookOpen size={12} />
                        <span>Source: {ev.source_document.filename}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
