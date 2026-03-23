import { Download, Upload, DatabaseBackup } from 'lucide-react';
import { db } from '../db';
import { useState } from 'react';

export function Backup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        members: await db.members.toArray(),
        courses: await db.courses.toArray(),
        seasons: await db.seasons.toArray(),
        tournaments: await db.tournaments.toArray(),
        scoreCards: await db.scoreCards.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GolfSocietyBackup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Importing will overwrite all current data. Are you sure?')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      try {
        await db.members.clear();
        await db.courses.clear();
        await db.seasons.clear();
        await db.tournaments.clear();
        await db.scoreCards.clear();

        if (data.members?.length) await db.members.bulkAdd(data.members);
        if (data.courses?.length) await db.courses.bulkAdd(data.courses);
        if (data.seasons?.length) await db.seasons.bulkAdd(data.seasons);
        if (data.tournaments?.length) await db.tournaments.bulkAdd(data.tournaments);
        if (data.scoreCards?.length) await db.scoreCards.bulkAdd(data.scoreCards);
      } catch (e) {
        console.error('Error during import operations:', e);
        throw e;
      }

      alert('Data imported successfully!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Please ensure the file is a valid backup JSON.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Backup & Restore</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Download className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Export Data</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Download a complete backup of your society's database, including all members, courses, tournaments, and scores.
          </p>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-medium"
          >
            <DatabaseBackup className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Download Backup (JSON)'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <Upload className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Import Data</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Restore your database from a previously exported JSON backup file. <strong className="text-red-600">This will overwrite all existing data.</strong>
          </p>
          <label className={`w-full ${isImporting ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer font-medium`}>
            <Upload className="w-5 h-5" />
            {isImporting ? 'Importing...' : 'Select Backup File'}
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImport}
              disabled={isImporting}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
