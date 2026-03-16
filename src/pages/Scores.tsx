import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileSpreadsheet, Save, CheckCircle2 } from 'lucide-react';
import { db, type ScoreCard, type HoleScore } from '../db';
import { ScoringEngine } from '../lib/scoring';

export function Scores() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [scores, setScores] = useState<number[]>(Array(18).fill(0));
  const [isSaved, setIsSaved] = useState(false);

  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());

  const selectedTournament = tournaments?.find(t => t.id === Number(selectedTournamentId));
  const selectedCourse = courses?.find(c => c.id === selectedTournament?.courseId);
  const selectedMember = members?.find(m => m.id === Number(selectedMemberId));

  const handleScoreChange = (index: number, value: string) => {
    const newScores = [...scores];
    newScores[index] = parseInt(value, 10) || 0;
    setScores(newScores);
    setIsSaved(false);
  };

  const calculateTotals = () => {
    if (!selectedCourse || !selectedMember) return { gross: 0, net: 0, stableford: 0 };

    let gross = 0;
    let net = 0;
    let stableford = 0;

    scores.forEach((score, index) => {
      if (score > 0) {
        const hole = selectedCourse.holes.find(h => h.holeNumber === index + 1);
        if (hole) {
          gross += score;
          const netHoleScore = ScoringEngine.calculateNetHoleScore(score, hole.strokeIndex, selectedMember.handicapIndex);
          net += netHoleScore;
          stableford += ScoringEngine.calculateStablefordPoints(netHoleScore, hole.par);
        }
      }
    });

    return { gross, net, stableford };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (!selectedTournamentId || !selectedMemberId || !selectedCourse) return;

    const holeScores: HoleScore[] = scores.map((score, index) => ({
      holeNumber: index + 1,
      grossScore: score
    }));

    const existingScore = await db.scoreCards.where({ tournamentId: Number(selectedTournamentId), memberId: Number(selectedMemberId) }).first();

    const scoreCard: ScoreCard = {
      tournamentId: Number(selectedTournamentId),
      memberId: Number(selectedMemberId),
      holes: holeScores,
      grossScore: totals.gross,
      netScore: totals.net,
      stablefordPoints: totals.stableford
    };

    if (existingScore && existingScore.id) {
      await db.scoreCards.update(existingScore.id, scoreCard);
    } else {
      await db.scoreCards.add(scoreCard);
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Score Entry</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Tournament</label>
            <select 
              value={selectedTournamentId} 
              onChange={(e) => setSelectedTournamentId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-2 border"
            >
              <option value="">-- Select Tournament --</option>
              {tournaments?.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Player</label>
            <select 
              value={selectedMemberId} 
              onChange={(e) => setSelectedMemberId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-2 border"
            >
              <option value="">-- Select Player --</option>
              {members?.map(m => (
                <option key={m.id} value={m.id}>{m.name} (Hcp: {m.handicapIndex})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedTournamentId && selectedMemberId && selectedCourse ? (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 border border-slate-300 text-left">Hole</th>
                    {Array.from({ length: 9 }, (_, i) => <th key={i} className="p-2 border border-slate-300 w-12">{i + 1}</th>)}
                    <th className="p-2 border border-slate-300 font-bold bg-slate-200">OUT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left">Par</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const hole = selectedCourse.holes.find(h => h.holeNumber === i + 1);
                      return <td key={i} className="p-2 border border-slate-300 bg-slate-50 text-slate-500">{hole?.par || '-'}</td>;
                    })}
                    <td className="p-2 border border-slate-300 font-bold bg-slate-100">
                      {selectedCourse.holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left">S.I.</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const hole = selectedCourse.holes.find(h => h.holeNumber === i + 1);
                      return <td key={i} className="p-2 border border-slate-300 bg-slate-50 text-slate-500 text-xs">{hole?.strokeIndex || '-'}</td>;
                    })}
                    <td className="p-2 border border-slate-300 bg-slate-100"></td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-bold text-left">Score</td>
                    {Array.from({ length: 9 }, (_, i) => (
                      <td key={i} className="p-1 border border-slate-300">
                        <input 
                          type="number" 
                          min="1" max="20" 
                          value={scores[i] || ''} 
                          onChange={(e) => handleScoreChange(i, e.target.value)}
                          className="w-full text-center border-none p-1 focus:ring-purple-500 font-bold text-lg" 
                        />
                      </td>
                    ))}
                    <td className="p-2 border border-slate-300 font-bold bg-purple-50 text-purple-900">
                      {scores.slice(0, 9).reduce((sum, s) => sum + (s || 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 border border-slate-300 text-left">Hole</th>
                    {Array.from({ length: 9 }, (_, i) => <th key={i + 9} className="p-2 border border-slate-300 w-12">{i + 10}</th>)}
                    <th className="p-2 border border-slate-300 font-bold bg-slate-200">IN</th>
                    <th className="p-2 border border-slate-300 font-bold bg-slate-300">TOT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left">Par</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const hole = selectedCourse.holes.find(h => h.holeNumber === i + 10);
                      return <td key={i + 9} className="p-2 border border-slate-300 bg-slate-50 text-slate-500">{hole?.par || '-'}</td>;
                    })}
                    <td className="p-2 border border-slate-300 font-bold bg-slate-100">
                      {selectedCourse.holes.slice(9, 18).reduce((sum, h) => sum + h.par, 0)}
                    </td>
                    <td className="p-2 border border-slate-300 font-bold bg-slate-200">
                      {selectedCourse.par}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left">S.I.</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const hole = selectedCourse.holes.find(h => h.holeNumber === i + 10);
                      return <td key={i + 9} className="p-2 border border-slate-300 bg-slate-50 text-slate-500 text-xs">{hole?.strokeIndex || '-'}</td>;
                    })}
                    <td className="p-2 border border-slate-300 bg-slate-100"></td>
                    <td className="p-2 border border-slate-300 bg-slate-200"></td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-bold text-left">Score</td>
                    {Array.from({ length: 9 }, (_, i) => (
                      <td key={i + 9} className="p-1 border border-slate-300">
                        <input 
                          type="number" 
                          min="1" max="20" 
                          value={scores[i + 9] || ''} 
                          onChange={(e) => handleScoreChange(i + 9, e.target.value)}
                          className="w-full text-center border-none p-1 focus:ring-purple-500 font-bold text-lg" 
                        />
                      </td>
                    ))}
                    <td className="p-2 border border-slate-300 font-bold bg-purple-50 text-purple-900">
                      {scores.slice(9, 18).reduce((sum, s) => sum + (s || 0), 0)}
                    </td>
                    <td className="p-2 border border-slate-300 font-bold bg-purple-100 text-purple-900 text-lg">
                      {totals.gross}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross</p>
                  <p className="text-2xl font-bold text-slate-900">{totals.gross}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net</p>
                  <p className="text-2xl font-bold text-blue-600">{totals.net}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stableford</p>
                  <p className="text-2xl font-bold text-emerald-600">{totals.stableford}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isSaved && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Saved
                  </span>
                )}
                <button 
                  onClick={handleSave}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Scorecard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>Select a tournament and player to enter scores.</p>
          </div>
        )}
      </div>
    </div>
  );
}
