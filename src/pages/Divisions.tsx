import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers, Plus, Trash2, Edit2, Check, X, Download } from 'lucide-react';
import { db, type Division } from '../db';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export function Divisions() {
  const members = useLiveQuery(() => db.members.toArray());
  const divisions = useLiveQuery(() => db.divisions.toArray());
  const seasons = useLiveQuery(() => db.seasons.toArray());
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const scoreCards = useLiveQuery(() => db.scoreCards.toArray());
  
  const [isAdding, setIsAdding] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  // Seed initial divisions if empty
  useEffect(() => {
    const seedDivisions = async () => {
      if (divisions !== undefined && divisions.length === 0) {
        await db.divisions.bulkAdd([
          { name: 'Division 1' },
          { name: 'Division 2' },
          { name: 'Division 3' },
          { name: 'Division 4' }
        ]);
      }
    };
    seedDivisions();
  }, [divisions]);

  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) return;
    await db.divisions.add({ name: newDivisionName.trim() });
    setNewDivisionName('');
    setIsAdding(false);
  };

  const handleDeleteDivision = async (id: number) => {
    if (confirm('Are you sure you want to delete this division? Members in this division will need to be reassigned.')) {
      await db.divisions.delete(id);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    await db.divisions.update(id, { name: editName.trim() });
    setEditingId(null);
  };

  const startEdit = (div: Division) => {
    setEditingId(div.id!);
    setEditName(div.name);
  };

  const getMemberStats = (memberId: number) => {
    let rounds = 0;
    let totalGross = 0;
    let totalPoints = 0;

    if (scoreCards && tournaments && seasons) {
      // Find the most recent season
      const latestSeason = [...seasons].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
      
      if (latestSeason) {
        const seasonTournaments = tournaments.filter(t => t.seasonId === latestSeason.id);
        const tournamentIds = new Set(seasonTournaments.map(t => t.id));
        
        const memberScores = scoreCards.filter(sc => sc.memberId === memberId && tournamentIds.has(sc.tournamentId));
        
        memberScores.forEach(sc => {
          totalPoints += sc.stablefordPoints;
          if (sc.grossScore > 0) {
            rounds += 1;
            totalGross += sc.grossScore;
          }
        });
      }
    }

    return {
      rounds,
      totalPoints,
      averageScore: rounds > 0 ? (totalGross / rounds).toFixed(1) : '0.0'
    };
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('divisions-content');
    if (!element) return;

    const canvas = await toCanvas(element, { pixelRatio: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`divisions_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Divisions</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Division
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <input 
            type="text" 
            value={newDivisionName}
            onChange={(e) => setNewDivisionName(e.target.value)}
            placeholder="Division Name"
            className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
            autoFocus
          />
          <button 
            onClick={handleAddDivision}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Save
          </button>
          <button 
            onClick={() => setIsAdding(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div id="divisions-content" className="grid grid-cols-1 gap-6 bg-white p-4 rounded-xl">
        {divisions?.map(div => {
          // Fallback to div.id if name is somehow empty, though it shouldn't be
          const divMembers = members?.filter(m => m.divisionId === div.id) || [];
          
          const membersWithStats = divMembers.map(m => ({
            ...m,
            stats: getMemberStats(m.id!)
          })).sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);

          const isEditing = editingId === div.id;
          
          return (
            <div key={div.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 border-slate-200 flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-600" />
                
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1 px-2 border text-sm"
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(div.id!)} className="text-emerald-600 hover:text-emerald-700">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-slate-900">{div.name}</h2>
                    <button onClick={() => startEdit(div)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                <div className="ml-auto flex items-center gap-2">
                  <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">
                    {divMembers.length} Members
                  </span>
                  <button 
                    onClick={() => handleDeleteDivision(div.id!)}
                    className="text-slate-400 hover:text-red-600 transition-colors ml-1"
                    title="Delete Division"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                {membersWithStats.length === 0 ? (
                  <p className="p-4 text-slate-500 text-sm text-center">No members in this division.</p>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium w-16 text-center">Rank</th>
                        <th className="px-4 py-3 font-medium">Player</th>
                        <th className="px-4 py-3 font-medium text-center">Handicap</th>
                        <th className="px-4 py-3 font-medium text-center">Rounds</th>
                        <th className="px-4 py-3 font-medium text-center">Avg Score</th>
                        <th className="px-4 py-3 font-medium text-right">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {membersWithStats.map((member, index) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center font-medium text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{member.name}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{member.handicapIndex.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{member.stats.rounds}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{member.stats.averageScore}</td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-600">{member.stats.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
