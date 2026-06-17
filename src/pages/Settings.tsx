import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Percent, ShieldCheck, Scale, Info, Database } from 'lucide-react';

export function Settings() {
  const [apiName, setApiName] = useState(() => localStorage.getItem('golfCourseApiName') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('golfCourseApiKey') || '');
  
  // Society Preferences
  const [societyName, setSocietyName] = useState(() => localStorage.getItem('societyName') || 'My Golf Society');
  const [handicapSystem, setHandicapSystem] = useState(() => localStorage.getItem('handicapSystem') || 'World Handicap System (WHS)');
  const [pointsSystem, setPointsSystem] = useState(() => localStorage.getItem('pointsSystem') || 'Standard (25, 20, 18, 16...)');
  const [mainEventMultiplier, setMainEventMultiplier] = useState(() => localStorage.getItem('mainEventMultiplier') || '1.5');

  const handleSave = () => {
    localStorage.setItem('golfCourseApiName', apiName);
    localStorage.setItem('golfCourseApiKey', apiKey);
    
    localStorage.setItem('societyName', societyName);
    localStorage.setItem('handicapSystem', handicapSystem);
    localStorage.setItem('pointsSystem', pointsSystem);
    localStorage.setItem('mainEventMultiplier', mainEventMultiplier);
    
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 pb-12">
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
            <input 
              type="text" 
              value={societyName}
              onChange={(e) => setSocietyName(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Handicap System</label>
            <select 
              value={handicapSystem}
              onChange={(e) => setHandicapSystem(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            >
              <option value="World Handicap System (WHS)">World Handicap System (WHS)</option>
              <option value="CONGU">CONGU</option>
              <option value="EGA">EGA</option>
              <option value="Custom Society Handicap">Custom Society Handicap</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Points Allocation System</label>
            <select 
              value={pointsSystem}
              onChange={(e) => setPointsSystem(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            >
              <option value="Standard (25, 20, 18, 16...)">Standard (25, 20, 18, 16...)</option>
              <option value="FedEx Cup Style">FedEx Cup Style</option>
              <option value="Stableford points system">Stableford points system</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Main Event Points Multiplier (1.0 to 2.0)
            </label>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={mainEventMultiplier}
                onChange={(e) => setMainEventMultiplier(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1.0"
                  max="2.0"
                  step="0.01"
                  value={mainEventMultiplier}
                  onChange={(e) => setMainEventMultiplier(e.target.value)}
                  onBlur={() => {
                    let numeric = parseFloat(mainEventMultiplier);
                    if (isNaN(numeric)) {
                      setMainEventMultiplier('1.5');
                    } else if (numeric < 1) {
                      setMainEventMultiplier('1.0');
                    } else if (numeric > 2) {
                      setMainEventMultiplier('2.0');
                    } else {
                      setMainEventMultiplier(String(Math.round(numeric * 100) / 100));
                    }
                  }}
                  className="w-20 text-center font-bold text-slate-800 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 border text-sm"
                />
                <span className="text-sm font-semibold text-slate-600">x</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-1.5">
              Specify the default multiplier applied to Stableford scores in Main Event tournaments. Any decimal value from 1 to 2 is supported here.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Percent className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Recommended Handicap Allowances</h2>
            <p className="text-sm text-slate-500 mt-1">These allowances are applied to a player's Course Handicap to determine their Playing Handicap for a specific competition. Using these standard percentages is considered the "best" way to balance winning chances between low and high handicappers.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Format of Play</th>
                <th className="px-4 py-3 font-medium">Recommended Allowance</th>
                <th className="px-4 py-3 font-medium">Reason for Setting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">Individual Stroke Play / Stableford</td>
                <td className="px-4 py-3">
                  <select className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 border text-sm" defaultValue="95%">
                    <option value="100%">100%</option>
                    <option value="95%">95%</option>
                    <option value="90%">90%</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">Provides the most balanced chances of winning for all golfers in a single field.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">Individual Match Play</td>
                <td className="px-4 py-3">
                  <select className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 border text-sm" defaultValue="100%">
                    <option value="100%">100%</option>
                    <option value="95%">95%</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">Fair because a low-handicapped golfer is competing against only one high-handicapper.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">Four-Ball Stroke Play</td>
                <td className="px-4 py-3">
                  <select className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 border text-sm" defaultValue="85%">
                    <option value="90%">90%</option>
                    <option value="85%">85%</option>
                    <option value="80%">80%</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">Standard for better-ball formats; some regions allow trials of 90%.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">Four-Ball Match Play</td>
                <td className="px-4 py-3">
                  <select className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 border text-sm" defaultValue="90%">
                    <option value="100%">100%</option>
                    <option value="90%">90%</option>
                    <option value="85%">85%</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">Recommended by bodies like England Golf to maintain equity in team play.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">Scramble (4 players)</td>
                <td className="px-4 py-3">
                  <select className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 border text-sm" defaultValue="25/20/15/10">
                    <option value="25/20/15/10">25% / 20% / 15% / 10%</option>
                    <option value="10">10% combined</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">Calculated from lowest to highest handicap in the team.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-6 h-6 text-emerald-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Core WHS Settings & Rules</h2>
            <p className="text-sm text-slate-500 mt-1">These settings are globally standardized to ensure your handicap is accurate and "portable" to any course.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900">Handicap Index Calculation</h3>
                  <p className="text-sm text-slate-600 mt-1">Your index is an average-based calculation of the best 8 of your last 20 score differentials.</p>
                  <div className="mt-3">
                    <select className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-sm" defaultValue="8_of_20">
                      <option value="8_of_20">Best 8 of last 20 scores</option>
                      <option value="10_of_20">Best 10 of last 20 scores</option>
                      <option value="all">Average of all scores</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900">Maximum Hole Score</h3>
                  <p className="text-sm text-slate-600 mt-1">For handicapping purposes, the maximum score on any hole is a Net Double Bogey (Par + 2 + any handicap strokes received on that hole).</p>
                  <div className="mt-3">
                    <select className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-sm" defaultValue="net_double_bogey">
                      <option value="net_double_bogey">Net Double Bogey</option>
                      <option value="triple_bogey">Triple Bogey</option>
                      <option value="no_limit">No Limit</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900">Maximum Handicap Index</h3>
                  <p className="text-sm text-slate-600 mt-1">The system allows a maximum index of 54.0 for both men and women to encourage participation.</p>
                  <div className="mt-3">
                    <input type="number" defaultValue={54.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900">Course Rating minus Par</h3>
                  <p className="text-sm text-slate-600 mt-1">Effective in 2024, Course Handicaps now include the difference between the Course Rating and Par, meaning you play "to par" rather than to the rating.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <input type="checkbox" id="cr_minus_par" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                    <label htmlFor="cr_minus_par" className="text-sm text-slate-700 font-medium">Enable CR - Par adjustment</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Safeguards for Accuracy</h2>
            <p className="text-sm text-slate-500 mt-1">The system includes built-in "settings" to prevent handicaps from moving too far or staying too high after an exceptional round.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-900">Soft Cap</h3>
              <p className="text-sm text-slate-600 mt-2 mb-4">If a player's index rises 3.0 strokes above their Low Handicap Index (from the last 365 days), further increases are slowed by 50%.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Threshold (strokes)</label>
                  <input type="number" defaultValue={3.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reduction %</label>
                  <input type="number" defaultValue={50} className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-900">Hard Cap</h3>
              <p className="text-sm text-slate-600 mt-2 mb-4">A player's index cannot rise more than 5.0 strokes above their Low Handicap Index.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Max Increase (strokes)</label>
                  <input type="number" defaultValue={5.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="enable_hard_cap" defaultChecked className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4" />
                  <label htmlFor="enable_hard_cap" className="text-sm text-slate-700 font-medium">Enable Hard Cap</label>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-900">Exceptional Score Reduction (ESR)</h3>
              <p className="text-sm text-slate-600 mt-2 mb-4">If you shoot 7.0–9.9 strokes better than your index, you receive a -1.0 stroke reduction; 10.0+ strokes better results in a -2.0 reduction.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tier 1 Diff</label>
                    <input type="number" defaultValue={7.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Reduction</label>
                    <input type="number" defaultValue={-1.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tier 2 Diff</label>
                    <input type="number" defaultValue={10.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Reduction</label>
                    <input type="number" defaultValue={-2.0} step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Integrations</h2>
            <p className="text-sm text-slate-500 mt-1">Configure external services and APIs.</p>
          </div>
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-4">GolfCourseAPI Database</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                <input 
                  type="text" 
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                  placeholder="e.g. My Golf Society"
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-2 border" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Secret API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your GolfCourseAPI key"
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-2 border" 
                />
                <p className="text-xs text-slate-500 mt-2">
                  This key is required to search and auto-fill course details when adding a new course. You can get a free API key at <a href="https://golfcourseapi.com/" target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">golfcourseapi.com</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-colors text-lg"
        >
          Save All Settings
        </button>
      </div>
    </div>
  );
}
