import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { db } from '../db';
import { format } from 'date-fns';

export function Seasons() {
  const [isAdding, setIsAdding] = useState(false);
  const seasons = useLiveQuery(() => db.seasons.toArray());

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

  return (
    <div className="space-y-6">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
