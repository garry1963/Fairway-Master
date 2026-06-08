import { Download, Upload, DatabaseBackup, Users, Trophy, Layers, Map } from 'lucide-react';
import { db } from '../db';
import { useState } from 'react';
import { convertToCSV, downloadCSV } from '../utils/csvExport';

export function Backup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportMembersCSV = async () => {
    try {
      const members = await db.members.toArray();
      const divisions = await db.divisions.toArray();
      const getDivisionName = (id: number) => {
        return divisions.find(d => d.id === id)?.name || `Division ${id}`;
      };

      const headers = ['ID', 'Name', 'Email', 'Phone', 'Handicap Index', 'Division Name', 'Status', 'Join Date'];
      const rows = members.map(m => [
        m.id || '',
        m.name,
        m.email || '',
        m.phone || '',
        m.handicapIndex,
        getDivisionName(m.divisionId),
        m.isActive ? 'Active' : 'Inactive',
        m.joinDate
      ]);
      const csvContent = convertToCSV(headers, rows);
      downloadCSV(`GolfSociety_Members_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    } catch (e) {
      console.error(e);
      alert('Failed to export members to CSV.');
    }
  };

  const exportDivisionsCSV = async () => {
    try {
      const divisions = await db.divisions.toArray();
      const members = await db.members.toArray();

      const headers = ['ID', 'Division Name', 'Active Member Count'];
      const rows = divisions.map(div => {
        const activeCount = members.filter(m => m.divisionId === div.id && m.isActive).length;
        return [
          div.id || '',
          div.name,
          activeCount
        ];
      });
      const csvContent = convertToCSV(headers, rows);
      downloadCSV(`GolfSociety_Divisions_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    } catch (e) {
      console.error(e);
      alert('Failed to export divisions to CSV.');
    }
  };

  const exportTournamentsCSV = async () => {
    try {
      const tournaments = await db.tournaments.toArray();
      const courses = await db.courses.toArray();
      const getCourseName = (courseId: number) => {
        return courses.find(c => c.id === courseId)?.name || 'Unknown Course';
      };

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
    } catch (e) {
      console.error(e);
      alert('Failed to export tournaments to CSV.');
    }
  };

  const exportCoursesCSV = async () => {
    try {
      const courses = await db.courses.toArray();

      const headers = ['ID', 'Course Name', 'Location', 'Total Par', 'Total Yardage', 'Slope Rating', 'Course Rating'];
      for (let i = 1; i <= 18; i++) {
        headers.push(`Hole ${i} Par`, `Hole ${i} Yardage`, `Hole ${i} S.I.`);
      }

      const rows = courses.map(course => {
        const row = [
          course.id || '',
          course.name,
          course.location,
          course.par,
          course.yardage,
          course.slopeRating,
          course.courseRating
        ];

        for (let i = 0; i < 18; i++) {
          const hole = course.holes[i];
          if (hole) {
            row.push(hole.par, hole.yardage, hole.strokeIndex);
          } else {
            row.push('', '', '');
          }
        }

        return row;
      });

      const csvContent = convertToCSV(headers, rows);
      downloadCSV(`GolfSociety_Courses_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    } catch (e) {
      console.error(e);
      alert('Failed to export courses to CSV.');
    }
  };

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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">CSV Export Hub</h2>
            <p className="text-sm text-slate-500">Download separate datasets as CSV files perfect for Microsoft Excel or Google Sheets.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <button
            onClick={exportMembersCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition duration-200 text-left flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-bold text-slate-800 text-sm">Members Data</span>
              <span className="block text-xs text-slate-500 mt-1">Hcp index, Division, Status...</span>
            </div>
          </button>

          <button
            onClick={exportDivisionsCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition duration-200 text-left flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-bold text-slate-800 text-sm">Divisions Data</span>
              <span className="block text-xs text-slate-500 mt-1">Division names & active sizes...</span>
            </div>
          </button>

          <button
            onClick={exportTournamentsCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition duration-200 text-left flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-bold text-slate-800 text-sm">Tournaments</span>
              <span className="block text-xs text-slate-500 mt-1">Dates, courses, major indicator...</span>
            </div>
          </button>

          <button
            onClick={exportCoursesCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition duration-200 text-left flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-bold text-slate-800 text-sm">Courses Data</span>
              <span className="block text-xs text-slate-500 mt-1">Rating, slope, 18 holes par/yards...</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
