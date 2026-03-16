import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Trophy, Map, FileSpreadsheet, BarChart3, Settings, Database, Layers, LineChart, Download, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Members', path: '/members', icon: Users },
  { name: 'Seasons', path: '/seasons', icon: Calendar },
  { name: 'Divisions', path: '/divisions', icon: Layers },
  { name: 'Tournaments', path: '/tournaments', icon: Trophy },
  { name: 'Courses', path: '/courses', icon: Map },
  { name: 'Scores', path: '/scores', icon: FileSpreadsheet },
  { name: 'Leaderboards', path: '/leaderboards', icon: BarChart3 },
  { name: 'Statistics', path: '/statistics', icon: LineChart },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Backup', path: '/backup', icon: Download },
  { name: 'Help', path: '/help', icon: HelpCircle },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider">GOLF MANAGER</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-2 text-slate-400">
            <Database className="w-4 h-4" />
            <span className="text-sm">Local SQLite (Dexie)</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
