import { useLiveQuery } from 'dexie-react-hooks';
import { Layers } from 'lucide-react';
import { db } from '../db';

export function Divisions() {
  const members = useLiveQuery(() => db.members.toArray());

  const divisions = [1, 2, 3, 4];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Divisions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {divisions.map(div => {
          const divMembers = members?.filter(m => m.divisionId === div).sort((a, b) => a.handicapIndex - b.handicapIndex) || [];
          
          return (
            <div key={div} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 border-slate-200 flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">Division {div}</h2>
                <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">
                  {divMembers.length} Members
                </span>
              </div>
              <div className="p-0">
                {divMembers.length === 0 ? (
                  <p className="p-4 text-slate-500 text-sm text-center">No members in this division.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Player</th>
                        <th className="px-4 py-2 font-medium text-right">Handicap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {divMembers.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{member.name}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{member.handicapIndex.toFixed(1)}</td>
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
