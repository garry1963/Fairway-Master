import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, BarChart3, Medal, CalendarDays, Info, Download } from 'lucide-react';
import { db } from '../db';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

export function Leaderboards() {
  const [viewMode, setViewMode] = useState<'tournament' | 'season'>('tournament');
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | ''>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | 'all'>('all');
  
  const seasons = useLiveQuery(() => db.seasons.toArray());
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const divisions = useLiveQuery(() => db.divisions.toArray());
  
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

    const memberMap: Record<number, {
      id: number;
      memberId: number;
      memberName: string;
      handicap: number;
      division: string;
      grossScore: number;
      netScore: number;
      stablefordPoints: number;
      roundsPlayed: number;
    }> = {};

    tournamentScoreCards.forEach(score => {
      const member = members.find(m => m.id === score.memberId);
      const div = divisions?.find(d => d.id === member?.divisionId);
      const mId = score.memberId;
      
      if (!memberMap[mId]) {
        memberMap[mId] = {
          id: score.id || mId,
          memberId: mId,
          memberName: member?.name || 'Unknown',
          handicap: member?.handicapIndex || 0,
          division: div?.name || `Division ${member?.divisionId}`,
          grossScore: 0,
          netScore: 0,
          stablefordPoints: 0,
          roundsPlayed: 0
        };
      }
      
      memberMap[mId].grossScore += score.grossScore;
      memberMap[mId].netScore += score.netScore;
      memberMap[mId].stablefordPoints += score.stablefordPoints;
      memberMap[mId].roundsPlayed += 1;
    });

    const data = Object.values(memberMap);

    // Sort by Stableford points descending
    return data.sort((a, b) => b.stablefordPoints - a.stablefordPoints);
  };

  const getSeasonLeaderboardData = () => {
    if (!seasonScoreCards || !members || !selectedSeasonId || !seasons || !divisions) return [];
    
    const season = seasons.find(s => s.id === Number(selectedSeasonId));
    if (!season) return [];

    // Aggregate scores by member
    const memberStats: Record<number, { memberId: number, name: string, divisionId: number, totalPoints: number, rounds: number, totalGross: number, handicap: number }> = {};
    
    seasonScoreCards.forEach(score => {
      if (!memberStats[score.memberId]) {
        const member = members.find(m => m.id === score.memberId);
        memberStats[score.memberId] = {
          memberId: score.memberId,
          name: member?.name || 'Unknown',
          divisionId: member?.divisionId || 0,
          totalPoints: 0,
          rounds: 0,
          totalGross: 0,
          handicap: member?.handicapIndex || 0
        };
      }
      memberStats[score.memberId].totalPoints += score.stablefordPoints;
      if (score.grossScore > 0) {
        memberStats[score.memberId].rounds += 1;
        memberStats[score.memberId].totalGross += score.grossScore;
      }
    });

    const allStats = Object.values(memberStats).map(s => ({
      ...s,
      averageScore: s.rounds > 0 ? (s.totalGross / s.rounds).toFixed(1) : '0.0'
    }));

    // Group by division
    const divisionsData: { divisionId: number, divisionName: string, players: typeof allStats }[] = [];
    
    divisions.forEach(div => {
      if (selectedDivisionId !== 'all' && div.id !== selectedDivisionId) return;
      
      const playersInDiv = allStats
        .filter(s => s.divisionId === div.id && s.rounds >= 4)
        .sort((a, b) => b.totalPoints - a.totalPoints);
        
      divisionsData.push({
        divisionId: div.id!,
        divisionName: div.name,
        players: playersInDiv
      });
    });

    return divisionsData;
  };

  const tournamentLeaderboardData = getTournamentLeaderboardData();
  const seasonLeaderboardData = getSeasonLeaderboardData();

  const handleExportPDF = async () => {
    const element = document.getElementById('leaderboard-content');
    if (!element) return;

    const canvas = await toCanvas(element, { pixelRatio: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`leaderboard_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Leaderboards</h1>
        <button 
          onClick={handleExportPDF}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
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

        <div id="leaderboard-content" className="bg-white">
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
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{row.memberName}</div>
                              {(tournaments?.find(t => t.id === Number(selectedTournamentId))?.numberOfRounds || 1) > 1 && (
                                <div className="text-xs text-slate-500 font-normal">
                                  {row.roundsPlayed} of {tournaments?.find(t => t.id === Number(selectedTournamentId))?.numberOfRounds || 1} rounds played
                                </div>
                              )}
                            </td>
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
              <div className="mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Season</label>
                  <select 
                    value={selectedSeasonId} 
                    onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  >
                    <option value="">-- Select Season --</option>
                    {seasons?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Division</label>
                  <select 
                    value={selectedDivisionId} 
                    onChange={(e) => setSelectedDivisionId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  >
                    <option value="all">All Divisions</option>
                    {divisions?.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSeasonId ? (
                <div className="space-y-8">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Qualification Rule:</strong> A minimum of 4 rounds of hole scores must be added before a member's points total is added to their associated division leaderboard.
                    </p>
                  </div>
                  {seasonLeaderboardData.map(divData => (
                    <div key={divData.divisionId} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">{divData.divisionName}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-white text-slate-500 border-b border-slate-100">
                              <th className="px-6 py-3 font-medium w-16 text-center">Rank</th>
                              <th className="px-6 py-3 font-medium">Name</th>
                              <th className="px-6 py-3 font-medium text-center">Handicap</th>
                              <th className="px-6 py-3 font-medium text-center">Rounds Played</th>
                              <th className="px-6 py-3 font-medium text-center">Avg. Score</th>
                              <th className="px-6 py-3 font-medium text-center text-indigo-700 font-bold">Total Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {divData.players.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 bg-white">
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
                                  <td className="px-6 py-4 text-center text-slate-600">{player.handicap.toFixed(1)}</td>
                                  <td className="px-6 py-4 text-center text-slate-600">{player.rounds}</td>
                                  <td className="px-6 py-4 text-center text-slate-600">{player.averageScore}</td>
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
    </div>
  );
}
