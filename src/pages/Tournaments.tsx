import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, Plus, Trash2, Calendar as CalendarIcon, MapPin, Award, X, Edit2, Download } from 'lucide-react';
import { db, type Tournament, type SideGameWinner } from '../db';
import { format } from 'date-fns';
import { convertToCSV, downloadCSV } from '../utils/csvExport';

export function Tournaments() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null);
  const [managingSideGames, setManagingSideGames] = useState<number | null>(null);
  const [newSideGame, setNewSideGame] = useState<Partial<SideGameWinner>>({ type: 'Longest Drive' });
  
  // Form state
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfRounds, setNumberOfRounds] = useState('1');
  const [formatType, setFormatType] = useState('Stableford');
  const [isMajor, setIsMajor] = useState(false);
  const [isOrderOfMerit, setIsOrderOfMerit] = useState(true);
  
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());
  const members = useLiveQuery(() => db.members.toArray());

  const handleAddTournament = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const tournamentData = {
      name,
      courseId: parseInt(courseId, 10),
      seasonId: 1, // Default season for now
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      numberOfRounds: numberOfRounds ? parseInt(numberOfRounds, 10) : 1,
      format: formatType,
      isMajor,
      isOrderOfMerit
    };

    if (editingTournamentId) {
      await db.tournaments.update(editingTournamentId, tournamentData);
    } else {
      await db.tournaments.add(tournamentData);
    }
    
    handleCancel();
  };

  const handleEdit = (tournament: Tournament) => {
    setIsAdding(true);
    setEditingTournamentId(tournament.id!);
    setName(tournament.name);
    setCourseId(tournament.courseId.toString());
    setDate(format(new Date(tournament.date), 'yyyy-MM-dd'));
    setEndDate(tournament.endDate ? format(new Date(tournament.endDate), 'yyyy-MM-dd') : '');
    setNumberOfRounds(tournament.numberOfRounds?.toString() || '1');
    setFormatType(tournament.format);
    setIsMajor(tournament.isMajor || false);
    setIsOrderOfMerit(tournament.isOrderOfMerit ?? true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingTournamentId(null);
    setName('');
    setCourseId('');
    setDate('');
    setEndDate('');
    setNumberOfRounds('1');
    setFormatType('Stableford');
    setIsMajor(false);
    setIsOrderOfMerit(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this tournament?')) {
      await db.tournaments.delete(id);
    }
  };

  const getCourseName = (courseId: number) => {
    return courses?.find(c => c.id === courseId)?.name || 'Unknown Course';
  };

  const getMemberName = (memberId: number) => {
    return members?.find(m => m.id === memberId)?.name || 'Unknown Member';
  };

  const handleAddSideGame = async (tournamentId: number) => {
    if (!newSideGame.memberId || !newSideGame.type) return;
    
    const tournament = tournaments?.find(t => t.id === tournamentId);
    if (!tournament) return;

    const sideGames = tournament.sideGames || [];
    await db.tournaments.update(tournamentId, {
      sideGames: [...sideGames, newSideGame as SideGameWinner]
    });

    setNewSideGame({ type: 'Longest Drive' });
  };

  const handleDeleteSideGame = async (tournamentId: number, index: number) => {
    const tournament = tournaments?.find(t => t.id === tournamentId);
    if (!tournament || !tournament.sideGames) return;

    const newSideGames = [...tournament.sideGames];
    newSideGames.splice(index, 1);

    await db.tournaments.update(tournamentId, {
      sideGames: newSideGames
    });
  };

  const handleExportCSV = () => {
    if (!tournaments) return;
    const headers = ['ID', 'Tournament Name', 'Course Name', 'Start Date', 'End Date', 'Rounds', 'Format', 'Is Major', 'Order of Merit'];
    const rows = tournaments.map(t => [
      t.id || '',
      t.name,
      getCourseName(t.courseId),
      t.date,
      t.endDate || '',
      t.numberOfRounds || 1,
      t.format,
      t.isMajor ? 'Yes' : 'No',
      t.isOrderOfMerit ? 'Yes' : 'No'
    ]);
    const csvContent = convertToCSV(headers, rows);
    downloadCSV(`GolfSociety_Tournaments_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Tournaments</h1>
        <div className="flex gap-2.5">
          <button 
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
            >
              <Trophy className="w-4 h-4" />
              Create Tournament
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingTournamentId ? 'Edit Tournament' : 'Create New Tournament'}</h2>
          <form onSubmit={handleAddTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tournament Name *</label>
              <input 
                required 
                name="name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
              <select 
                required 
                name="courseId" 
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border"
              >
                <option value="">Select a course...</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input 
                required 
                name="date" 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Optional)</label>
              <input 
                name="endDate" 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Rounds</label>
              <input 
                name="numberOfRounds" 
                type="number" 
                min="1" 
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format *</label>
              <select 
                required 
                name="format" 
                value={formatType}
                onChange={(e) => setFormatType(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border"
              >
                <option value="Stableford">Stableford</option>
                <option value="Stroke Play">Stroke Play</option>
                <option value="Modified Stableford">Modified Stableford</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input 
                type="checkbox" 
                id="isMajor" 
                name="isMajor" 
                checked={isMajor}
                onChange={(e) => setIsMajor(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4" 
              />
              <label htmlFor="isMajor" className="text-sm font-medium text-slate-700">Major Tournament (Double Points)</label>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input 
                type="checkbox" 
                id="isOrderOfMerit" 
                name="isOrderOfMerit" 
                checked={isOrderOfMerit}
                onChange={(e) => setIsOrderOfMerit(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
              />
              <label htmlFor="isOrderOfMerit" className="text-sm font-medium text-slate-700">Order of Merit Event</label>
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                {editingTournamentId ? 'Update Tournament' : 'Save Tournament'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments?.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center text-slate-500 rounded-xl shadow-sm border border-slate-200">
            No tournaments found. Create a tournament to get started.
          </div>
        ) : (
          tournaments?.map((tournament) => (
            <div key={tournament.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className={`p-4 border-b ${tournament.isMajor ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} flex justify-between items-start`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {tournament.isMajor && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Major</span>}
                    {tournament.isOrderOfMerit && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">OOM</span>}
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">{tournament.format}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{tournament.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(tournament)} className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(tournament.id!)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">
                    {format(new Date(tournament.date), 'MMM d, yyyy')}
                    {tournament.endDate && ` - ${format(new Date(tournament.endDate), 'MMM d, yyyy')}`}
                    {tournament.numberOfRounds && tournament.numberOfRounds > 1 && ` (${tournament.numberOfRounds} Rounds)`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">{getCourseName(Number(tournament.courseId))}</span>
                </div>
                {tournament.sideGames && tournament.sideGames.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Side Games</p>
                    <div className="space-y-1">
                      {tournament.sideGames.map((game, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium text-slate-700">{game.type}{game.holeNumber ? ` (Hole ${game.holeNumber})` : ''}:</span>
                          <span className="text-slate-600">{getMemberName(Number(game.memberId))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                <button 
                  onClick={() => setManagingSideGames(Number(tournament.id))}
                  className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  Side Games
                </button>
                <button className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  Enter Scores
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {managingSideGames && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Manage Side Games
              </h2>
              <button onClick={() => setManagingSideGames(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                {tournaments?.find(t => t.id === managingSideGames)?.sideGames?.map((game, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-900">{game.type} {game.holeNumber && <span className="text-slate-500 text-sm">(Hole {game.holeNumber})</span>}</p>
                      <p className="text-sm text-slate-600">{getMemberName(Number(game.memberId))}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteSideGame(managingSideGames, idx)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!tournaments?.find(t => t.id === managingSideGames)?.sideGames || tournaments?.find(t => t.id === managingSideGames)?.sideGames?.length === 0) && (
                  <p className="text-center text-slate-500 text-sm py-4">No side games recorded yet.</p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New Winner</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contest Type</label>
                    <select 
                      value={newSideGame.type}
                      onChange={(e) => setNewSideGame({...newSideGame, type: e.target.value})}
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm"
                    >
                      <option value="Longest Drive">Longest Drive</option>
                      <option value="Nearest the Pin">Nearest the Pin</option>
                      <option value="Straightest Drive">Straightest Drive</option>
                      <option value="Best Putter">Best Putter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Hole (Optional)</label>
                    <input 
                      type="number" 
                      min="1" max="18"
                      value={newSideGame.holeNumber || ''}
                      onChange={(e) => setNewSideGame({...newSideGame, holeNumber: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm"
                      placeholder="e.g. 18"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Winner</label>
                    <select 
                      value={newSideGame.memberId || ''}
                      onChange={(e) => setNewSideGame({...newSideGame, memberId: e.target.value ? Number(e.target.value) : undefined})}
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border text-sm"
                    >
                      <option value="">Select a member...</option>
                      {members?.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => handleAddSideGame(managingSideGames)}
                  disabled={!newSideGame.memberId}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Winner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
