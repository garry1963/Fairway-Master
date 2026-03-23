import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, Filter, Calendar as CalendarIcon, Map, Users, Target } from 'lucide-react';
import { db, type ScoreCard, type Tournament, type Course, type Member } from '../db';
import { format } from 'date-fns';

type StatType = 'history' | 'distribution' | 'average' | 'best' | 'par3' | 'par4' | 'par5' | 'hole_difficulty' | 'potential_best';
type ScoreType = 'gross' | 'net';

export function Statistics() {
  // Filters
  const [statType, setStatType] = useState<StatType>('history');
  const [seasonId, setSeasonId] = useState<number | 'all'>('all');
  const [scoreType, setScoreType] = useState<ScoreType>('gross');
  const [courseId, setCourseId] = useState<number | 'all'>('all');
  const [memberId, setMemberId] = useState<number | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data
  const seasons = useLiveQuery(() => db.seasons.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const scoreCards = useLiveQuery(() => db.scoreCards.toArray());

  const filteredData = useMemo(() => {
    if (!tournaments || !scoreCards || !courses || !members) return null;

    // 1. Filter Tournaments
    let validTournaments = tournaments;
    if (seasonId !== 'all') validTournaments = validTournaments.filter(t => t.seasonId === seasonId);
    if (courseId !== 'all') validTournaments = validTournaments.filter(t => t.courseId === courseId);
    if (dateFrom) validTournaments = validTournaments.filter(t => new Date(t.date) >= new Date(dateFrom));
    if (dateTo) validTournaments = validTournaments.filter(t => new Date(t.date) <= new Date(dateTo));

    const validTournamentIds = new Set(validTournaments.map(t => t.id));

    // 2. Filter ScoreCards
    let validScoreCards = scoreCards.filter(sc => validTournamentIds.has(sc.tournamentId));
    if (memberId !== 'all') validScoreCards = validScoreCards.filter(sc => sc.memberId === memberId);

    // 3. Enrich ScoreCards with Hole Details and Net Scores
    const enrichedScores = validScoreCards.map(sc => {
      const tournament = validTournaments.find(t => t.id === sc.tournamentId)!;
      const course = courses.find(c => c.id === tournament.courseId)!;
      const member = members.find(m => m.id === sc.memberId)!;
      
      const playingHandicap = sc.grossScore - sc.netScore;

      const holes = sc.holes.map(h => {
        const courseHole = course.holes.find(ch => ch.holeNumber === h.holeNumber)!;
        let strokesReceived = 0;
        if (playingHandicap > 0) {
          strokesReceived = Math.floor(playingHandicap / 18) + (courseHole.strokeIndex <= (playingHandicap % 18) ? 1 : 0);
        } else if (playingHandicap < 0) {
           const plusHcp = Math.abs(playingHandicap);
           strokesReceived = -(Math.floor(plusHcp / 18) + ((19 - courseHole.strokeIndex) <= (plusHcp % 18) ? 1 : 0));
        }
        
        const netScore = h.grossScore - strokesReceived;
        const scoreToUse = scoreType === 'gross' ? h.grossScore : netScore;
        const toPar = scoreToUse - courseHole.par;

        return {
          ...h,
          courseHole,
          netScore,
          scoreToUse,
          toPar
        };
      });

      const totalScoreToUse = scoreType === 'gross' ? sc.grossScore : sc.netScore;

      return {
        ...sc,
        tournament,
        course,
        member,
        holes,
        totalScoreToUse
      };
    });

    return enrichedScores;
  }, [tournaments, scoreCards, courses, members, seasonId, courseId, dateFrom, dateTo, memberId, scoreType]);

  const renderStats = () => {
    if (!filteredData) return <div className="p-8 text-center">Loading...</div>;
    if (filteredData.length === 0) return <div className="p-8 text-center text-slate-500">No data found for the selected filters.</div>;

    if (statType === 'history') {
      const sorted = [...filteredData].sort((a, b) => new Date(b.tournament.date).getTime() - new Date(a.tournament.date).getTime());
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3">Date</th>
                <th className="p-3">Player</th>
                <th className="p-3">Course</th>
                <th className="p-3 text-center">Gross</th>
                <th className="p-3 text-center">Net</th>
                <th className="p-3 text-center">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(sc => (
                <tr key={sc.id} className="hover:bg-slate-50">
                  <td className="p-3">{format(new Date(sc.tournament.date), 'MMM d, yyyy')}</td>
                  <td className="p-3 font-medium">{sc.member.name}</td>
                  <td className="p-3">{sc.course.name}</td>
                  <td className="p-3 text-center">{sc.grossScore}</td>
                  <td className="p-3 text-center">{sc.netScore}</td>
                  <td className="p-3 text-center font-bold text-indigo-600">{sc.stablefordPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (statType === 'distribution') {
      const distByMember: Record<string, any> = {};
      filteredData.forEach(sc => {
        if (!distByMember[sc.memberId]) {
          distByMember[sc.memberId] = { name: sc.member.name, albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 };
        }
        sc.holes.forEach(h => {
          if (h.toPar <= -3) distByMember[sc.memberId].albatross++;
          else if (h.toPar === -2) distByMember[sc.memberId].eagle++;
          else if (h.toPar === -1) distByMember[sc.memberId].birdie++;
          else if (h.toPar === 0) distByMember[sc.memberId].par++;
          else if (h.toPar === 1) distByMember[sc.memberId].bogey++;
          else if (h.toPar === 2) distByMember[sc.memberId].double++;
          else distByMember[sc.memberId].worse++;
        });
      });
      const rows = Object.values(distByMember).sort((a, b) => b.birdie - a.birdie);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Albatross+</th>
                <th className="p-3 text-center">Eagle</th>
                <th className="p-3 text-center">Birdie</th>
                <th className="p-3 text-center">Par</th>
                <th className="p-3 text-center">Bogey</th>
                <th className="p-3 text-center">Double+</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-center text-purple-600">{r.albatross}</td>
                  <td className="p-3 text-center text-blue-600">{r.eagle}</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">{r.birdie}</td>
                  <td className="p-3 text-center text-slate-600">{r.par}</td>
                  <td className="p-3 text-center text-orange-500">{r.bogey}</td>
                  <td className="p-3 text-center text-red-600">{r.double + r.worse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (statType === 'average') {
      const avgByMember: Record<string, any> = {};
      filteredData.forEach(sc => {
        if (!avgByMember[sc.memberId]) {
          avgByMember[sc.memberId] = { name: sc.member.name, rounds: 0, strokes: 0 };
        }
        avgByMember[sc.memberId].rounds++;
        avgByMember[sc.memberId].strokes += sc.totalScoreToUse;
      });
      const rows = Object.values(avgByMember).map(r => ({ ...r, avg: r.strokes / r.rounds })).sort((a, b) => a.avg - b.avg);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Rounds</th>
                <th className="p-3 text-center">Total Strokes ({scoreType})</th>
                <th className="p-3 text-center">Scoring Average</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-center">{r.rounds}</td>
                  <td className="p-3 text-center">{r.strokes}</td>
                  <td className="p-3 text-center font-bold text-indigo-600">{r.avg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (statType === 'best') {
      const bestByMember: Record<string, any> = {};
      filteredData.forEach(sc => {
        if (!bestByMember[sc.memberId] || sc.totalScoreToUse < bestByMember[sc.memberId].score || (sc.totalScoreToUse === bestByMember[sc.memberId].score && new Date(sc.tournament.date) > new Date(bestByMember[sc.memberId].date))) {
          bestByMember[sc.memberId] = { name: sc.member.name, score: sc.totalScoreToUse, date: sc.tournament.date, course: sc.course.name };
        }
      });
      const rows = Object.values(bestByMember).sort((a, b) => a.score - b.score);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Best Score ({scoreType})</th>
                <th className="p-3">Course</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-center font-bold text-emerald-600">{r.score}</td>
                  <td className="p-3">{r.course}</td>
                  <td className="p-3">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (statType === 'par3' || statType === 'par4' || statType === 'par5') {
      const targetPar = statType === 'par3' ? 3 : statType === 'par4' ? 4 : 5;
      const perfByMember: Record<string, any> = {};
      filteredData.forEach(sc => {
        if (!perfByMember[sc.memberId]) {
          perfByMember[sc.memberId] = { name: sc.member.name, holes: 0, strokes: 0 };
        }
        sc.holes.filter(h => h.courseHole.par === targetPar).forEach(h => {
          perfByMember[sc.memberId].holes++;
          perfByMember[sc.memberId].strokes += h.scoreToUse;
        });
      });
      const rows = Object.values(perfByMember).filter(r => r.holes > 0).map(r => ({ ...r, avg: r.strokes / r.holes })).sort((a, b) => a.avg - b.avg);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Par {targetPar}s Played</th>
                <th className="p-3 text-center">Total Strokes ({scoreType})</th>
                <th className="p-3 text-center">Average Score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-center">{r.holes}</td>
                  <td className="p-3 text-center">{r.strokes}</td>
                  <td className="p-3 text-center font-bold text-indigo-600">{r.avg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (statType === 'hole_difficulty') {
      if (courseId === 'all') return <div className="p-8 text-center text-slate-500">Please select a specific course to view hole difficulty.</div>;
      
      const course = courses?.find(c => c.id === courseId);
      if (!course) return null;

      const holeStats: Record<number, any> = {};
      course.holes.forEach(h => {
        holeStats[h.holeNumber] = { holeNumber: h.holeNumber, par: h.par, plays: 0, strokes: 0 };
      });

      filteredData.forEach(sc => {
        sc.holes.forEach(h => {
          if (holeStats[h.holeNumber]) {
            holeStats[h.holeNumber].plays++;
            holeStats[h.holeNumber].strokes += h.scoreToUse;
          }
        });
      });

      const rows = Object.values(holeStats).filter(r => r.plays > 0).map(r => {
        const avg = r.strokes / r.plays;
        return { ...r, avg, toPar: avg - r.par };
      }).sort((a, b) => b.toPar - a.toPar);

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3 text-center">Hole</th>
                <th className="p-3 text-center">Par</th>
                <th className="p-3 text-center">Plays</th>
                <th className="p-3 text-center">Average Score ({scoreType})</th>
                <th className="p-3 text-center font-bold">Average to Par</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 text-center font-medium">{r.holeNumber}</td>
                  <td className="p-3 text-center">{r.par}</td>
                  <td className="p-3 text-center">{r.plays}</td>
                  <td className="p-3 text-center">{r.avg.toFixed(2)}</td>
                  <td className={`p-3 text-center font-bold ${r.toPar > 0 ? 'text-red-600' : r.toPar < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {r.toPar > 0 ? '+' : ''}{r.toPar.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (statType === 'potential_best') {
      if (courseId === 'all') return <div className="p-8 text-center text-slate-500">Please select a specific course to view potential best rounds.</div>;
      
      const course = courses?.find(c => c.id === courseId);
      if (!course) return null;

      const potentialByMember: Record<string, any> = {};
      
      filteredData.forEach(sc => {
        if (!potentialByMember[sc.memberId]) {
          potentialByMember[sc.memberId] = { name: sc.member.name, holes: Array(18).fill(null) };
        }
        sc.holes.forEach(h => {
          const idx = h.holeNumber - 1;
          if (potentialByMember[sc.memberId].holes[idx] === null || h.scoreToUse < potentialByMember[sc.memberId].holes[idx]) {
            potentialByMember[sc.memberId].holes[idx] = h.scoreToUse;
          }
        });
      });

      const rows = Object.values(potentialByMember).map(r => {
        const complete = r.holes.every((h: number | null) => h !== null);
        const total = r.holes.reduce((sum: number, h: number | null) => sum + (h || 0), 0);
        return { ...r, complete, total };
      }).filter(r => r.complete).sort((a, b) => a.total - b.total);

      if (rows.length === 0) {
        return <div className="p-8 text-center text-slate-500">No players have completed all 18 holes on this course to calculate a potential best round.</div>;
      }

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="p-3 sticky left-0 bg-slate-50 z-10">Player</th>
                <th className="p-3 text-center font-bold text-indigo-700">Potential Total</th>
                {Array.from({length: 18}, (_, i) => (
                  <th key={i} className="p-3 text-center">H{i+1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-medium sticky left-0 bg-white z-10 border-r">{r.name}</td>
                  <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50/30">{r.total}</td>
                  {r.holes.map((score: number, idx: number) => (
                    <td key={idx} className="p-3 text-center">{score}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Advanced Statistics</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          
          {/* Stat Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statistic</label>
            <select 
              value={statType} 
              onChange={(e) => setStatType(e.target.value as StatType)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="history">Score History</option>
              <option value="distribution">Score Distribution</option>
              <option value="average">Scoring Average</option>
              <option value="best">Best Round</option>
              <option value="par3">Par 3 Performance</option>
              <option value="par4">Par 4 Performance</option>
              <option value="par5">Par 5 Performance</option>
              <option value="hole_difficulty">Hole Difficulty (By Course)</option>
              <option value="potential_best">Potential Best Round (By Course)</option>
            </select>
          </div>

          {/* Score Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Score Type</label>
            <select 
              value={scoreType} 
              onChange={(e) => setScoreType(e.target.value as ScoreType)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="gross">Gross Scores</option>
              <option value="net">Net Scores</option>
            </select>
          </div>

          {/* Season Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
            <select 
              value={seasonId} 
              onChange={(e) => setSeasonId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="all">All Time</option>
              {seasons?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
            <select 
              value={courseId} 
              onChange={(e) => setCourseId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="all">All Courses</option>
              {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Player Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Player</label>
            <select 
              value={memberId} 
              onChange={(e) => setMemberId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="all">All Players</option>
              {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date From</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date To</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            />
          </div>

        </div>

        <div className="border-t border-slate-200 pt-6">
          {renderStats()}
        </div>
      </div>
    </div>
  );
}
