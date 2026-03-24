import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileSpreadsheet, Save, CheckCircle2, Settings2, Download } from 'lucide-react';
import { db, type ScoreCard, type HoleScore } from '../db';
import { ScoringEngine } from '../lib/scoring';
import { toPng } from 'html-to-image';

export function Scores() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [scores, setScores] = useState<HoleScore[]>(Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, grossScore: 0, putts: 0, fir: false, gir: false, sandSave: false })));
  const [isSaved, setIsSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());

  const selectedTournament = tournaments?.find(t => t.id === selectedTournamentId);
  const selectedCourse = courses?.find(c => c.id === selectedTournament?.courseId);
  const selectedMember = members?.find(m => m.id === selectedMemberId);

  const existingScoreCard = useLiveQuery(
    () => {
      if (selectedTournamentId && selectedMemberId) {
        return db.scoreCards.where({ tournamentId: selectedTournamentId, memberId: selectedMemberId }).first();
      }
      return undefined;
    },
    [selectedTournamentId, selectedMemberId]
  );

  useEffect(() => {
    if (existingScoreCard) {
      setScores(existingScoreCard.holes);
    } else {
      setScores(Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, grossScore: 0, putts: 0, fir: false, gir: false, sandSave: false })));
    }
  }, [existingScoreCard, selectedTournamentId, selectedMemberId]);

  const handleScoreChange = (index: number, field: keyof HoleScore, value: any) => {
    const newScores = [...scores];
    newScores[index] = { ...newScores[index], [field]: value };
    setScores(newScores);
    setIsSaved(false);
  };

  const calculateTotals = () => {
    if (!selectedCourse || !selectedMember) return { gross: 0, net: 0, stableford: 0 };

    let gross = 0;
    let net = 0;
    let stableford = 0;

    scores.forEach((scoreObj, index) => {
      const score = scoreObj.grossScore;
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

    const scoreCard: ScoreCard = {
      tournamentId: selectedTournamentId,
      memberId: selectedMemberId,
      holes: scores,
      grossScore: totals.gross,
      netScore: totals.net,
      stablefordPoints: totals.stableford
    };

    if (existingScoreCard && existingScoreCard.id) {
      await db.scoreCards.put({ ...scoreCard, id: existingScoreCard.id });
    } else {
      await db.scoreCards.add(scoreCard);
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportScorecard = async () => {
    const element = document.getElementById('scorecard-container');
    if (!element) return;

    const dataUrl = await toPng(element, { pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `scorecard_${selectedMember?.name}_${selectedTournament?.name}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Score Entry</h1>
        {selectedTournamentId && selectedMemberId && selectedCourse && (
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Saved!' : (existingScoreCard ? 'Update Score' : 'Save Score')}
            </button>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
            <button 
              onClick={handleExportScorecard}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Scorecard
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Qualification Rule:</strong> A minimum of 4 rounds of hole scores must be added before a member's points total is added to their associated division leaderboard.
            </p>
          </div>
        </div>
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
          <div className="space-y-6" id="scorecard-container">
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
                          value={scores[i].grossScore || ''} 
                          onChange={(e) => handleScoreChange(i, 'grossScore', parseInt(e.target.value) || 0)}
                          className="w-full text-center border-none p-1 focus:ring-purple-500 font-bold text-lg" 
                        />
                      </td>
                    ))}
                    <td className="p-2 border border-slate-300 font-bold bg-purple-50 text-purple-900">
                      {scores.slice(0, 9).reduce((sum, s) => sum + (s.grossScore || 0), 0)}
                    </td>
                  </tr>
                  {showAdvanced && (
                    <>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">Putts</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i} className="p-1 border border-slate-300">
                            <input 
                              type="number" min="0" max="10" 
                              value={scores[i].putts || ''} 
                              onChange={(e) => handleScoreChange(i, 'putts', parseInt(e.target.value) || 0)}
                              className="w-full text-center border-none p-1 focus:ring-purple-500 text-xs" 
                            />
                          </td>
                        ))}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(0, 9).reduce((sum, s) => sum + (s.putts || 0), 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">FIR</td>
                        {Array.from({ length: 9 }, (_, i) => {
                          const isPar3 = selectedCourse.holes.find(h => h.holeNumber === i + 1)?.par === 3;
                          return (
                            <td key={i} className="p-1 border border-slate-300 bg-slate-50">
                              {!isPar3 && (
                                <input 
                                  type="checkbox" 
                                  checked={scores[i].fir || false} 
                                  onChange={(e) => handleScoreChange(i, 'fir', e.target.checked)}
                                  className="rounded text-purple-600 focus:ring-purple-500" 
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(0, 9).filter(s => s.fir).length}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">GIR</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i} className="p-1 border border-slate-300 bg-slate-50">
                            <input 
                              type="checkbox" 
                              checked={scores[i].gir || false} 
                              onChange={(e) => handleScoreChange(i, 'gir', e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500" 
                            />
                          </td>
                        ))}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(0, 9).filter(s => s.gir).length}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">Sand Save</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i} className="p-1 border border-slate-300 bg-slate-50">
                            <input 
                              type="checkbox" 
                              checked={scores[i].sandSave || false} 
                              onChange={(e) => handleScoreChange(i, 'sandSave', e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500" 
                            />
                          </td>
                        ))}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(0, 9).filter(s => s.sandSave).length}</td>
                      </tr>
                    </>
                  )}
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
                          value={scores[i + 9].grossScore || ''} 
                          onChange={(e) => handleScoreChange(i + 9, 'grossScore', parseInt(e.target.value) || 0)}
                          className="w-full text-center border-none p-1 focus:ring-purple-500 font-bold text-lg" 
                        />
                      </td>
                    ))}
                    <td className="p-2 border border-slate-300 font-bold bg-purple-50 text-purple-900">
                      {scores.slice(9, 18).reduce((sum, s) => sum + (s.grossScore || 0), 0)}
                    </td>
                    <td className="p-2 border border-slate-300 font-bold bg-purple-100 text-purple-900 text-lg">
                      {totals.gross}
                    </td>
                  </tr>
                  {showAdvanced && (
                    <>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">Putts</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i + 9} className="p-1 border border-slate-300">
                            <input 
                              type="number" min="0" max="10" 
                              value={scores[i + 9].putts || ''} 
                              onChange={(e) => handleScoreChange(i + 9, 'putts', parseInt(e.target.value) || 0)}
                              className="w-full text-center border-none p-1 focus:ring-purple-500 text-xs" 
                            />
                          </td>
                        ))}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(9, 18).reduce((sum, s) => sum + (s.putts || 0), 0)}</td>
                        <td className="p-2 border border-slate-300 bg-slate-200 font-bold text-xs">{scores.reduce((sum, s) => sum + (s.putts || 0), 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">FIR</td>
                        {Array.from({ length: 9 }, (_, i) => {
                          const isPar3 = selectedCourse.holes.find(h => h.holeNumber === i + 10)?.par === 3;
                          return (
                            <td key={i + 9} className="p-1 border border-slate-300 bg-slate-50">
                              {!isPar3 && (
                                <input 
                                  type="checkbox" 
                                  checked={scores[i + 9].fir || false} 
                                  onChange={(e) => handleScoreChange(i + 9, 'fir', e.target.checked)}
                                  className="rounded text-purple-600 focus:ring-purple-500" 
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(9, 18).filter(s => s.fir).length}</td>
                        <td className="p-2 border border-slate-300 bg-slate-200 font-bold text-xs">{scores.filter(s => s.fir).length}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">GIR</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i + 9} className="p-1 border border-slate-300 bg-slate-50">
                            <input 
                              type="checkbox" 
                              checked={scores[i + 9].gir || false} 
                              onChange={(e) => handleScoreChange(i + 9, 'gir', e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500" 
                            />
                          </td>
                        ))}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(9, 18).filter(s => s.gir).length}</td>
                        <td className="p-2 border border-slate-300 bg-slate-200 font-bold text-xs">{scores.filter(s => s.gir).length}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-50 text-left text-xs">Sand Save</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i + 9} className="p-1 border border-slate-300 bg-slate-50">
                            <input 
                              type="checkbox" 
                              checked={scores[i + 9].sandSave || false} 
                              onChange={(e) => handleScoreChange(i + 9, 'sandSave', e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500" 
                            />
                          </td>
                        ))}
                        <td className="p-2 border border-slate-300 bg-slate-100 font-bold text-xs">{scores.slice(9, 18).filter(s => s.sandSave).length}</td>
                        <td className="p-2 border border-slate-300 bg-slate-200 font-bold text-xs">{scores.filter(s => s.sandSave).length}</td>
                      </tr>
                    </>
                  )}
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
