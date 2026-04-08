import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers, Plus, Trash2, Edit2, Check, X, Download } from 'lucide-react';
import { db, type Division } from '../db';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const FAMOUS_HOLES = [
  "https://upload.wikimedia.org/wikipedia/commons/b/be/Pebble_Beach_Golf_Links%2C_hole_7.jpg", // Pebble Beach 7th Hole
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Swilken_Bridge%2C_Old_Course_geograph-6310525-by-Gordon-Hatton.jpg/960px-Swilken_Bridge%2C_Old_Course_geograph-6310525-by-Gordon-Hatton.jpg", // St Andrews Swilken Bridge
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/18th_Hole_at_Muirfield%2C_The_Open_2013_.jpg/960px-18th_Hole_at_Muirfield%2C_The_Open_2013_.jpg", // Muirfield 18th Hole
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Ballybunion_Golf_Club_-_10th_hole.jpg/960px-Ballybunion_Golf_Club_-_10th_hole.jpg", // Ballybunion 10th Hole
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Pinehurst_No._4_%284599083949%29.jpg/960px-Pinehurst_No._4_%284599083949%29.jpg", // Pinehurst No. 4
];

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

  const handleExportDivisionPDF = async (divId: number, divName: string) => {
    const element = document.getElementById(`division-table-${divId}`);
    if (!element) return;

    const canvas = await toCanvas(element, { pixelRatio: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`division_${divName.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyyMMdd')}.pdf`);
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

      <div id="divisions-content" className="grid grid-cols-1 gap-8">
        {divisions?.map((div, index) => {
          // Fallback to div.id if name is somehow empty, though it shouldn't be
          const divMembers = members?.filter(m => m.divisionId === div.id) || [];
          
          const membersWithStats = divMembers.map(m => ({
            ...m,
            stats: getMemberStats(m.id!)
          })).sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);

          const isEditing = editingId === div.id;
          
          return (
            <div key={div.id} id={`division-table-${div.id}`} className="bg-white rounded-xl shadow-md border border-emerald-100 overflow-hidden">
              <div className="relative p-4 border-b bg-gradient-to-r from-emerald-800 to-teal-700 border-emerald-800 overflow-hidden">
                <img 
                  src={FAMOUS_HOLES[index % FAMOUS_HOLES.length]} 
                  alt="Famous golf course hole" 
                  className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <div className="relative z-10 flex items-center gap-3 w-full">
                  <Layers className="w-5 h-5 text-emerald-100" />
                
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-md border-emerald-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-1 px-2 border text-sm text-slate-900"
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(div.id!)} className="text-emerald-100 hover:text-white bg-emerald-800/50 p-1 rounded transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-emerald-200 hover:text-white bg-emerald-800/50 p-1 rounded transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-white">{div.name}</h2>
                    <button onClick={() => startEdit(div)} className="text-emerald-200 hover:text-white transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                <div className="ml-auto flex items-center gap-2">
                  <span className="bg-emerald-800/40 text-emerald-50 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-600/50 shadow-inner">
                    {divMembers.length} Members
                  </span>
                  <button 
                    onClick={() => handleExportDivisionPDF(div.id!, div.name)}
                    className="text-emerald-200 hover:text-white transition-colors ml-1"
                    title="Export Division PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDivision(div.id!)}
                    className="text-emerald-200 hover:text-red-300 transition-colors ml-1"
                    title="Delete Division"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                {membersWithStats.length === 0 ? (
                  <p className="p-6 text-emerald-600/60 text-sm text-center italic bg-emerald-50/30">No members in this division.</p>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-emerald-50 text-emerald-800 border-b border-emerald-100">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-16 text-center">Rank</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Player</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">Handicap</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">Rounds</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">Avg Score</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {membersWithStats.map((member, index) => (
                        <tr key={member.id} className="hover:bg-emerald-50/60 transition-colors group">
                          <td className="px-4 py-3 text-center">
                            <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' :
                              index === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300 shadow-sm' :
                              index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200 shadow-sm' :
                              'bg-emerald-100/50 text-emerald-700'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 group-hover:text-emerald-900 transition-colors">{member.name}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{member.handicapIndex.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{member.stats.rounds}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{member.stats.averageScore}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{member.stats.totalPoints}</td>
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
