import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar, Plus, Trash2, Award, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react';
import { db, type Season, type Member, type Tournament, type ScoreCard } from '../db';
import { format } from 'date-fns';

export function Seasons() {
  const [isAdding, setIsAdding] = useState(false);
  const [endingSeasonId, setEndingSeasonId] = useState<number | null>(null);
  
  const seasons = useLiveQuery(() => db.seasons.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const scoreCards = useLiveQuery(() => db.scoreCards.toArray());

  const handleAddSeason = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await db.seasons.add({
      name: formData.get('name') as string,
      startDate: new Date(formData.get('startDate') as string),
      endDate: new Date(formData.get('endDate') as string),
      numDivisions: parseInt(formData.get('numDivisions') as string, 10),
    });
    
    setIsAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this season?')) {
      await db.seasons.delete(id);
    }
  };

  const handleEndSeason = (id: number) => {
    setEndingSeasonId(id);
  };

  const seasonToProcess = useMemo(() => {
    if (!endingSeasonId || !seasons || !members || !tournaments || !scoreCards) return null;
    
    const season = seasons.find(s => s.id === endingSeasonId);
    if (!season) return null;

    const seasonTournaments = tournaments.filter(t => t.seasonId === endingSeasonId);
    const tournamentIds = new Set(seasonTournaments.map(t => t.id));
    
    const seasonScores = scoreCards.filter(s => tournamentIds.has(s.tournamentId));
    
    // Calculate total points per member
    const memberPoints: Record<number, number> = {};
    seasonScores.forEach(score => {
      memberPoints[score.memberId] = (memberPoints[score.memberId] || 0) + score.stablefordPoints;
    });

    // Group members by division
    const divisions: Record<number, { member: Member, points: number }[]> = {};
    
    // Initialize divisions
    for (let i = 1; i <= season.numDivisions; i++) {
      divisions[i] = [];
    }

    members.forEach(member => {
      const div = member.divisionId || 1;
      if (!divisions[div]) divisions[div] = [];
      divisions[div].push({
        member,
        points: memberPoints[member.id!] || 0
      });
    });

    // Sort each division by points descending
    Object.keys(divisions).forEach(div => {
      divisions[Number(div)].sort((a, b) => b.points - a.points);
    });

    // Determine promotions and relegations (top 2 / bottom 2)
    const changes: { member: Member, from: number, to: number, reason: 'promotion' | 'relegation' }[] = [];
    
    const numDivs = season.numDivisions;
    
    for (let div = 1; div <= numDivs; div++) {
      const divMembers = divisions[div];
      if (divMembers.length === 0) continue;

      // Promotions (not applicable for div 1)
      if (div > 1) {
        const promoted = divMembers.slice(0, 2);
        promoted.forEach(p => {
          changes.push({ member: p.member, from: div, to: div - 1, reason: 'promotion' });
        });
      }

      // Relegations (not applicable for last div)
      if (div < numDivs) {
        // Only relegate if there are more than 2 members, otherwise it's weird
        if (divMembers.length > 2) {
          const relegated = divMembers.slice(-2);
          relegated.forEach(r => {
            changes.push({ member: r.member, from: div, to: div + 1, reason: 'relegation' });
          });
        }
      }
    }

    return { season, divisions, changes };
  }, [endingSeasonId, seasons, members, tournaments, scoreCards]);

  const applySeasonEnd = async () => {
    if (!seasonToProcess) return;
    
    const updates = seasonToProcess.changes.map(change => {
      return db.members.update(change.member.id!, { divisionId: change.to });
    });
    
    await Promise.all(updates);
    alert('Season ended successfully. Member divisions have been updated.');
    setEndingSeasonId(null);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Seasons</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Create Season
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Season</h2>
          <form onSubmit={handleAddSeason} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Season Name *</label>
              <input required name="name" type="text" placeholder="e.g. 2026 Society Tour" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Divisions *</label>
              <input required name="numDivisions" type="number" min="1" max="10" defaultValue="4" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input required name="startDate" type="date" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
              <input required name="endDate" type="date" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Season</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seasons?.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center text-slate-500 rounded-xl shadow-sm border border-slate-200">
            No seasons found. Create a season to get started.
          </div>
        ) : (
          seasons?.map((season) => (
            <div key={season.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-slate-50 border-slate-200 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{season.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{season.numDivisions} Divisions</p>
                </div>
                <button onClick={() => handleDelete(season.id!)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Start:</span>
                  <span className="font-medium">{format(new Date(season.startDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>End:</span>
                  <span className="font-medium">{format(new Date(season.endDate), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button 
                  onClick={() => handleEndSeason(season.id!)}
                  className="w-full py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  End Season & Update Divisions
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {endingSeasonId && seasonToProcess && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">End Season: {seasonToProcess.season.name}</h2>
                <p className="text-slate-500 text-sm mt-1">Review proposed promotions and relegations based on total points.</p>
              </div>
              <button onClick={() => setEndingSeasonId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {seasonToProcess.changes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No promotions or relegations to apply.</p>
                  <p className="text-sm mt-2">This could be because there are not enough members or scores.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-700 flex items-center gap-2 mb-3">
                      <ArrowUpCircle className="w-5 h-5" />
                      Promotions
                    </h3>
                    <div className="bg-emerald-50 rounded-lg border border-emerald-100 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-emerald-100/50 text-emerald-800">
                          <tr>
                            <th className="px-4 py-2 font-medium">Player</th>
                            <th className="px-4 py-2 font-medium">From</th>
                            <th className="px-4 py-2 font-medium">To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100">
                          {seasonToProcess.changes.filter(c => c.reason === 'promotion').map(change => (
                            <tr key={change.member.id}>
                              <td className="px-4 py-3 font-medium text-slate-900">{change.member.name}</td>
                              <td className="px-4 py-3 text-slate-600">Div {change.from}</td>
                              <td className="px-4 py-3 font-bold text-emerald-700">Div {change.to}</td>
                            </tr>
                          ))}
                          {seasonToProcess.changes.filter(c => c.reason === 'promotion').length === 0 && (
                            <tr><td colSpan={3} className="px-4 py-3 text-slate-500 text-center">None</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-3">
                      <ArrowDownCircle className="w-5 h-5" />
                      Relegations
                    </h3>
                    <div className="bg-red-50 rounded-lg border border-red-100 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-red-100/50 text-red-800">
                          <tr>
                            <th className="px-4 py-2 font-medium">Player</th>
                            <th className="px-4 py-2 font-medium">From</th>
                            <th className="px-4 py-2 font-medium">To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {seasonToProcess.changes.filter(c => c.reason === 'relegation').map(change => (
                            <tr key={change.member.id}>
                              <td className="px-4 py-3 font-medium text-slate-900">{change.member.name}</td>
                              <td className="px-4 py-3 text-slate-600">Div {change.from}</td>
                              <td className="px-4 py-3 font-bold text-red-700">Div {change.to}</td>
                            </tr>
                          ))}
                          {seasonToProcess.changes.filter(c => c.reason === 'relegation').length === 0 && (
                            <tr><td colSpan={3} className="px-4 py-3 text-slate-500 text-center">None</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setEndingSeasonId(null)} 
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={applySeasonEnd}
                disabled={seasonToProcess.changes.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
