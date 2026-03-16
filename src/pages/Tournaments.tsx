import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, Plus, Trash2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { db, type Tournament } from '../db';
import { format } from 'date-fns';

export function Tournaments() {
  const [isAdding, setIsAdding] = useState(false);
  
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());

  const handleAddTournament = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await db.tournaments.add({
      name: formData.get('name') as string,
      courseId: parseInt(formData.get('courseId') as string, 10),
      seasonId: 1, // Default season for now
      date: new Date(formData.get('date') as string),
      format: formData.get('format') as string,
      isMajor: formData.get('isMajor') === 'on'
    });
    
    setIsAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this tournament?')) {
      await db.tournaments.delete(id);
    }
  };

  const getCourseName = (courseId: number) => {
    return courses?.find(c => c.id === courseId)?.name || 'Unknown Course';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Tournaments</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Create Tournament
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Tournament</h2>
          <form onSubmit={handleAddTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tournament Name *</label>
              <input required name="name" type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
              <select required name="courseId" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border">
                <option value="">Select a course...</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input required name="date" type="date" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format *</label>
              <select required name="format" className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border">
                <option value="Stableford">Stableford</option>
                <option value="Stroke Play">Stroke Play</option>
                <option value="Modified Stableford">Modified Stableford</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isMajor" name="isMajor" className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4" />
              <label htmlFor="isMajor" className="text-sm font-medium text-slate-700">Major Tournament (Double Points)</label>
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Save Tournament</button>
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
                  <div className="flex items-center gap-2 mb-1">
                    {tournament.isMajor && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Major</span>}
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">{tournament.format}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{tournament.name}</h3>
                </div>
                <button onClick={() => handleDelete(tournament.id!)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{format(new Date(tournament.date), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">{getCourseName(tournament.courseId)}</span>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  Enter Scores
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
