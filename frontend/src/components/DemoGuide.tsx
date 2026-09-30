import { useState } from 'react';
import { Play, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';

const DEMO_STEPS = [
  "Active well W-104 is selected (Dashboard).",
  "Current depth is 2725 m (Top row metrics).",
  "Map shows nearby wells (GIS View).",
  "System identifies W-087, W-091 and W-095 as comparable (Calculated Profile).",
  "Depth correlation shows historical lost-circulation events ahead (2740-2780 m).",
  "Because W-104 is approaching this interval, Look-Ahead Alert appears.",
  "Engineer reviews Look-Ahead Alerts.",
  "System explains 'Why this alert was triggered' (Reason block).",
  "Engineer clicks 'View Evidence' dropdown on the alert.",
  "System shows historical source reports/events with FWR documents.",
  "Engineer opens AI Historical Search and asks: 'What happened in nearby wells around my current depth?'",
  "AI returns an evidence-backed answer using the historical NWIS dataset."
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  if (dismissed) return null;

  if (!open) {
    return (
      <button 
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce transition-colors"
      >
        <Play fill="currentColor" size={16} />
        Start Judge Demo Mode
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-slate-800 border border-amber-500/50 rounded-lg shadow-2xl flex flex-col overflow-hidden">
      <div className="bg-amber-500/20 border-b border-amber-500/30 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-amber-400" />
          <h3 className="font-bold text-amber-400 text-sm">NWIS Judge Demo Guide</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(false)} className="text-amber-400/70 hover:text-amber-400 p-1"><ChevronDown size={16} /></button>
          <button onClick={() => setDismissed(true)} className="text-amber-400/70 hover:text-amber-400 p-1"><X size={16} /></button>
        </div>
      </div>
      
      <div className="p-3 bg-slate-800 max-h-96 overflow-y-auto space-y-2">
        <p className="text-xs text-slate-400 mb-4 pb-2 border-b border-slate-700">
          Follow this sequence to demonstrate the core value of the NWIS prototype to the judges. All data is pre-seeded locally.
        </p>
        
        {DEMO_STEPS.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${activeStep === idx ? 'bg-slate-700/50 border border-slate-600' : 'hover:bg-slate-700/30'} ${activeStep > idx ? 'opacity-50' : ''}`}
            onClick={() => setActiveStep(idx)}
          >
            <div className="mt-0.5 flex-shrink-0">
              {activeStep > idx ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : activeStep === idx ? (
                <div className="w-4 h-4 rounded-full border-2 border-amber-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
              )}
            </div>
            <p className={`text-xs leading-relaxed ${activeStep === idx ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
              <strong className="text-slate-500">Step {idx + 1}:</strong> {step}
            </p>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-slate-700 bg-slate-900/50 flex justify-between items-center">
        <button 
          onClick={() => setActiveStep(0)}
          className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-200"
        >
          Reset Demo
        </button>
        <div className="flex gap-2">
          {activeStep < DEMO_STEPS.length && (
            <button 
              onClick={() => setActiveStep(prev => Math.min(prev + 1, DEMO_STEPS.length))}
              className="px-3 py-1.5 bg-amber-500 text-slate-900 text-xs font-bold rounded hover:bg-amber-400 transition-colors"
            >
              {activeStep === DEMO_STEPS.length - 1 ? 'Finish' : 'Next Step'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
