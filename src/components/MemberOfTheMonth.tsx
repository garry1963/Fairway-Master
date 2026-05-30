import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Award, Trophy, Medal, Calendar, Flame } from 'lucide-react';
import { db } from '../db';

export function MemberOfTheMonth() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const data = useLiveQuery(async () => {
    const seasonsList = await db.seasons.toArray();
    const tournamentsList = await db.tournaments.toArray();
    const scoreCardsList = await db.scoreCards.toArray();
    const membersList = await db.members.toArray();
    const divisionsList = await db.divisions.toArray();

    if (!scoreCardsList.length || !membersList.length) {
      return null;
    }

    // Determine current season (the latest one by startDate)
    const currentSeason = seasonsList.length > 0
      ? [...seasonsList].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
      : null;

    // Filter tournaments matching current season. If no seasons exist, fallback to all tournaments.
    const relevantTournaments = currentSeason
      ? tournamentsList.filter(t => t.seasonId === currentSeason.id)
      : tournamentsList;

    if (!relevantTournaments.length) {
      return {
        seasonName: currentSeason ? currentSeason.name : 'All-Time',
        months: [],
        monthDataMap: {}
      };
    }

    // Map tournament IDs to tournament objects for fast lookup
    const tournamentMap = new Map();
    relevantTournaments.forEach(t => {
      tournamentMap.set(t.id, t);
    });

    // Group scorecards by YYYY-MM
    const scoreCardsByMonth = new Map<string, typeof scoreCardsList>();

    scoreCardsList.forEach(card => {
      const tournament = tournamentMap.get(card.tournamentId);
      if (!tournament) return; // Not in current season / relevant list

      const date = new Date(tournament.date);
      if (isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!scoreCardsByMonth.has(monthKey)) {
        scoreCardsByMonth.set(monthKey, []);
      }
      scoreCardsByMonth.get(monthKey)!.push(card);
    });

    if (scoreCardsByMonth.size === 0) {
      return {
        seasonName: currentSeason ? currentSeason.name : 'All-Time',
        months: [],
        monthDataMap: {}
      };
    }

    // Sort months descending (most recent first)
    const sortedMonthKeys = Array.from(scoreCardsByMonth.keys()).sort((a, b) => b.localeCompare(a));

    const monthDataMap: Record<string, {
      memberId: number;
      name: string;
      handicap: number;
      divisionName: string;
      points: number;
      roundsCount: number;
    }[]> = {};

    sortedMonthKeys.forEach(monthKey => {
      const cards = scoreCardsByMonth.get(monthKey)!;
      const statsMap: Record<number, { points: number; roundsCount: number }> = {};

      cards.forEach(card => {
        if (!statsMap[card.memberId]) {
          statsMap[card.memberId] = { points: 0, roundsCount: 0 };
        }
        statsMap[card.memberId].points += card.stablefordPoints;
        statsMap[card.memberId].roundsCount += 1;
      });

      // Map to full player objects and keep only active members
      const playersList = Object.entries(statsMap)
        .map(([memberIdStr, stats]) => {
          const memberId = Number(memberIdStr);
          const member = membersList.find(m => m.id === memberId);
          
          // Only show active members
          if (!member || !member.isActive) return null;

          const div = divisionsList.find(d => d.id === member.divisionId);
          return {
            memberId,
            name: member.name,
            handicap: member.handicapIndex,
            divisionName: div ? div.name : `Division ${member.divisionId}`,
            points: Number(stats.points.toFixed(1)),
            roundsCount: stats.roundsCount
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => b.points - a.points);

      monthDataMap[monthKey] = playersList;
    });

    return {
      seasonName: currentSeason ? currentSeason.name : 'All-Time',
      months: sortedMonthKeys,
      monthDataMap
    };
  }, []);

  const formatMonthKey = (key: string) => {
    if (!key) return '';
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (!data || !data.months.length) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center py-10 min-h-[350px]">
        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-sm">
          <Award className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Member of the Month</h2>
        <p className="text-slate-500 text-sm max-w-[260px]">
          No tournament scores entered yet. Complete a round to showcase leaders of the month!
        </p>
      </div>
    );
  }

  const activeMonth = selectedMonth || data.months[0] || '';
  const leaderboard = data.monthDataMap[activeMonth] || [];
  const winner = leaderboard[0] || null;
  const runnersUp = leaderboard.slice(1, 4); // Show top 3 runners-up

  return (
    <div id="member-of-the-month" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between min-h-[350px] transition-all duration-200">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Member of the Month
          </h2>
          
          {data.months.length > 1 ? (
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors shadow-sm"
            >
              {data.months.map(m => (
                <option key={m} value={m}>
                  {formatMonthKey(m)}
                </option>
              ))}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatMonthKey(activeMonth)}
            </span>
          )}
        </div>

        {/* Winner Highlight */}
        {winner ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/10 border border-amber-500/20 p-4.5 rounded-xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-start justify-between">
                <div className="flex gap-3 items-center">
                  <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 border border-amber-200/50 shadow-sm relative">
                    <Medal className="w-5 h-5" />
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white ring-2 ring-white">
                      1st
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-amber-800 transition-colors">
                      {winner.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {winner.divisionName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Handicap: {winner.handicap.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-2xl font-black text-amber-600 leading-none">
                    {winner.points}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                    Pts Saved
                  </span>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-amber-500/10 flex justify-between items-center text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Season: <strong className="text-slate-700 font-semibold">{data.seasonName}</strong>
                </span>
                <span>
                  Rounds: <strong className="text-slate-800 font-bold">{winner.roundsCount}</strong>
                </span>
              </div>
            </div>

            {/* Runners Up Section */}
            {runnersUp.length > 0 && (
              <div className="space-y-2 mt-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Runners-Up
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {runnersUp.map((player, idx) => (
                    <div key={player.memberId} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-400 w-4">
                          {idx + 2}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {player.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {player.divisionName} • Hcp: {player.handicap.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {player.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-6 text-sm">
            No active players could be found for this month.
          </div>
        )}
      </div>
    </div>
  );
}
