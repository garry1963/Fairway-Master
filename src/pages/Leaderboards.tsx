import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, BarChart3, Medal } from 'lucide-react';
import { db } from '../db';
import { format } from 'date-fns';

export function Leaderboards() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const scoreCards = useLiveQuery(
    () => selectedTournamentId 
      ? db.scoreCards.where('tournamentId').equals(Number(selectedTournamentId)).toArray()
      : []
  );

  const getLeaderboardData = () => {
    if (!scoreCards || !members) return [];

    const data = scoreCards.map(score => {
      const member = members.find(m => m.id === score.memberId);
      return {
        ...score,
        memberName: member?.name || 'Unknown',
        handicap: member?.handicapIndex || 0,
        division: member?.divisionId || 0
      };
    });

    // Sort by Stableford points descending
    return data.sort((a, b) => b.stablefordPoints - a.stablefordPoints);
  };

  const leaderboardData = getLeaderboardData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Leaderboards</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Tournament</label>
          <select 
            value={selectedTournamentId} 
            onChange={(e) => setSelectedTournamentId(e.target.value ? Number(e.target.value) : '')}
            className="w-full md:w-1/2 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            <option value="">-- Select Tournament --</option>
            {tournaments?.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({format(new Date(t.date), 'MMM d, yyyy')})</option>
            ))}
          </select>
        </div>

        {selectedTournamentId ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="px-6 py-3 font-medium w-16 text-center">Pos</th>
                  <th className="px-6 py-3 font-medium">Player</th>
                  <th className="px-6 py-3 font-medium text-center">Hcp</th>
                  <th className="px-6 py-3 font-medium text-center">Div</th>
                  <th className="px-6 py-3 font-medium text-center">Gross</th>
                  <th className="px-6 py-3 font-medium text-center">Net</th>
                  <th className="px-6 py-3 font-medium text-center text-blue-700 font-bold">Stableford</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leaderboardData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No scores entered for this tournament yet.
                    </td>
                  </tr>
                ) : (
                  leaderboardData.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-center">
                        {index === 0 ? <Medal className="w-5 h-5 text-yellow-500 mx-auto" /> :
                         index === 1 ? <Medal className="w-5 h-5 text-slate-400 mx-auto" /> :
                         index === 2 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                         <span className="font-medium text-slate-500">{index + 1}</span>}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{row.memberName}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{row.handicap.toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{row.division}</td>
                      <td className="px-6 py-4 text-center font-medium">{row.grossScore}</td>
                      <td className="px-6 py-4 text-center font-medium">{row.netScore}</td>
                      <td className="px-6 py-4 text-center font-bold text-blue-600 text-lg">{row.stablefordPoints}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>Select a tournament to view the leaderboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
