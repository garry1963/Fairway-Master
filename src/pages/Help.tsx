import { HelpCircle, Users, Calendar, Trophy, Map, FileSpreadsheet, BarChart3, Settings, Database, Layers, LineChart, Download, Globe, Award } from 'lucide-react';

export function Help() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-blue-600" />
          Help & Documentation
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Welcome to Fairway Master</h2>
          <p className="text-slate-600 mt-2">
            This guide will help you understand how to use the Golf Society Management App. 
            Navigate through the sections below to learn about the different features and settings available.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Members & Divisions */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Members & Divisions
            </h3>
            <div className="space-y-3 text-slate-600">
              <p>
                <strong>Members:</strong> Add and manage your society members here. You can set their initial Handicap Index and assign them to a starting Division.
              </p>
              <p>
                <strong>Divisions:</strong> Members are grouped into divisions (e.g., Division 1, 2, 3, 4) based on their skill level or performance. The Divisions page shows the current standings of members within their respective divisions, sorted by handicap.
              </p>
              <p className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                <strong>Tip:</strong> Divisions are automatically updated at the end of a season based on the promotion and relegation rules.
              </p>
            </div>
          </div>

          {/* Seasons */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Seasons
            </h3>
            <div className="space-y-3 text-slate-600">
              <p>
                <strong>Creating a Season:</strong> A season groups multiple tournaments together. When creating a season, specify the start/end dates and the total number of divisions your society uses.
              </p>
              <p>
                <strong>Ending a Season:</strong> At the end of a season, click the <span className="inline-flex items-center gap-1 font-medium text-indigo-700"><Award className="w-4 h-4" /> End Season & Update Divisions</span> button. This wizard will:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Calculate total Stableford points for all members across the season's tournaments.</li>
                <li>Rank members within their current divisions.</li>
                <li>Propose <strong>Promotions</strong> for the top 2 players in each division (moving them up).</li>
                <li>Propose <strong>Relegations</strong> for the bottom 2 players in each division (moving them down).</li>
              </ul>
              <p>You can review these changes before applying them to the database for the next season.</p>
            </div>
          </div>

          {/* Tournaments */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              Tournaments
            </h3>
            <div className="space-y-3 text-slate-600">
              <p>
                <strong>Creating a Tournament:</strong> Tournaments belong to a Season and are played at a specific Course. You can specify:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Start & End Dates:</strong> For single-day or multi-day events.</li>
                <li><strong>Number of Rounds:</strong> Specify if the tournament spans multiple rounds.</li>
                <li><strong>Format:</strong> Choose between Stableford, Stroke Play, etc.</li>
                <li><strong>Major Status:</strong> Mark a tournament as a "Major" to award double points (if your society rules apply this).</li>
              </ul>
            </div>
          </div>

          {/* Courses */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-600" />
              Courses
            </h3>
            <div className="space-y-3 text-slate-600">
              <p>
                <strong>Adding a Course:</strong> Enter the course details including Course Rating (CR) and Slope Rating (SR). You must also enter the Par, Yardage, and Stroke Index (SI) for all 18 holes.
              </p>
              <p className="flex items-start gap-2">
                <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Web Search Integration:</strong> When adding a new course, type the name and click "Search Web for Info" to quickly find the course scorecard online. You can also click the globe icon next to any saved course to search for it later.
                </span>
              </p>
            </div>
          </div>

          {/* Scores & Leaderboards */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Scores & Leaderboards
            </h3>
            <div className="space-y-3 text-slate-600">
              <p>
                <strong>Entering Scores:</strong> Select a tournament and a member, then enter their gross score for each hole. The app will automatically calculate:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Playing Handicap:</strong> Based on the member's Handicap Index and the Course's Slope/Rating.</li>
                <li><strong>Net Score:</strong> Gross score minus the strokes received on each hole (based on Stroke Index).</li>
                <li><strong>Stableford Points:</strong> Calculated automatically based on the net score vs par for each hole.</li>
              </ul>
              <p>
                <strong>Leaderboards:</strong> View the standings for any tournament, sorted automatically by Stableford points or Net Score depending on the format.
              </p>
            </div>
          </div>

          {/* Settings & Backup */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              Settings & Backup
            </h3>
            <div className="space-y-3 text-slate-600">
              <p>
                <strong>Settings:</strong> Configure your society name, default handicap system (e.g., WHS, CONGU), and points allocation system.
              </p>
              <p>
                <strong>Backup & Restore:</strong> All data is stored locally in your browser using IndexedDB (Dexie). 
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Export:</strong> Download a JSON file containing all your members, courses, tournaments, and scores. Keep this safe!</li>
                <li><strong>Import:</strong> Restore your data from a previously downloaded JSON backup file.</li>
                <li><strong>Clear Data:</strong> Permanently delete all data from your browser. Use with extreme caution.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
