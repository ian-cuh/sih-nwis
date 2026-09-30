import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Map, BarChart2, Search, Bell, FileText, Settings } from 'lucide-react';
import { OffsetWellsPage } from './pages/OffsetWellsPage';
import { AlertsPage } from './pages/AlertsPage';
import { DepthCorrelationPage } from './pages/DepthCorrelationPage';
import { HistoricalSearchPage } from './pages/HistoricalSearchPage';
import { ActiveWellPage } from './pages/ActiveWellPage';
import { DashboardPage } from './pages/DashboardPage';
import { DemoGuide } from './components/DemoGuide';

const NAV_ITEMS = [
  { to: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/active-well', icon: <Target size={16} />, label: 'Active Well' },
  { to: '/offset-wells', icon: <Map size={16} />, label: 'Offset Wells' },
  { to: '/depth-correlation', icon: <BarChart2 size={16} />, label: 'Depth Correlation' },
  { to: '/historical-search', icon: <Search size={16} />, label: 'Historical Search' },
  { to: '/alerts', icon: <Bell size={16} />, label: 'Alerts' },
  { to: '/documents', icon: <FileText size={16} />, label: 'Documents' },
];

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
        active
          ? 'bg-slate-700 text-amber-400 font-semibold'
          : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-amber-500 tracking-widest">NWIS</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">eRTMAC Nearby Wells Intelligence</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => <NavLink key={item.to} {...item} />)}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded text-sm text-slate-400 hover:bg-slate-700/60 hover:text-slate-200">
            <Settings size={16} /> Settings
          </Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20 text-xs">● Online</span>
            <span className="text-slate-400 text-xs">Active Well: <strong className="text-slate-200">W-104</strong></span>
            <span className="text-slate-400 text-xs">Depth: <strong className="text-slate-200">2725 m</strong></span>
            <span className="text-slate-400 text-xs">Formation: <strong className="text-slate-200">Shetland</strong></span>
          </div>
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">SYNTHETIC DEMO DATA</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden p-5">
          {children}
        </main>
      </div>
    </div>
  );
}

// Dashboard replaced by DashboardPage

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500 text-lg">{title} — coming in a future phase</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/active-well" element={<ActiveWellPage />} />
          <Route path="/offset-wells" element={<OffsetWellsPage />} />
          <Route path="/depth-correlation" element={<DepthCorrelationPage />} />
          <Route path="/historical-search" element={<HistoricalSearchPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/documents" element={<Placeholder title="Documents" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Routes>
      </Layout>
      <DemoGuide />
    </Router>
  );
}

export default App;
