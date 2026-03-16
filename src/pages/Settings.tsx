import { Settings as SettingsIcon } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900">Society Preferences</h2>
        </div>

        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Society Name</label>
            <input type="text" defaultValue="My Golf Society" className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Handicap System</label>
            <select className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
              <option>World Handicap System (WHS)</option>
              <option>CONGU</option>
              <option>EGA</option>
              <option>Custom Society Handicap</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Points Allocation System</label>
            <select className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
              <option>Standard (25, 20, 18, 16...)</option>
              <option>FedEx Cup Style</option>
              <option>Stableford points system</option>
              <option>Custom</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
