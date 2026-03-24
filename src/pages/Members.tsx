import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, UserPlus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { db, type Member } from '../db';

export function Members() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [handicapIndex, setHandicapIndex] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const divisions = useLiveQuery(() => db.divisions.toArray());
  
  const members = useLiveQuery(
    async () => {
      const allMembers = await db.members.toArray();
      return allMembers
        .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [searchTerm]
  );

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const memberData = {
      name,
      email,
      phone,
      handicapIndex: parseFloat(handicapIndex),
      divisionId: parseInt(divisionId, 10),
      isActive
    };

    if (editingMemberId) {
      await db.members.update(editingMemberId, memberData);
    } else {
      await db.members.add({
        ...memberData,
        joinDate: new Date()
      });
    }
    
    handleCancel();
  };

  const handleEdit = (member: Member) => {
    setIsAdding(true);
    setEditingMemberId(member.id!);
    setName(member.name);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setHandicapIndex(member.handicapIndex.toString());
    setDivisionId(member.divisionId.toString());
    setIsActive(member.isActive ?? true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingMemberId(null);
    setName('');
    setEmail('');
    setPhone('');
    setHandicapIndex('');
    setDivisionId('');
    setIsActive(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this member?')) {
      await db.members.delete(id);
    }
  };

  const getDivisionName = (id: number) => {
    return divisions?.find(d => d.id === id)?.name || `Division ${id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Members</h1>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingMemberId ? 'Edit Member' : 'Add New Member'}</h2>
          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input 
                required 
                name="name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                name="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input 
                name="phone" 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Handicap Index *</label>
              <input 
                required 
                name="handicapIndex" 
                type="number" 
                step="0.1" 
                value={handicapIndex}
                onChange={(e) => setHandicapIndex(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Division *</label>
              <select 
                required 
                name="divisionId" 
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              >
                <option value="">Select a division...</option>
                {divisions?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            {editingMemberId && (
              <div className="flex items-center gap-2 mt-6">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  name="isActive" 
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" 
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active Member</label>
              </div>
            )}
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingMemberId ? 'Update Member' : 'Save Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Handicap</th>
                <th className="px-6 py-3 font-medium">Division</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {members?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No members found. Add a member to get started.
                  </td>
                </tr>
              ) : (
                members?.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{member.name}</td>
                    <td className="px-6 py-4">{member.handicapIndex.toFixed(1)}</td>
                    <td className="px-6 py-4">{getDivisionName(member.divisionId)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(member)} className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(member.id!)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
