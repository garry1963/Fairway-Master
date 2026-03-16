import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Trophy, Target, TrendingUp } from 'lucide-react';
import { db } from '../db';

export function Statistics() {
  const members = useLiveQuery(() => db.members.toArray());
  const scoreCards = useLiveQuery(() => db.scoreCards.toArray());

  // Calculate some basic stats
  const getPlayerStats = () => {
    if (!members || !scoreCards) return [];

    return members.map(member => {
      const memberScores = scoreCards.filter(s => s.memberId === member.id);
      const roundsPlayed = memberScores.length;
      const avgStableford = roundsPlayed > 0 
        ? memberScores.reduce((sum, s) => sum + s.stablefordPoints, 0) / roundsPlayed 
        : 0;
      const bestRound = roundsPlayed > 0
        ? Math.max(...memberScores.map(s => s.stablefordPoints))
        : 0;

      return {
        ...member,
        roundsPlayed,
        avgStableford,
        bestRound
      };
    }).sort((a, b) => b.avgStableford - a.avgStableford);
  };

  const stats = getPlayerStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Statistics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 rounded-lg text-white bg-blue-500">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Highest Avg Stableford</p>
            <p className="text-xl font-bold text-slate-900">
              {stats.length > 0 && stats[0].roundsPlayed > 0 ? `${stats[0].name} (${stats[0].avgStableford.toFixed(1)})` : '-'}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 rounded-lg text-white bg-emerald-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Best Single Round</p>
            <p className="text-xl font-bold text-slate-900">
              {stats.length > 0 && Math.max(...stats.map(s => s.bestRound)) > 0 
                ? `${stats.reduce((prev, current) => (prev.bestRound > current.bestRound) ? prev : current).name} (${Math.max(...stats.map(s => s.bestRound))} pts)` 
                : '-'}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 rounded-lg text-white bg-purple-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Most Rounds Played</p>
            <p className="text-xl font-bold text-slate-900">
              {stats.length > 0 && Math.max(...stats.map(s => s.roundsPlayed)) > 0
                ? `${stats.reduce((prev, current) => (prev.roundsPlayed > current.roundsPlayed) ? prev : current).name} (${Math.max(...stats.map(s => s.roundsPlayed))})`
                : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Player Averages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Player</th>
                <th className="px-6 py-3 font-medium text-center">Rounds</th>
                <th className="px-6 py-3 font-medium text-center">Avg Stableford</th>
                <th className="px-6 py-3 font-medium text-center">Best Round</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No statistics available yet.
                  </td>
                </tr>
              ) : (
                stats.map((stat) => (
                  <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{stat.name}</td>
                    <td className="px-6 py-4 text-center">{stat.roundsPlayed}</td>
                    <td className="px-6 py-4 text-center font-medium text-blue-600">{stat.avgStableford.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-medium">{stat.bestRound}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
