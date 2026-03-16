import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, BarChart3, Medal, CalendarDays } from 'lucide-react';
import { db } from '../db';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export function Leaderboards() {
  const [viewMode, setViewMode] = useState<'tournament' | 'season'>('tournament');
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | ''>('');
  
  const seasons = useLiveQuery(() => db.seasons.toArray());
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  
  const tournamentScoreCards = useLiveQuery(
    () => selectedTournamentId 
      ? db.scoreCards.where('tournamentId').equals(Number(selectedTournamentId)).toArray()
      : [],
    [selectedTournamentId]
  );

  const seasonScoreCards = useLiveQuery(
    async () => {
      if (!selectedSeasonId || !tournaments) return [];
      const tIds = tournaments.filter(t => t.seasonId === Number(selectedSeasonId)).map(t => t.id!);
      if (tIds.length === 0) return [];
      return db.scoreCards.where('tournamentId').anyOf(tIds).toArray();
    },
    [selectedSeasonId, tournaments]
  );

  const getTournamentLeaderboardData = () => {
    if (!tournamentScoreCards || !members) return [];

    const data = tournamentScoreCards.map(score => {
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

  const getSeasonLeaderboardData = () => {
    if (!seasonScoreCards || !members || !selectedSeasonId || !seasons) return [];
    
    const season = seasons.find(s => s.id === Number(selectedSeasonId));
    if (!season) return [];

    // Aggregate scores by member
    const memberStats: Record<number, { memberId: number, name: string, division: number, totalPoints: number, rounds: number }> = {};
    
    seasonScoreCards.forEach(score => {
      if (!memberStats[score.memberId]) {
        const member = members.find(m => m.id === score.memberId);
        memberStats[score.memberId] = {
          memberId: score.memberId,
          name: member?.name || 'Unknown',
          division: member?.divisionId || 0,
          totalPoints: 0,
          rounds: 0
        };
      }
      memberStats[score.memberId].totalPoints += score.stablefordPoints;
      memberStats[score.memberId].rounds += 1;
    });

    const allStats = Object.values(memberStats);

    // Group by division
    const divisions: { division: number, players: typeof allStats }[] = [];
    for (let i = 1; i <= season.numDivisions; i++) {
      const playersInDiv = allStats.filter(s => s.division === i).sort((a, b) => b.totalPoints - a.totalPoints);
      divisions.push({
        division: i,
        players: playersInDiv
      });
    }

    return divisions;
  };

  const tournamentLeaderboardData = getTournamentLeaderboardData();
  const seasonLeaderboardData = getSeasonLeaderboardData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Leaderboards</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex gap-4 mb-8 border-b border-slate-200 pb-4">
          <button
            onClick={() => setViewMode('tournament')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors",
              viewMode === 'tournament' 
                ? "bg-indigo-50 text-indigo-700" 
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Trophy className="w-4 h-4" />
            Tournament Leaderboard
          </button>
          <button
            onClick={() => setViewMode('season')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors",
              viewMode === 'season' 
                ? "bg-indigo-50 text-indigo-700" 
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Season Standings
          </button>
        </div>

        {viewMode === 'tournament' ? (
          <>
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Tournament</label>
              <select 
                value={selectedTournamentId} 
                onChange={(e) => setSelectedTournamentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full md:w-1/2 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
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
                      <th className="px-6 py-3 font-medium text-center text-indigo-700 font-bold">Stableford</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tournamentLeaderboardData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          No scores entered for this tournament yet.
                        </td>
                      </tr>
                    ) : (
                      tournamentLeaderboardData.map((row, index) => (
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
                          <td className="px-6 py-4 text-center font-bold text-indigo-600 text-lg">{row.stablefordPoints}</td>
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
          </>
        ) : (
          <>
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Season</label>
              <select 
                value={selectedSeasonId} 
                onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : '')}
                className="w-full md:w-1/2 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              >
                <option value="">-- Select Season --</option>
                {seasons?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {selectedSeasonId ? (
              <div className="space-y-8">
                {seasonLeaderboardData.map(divData => (
                  <div key={divData.division} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                      <h3 className="font-bold text-slate-900">Division {divData.division}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-white text-slate-500 border-b border-slate-100">
                            <th className="px-6 py-3 font-medium w-16 text-center">Pos</th>
                            <th className="px-6 py-3 font-medium">Player</th>
                            <th className="px-6 py-3 font-medium text-center">Rounds Played</th>
                            <th className="px-6 py-3 font-medium text-center text-indigo-700 font-bold">Total Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {divData.players.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-slate-500 bg-white">
                                No players in this division have recorded scores yet.
                              </td>
                            </tr>
                          ) : (
                            divData.players.map((player, index) => (
                              <tr key={player.memberId} className="bg-white hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-center">
                                  {index === 0 ? <Medal className="w-5 h-5 text-yellow-500 mx-auto" /> :
                                   index === 1 ? <Medal className="w-5 h-5 text-slate-400 mx-auto" /> :
                                   index === 2 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                                   <span className="font-medium text-slate-500">{index + 1}</span>}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">{player.name}</td>
                                <td className="px-6 py-4 text-center text-slate-600">{player.rounds}</td>
                                <td className="px-6 py-4 text-center font-bold text-indigo-600 text-lg">{player.totalPoints}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>Select a season to view divisional standings.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
