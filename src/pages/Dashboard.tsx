import { useLiveQuery } from 'dexie-react-hooks';
import { Users, Trophy, Map, Calendar as CalendarIcon, DatabaseZap } from 'lucide-react';
import { db } from '../db';
import { useState } from 'react';

export function Dashboard() {
  const [isSeeding, setIsSeeding] = useState(false);
  const memberCount = useLiveQuery(() => db.members.count());
  const tournamentCount = useLiveQuery(() => db.tournaments.count());
  const courseCount = useLiveQuery(() => db.courses.count());
  const scoreCount = useLiveQuery(() => db.scoreCards.count());

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      // Clear existing data
      await db.members.clear();
      await db.courses.clear();
      await db.tournaments.clear();
      await db.scoreCards.clear();

      // Add Members
      await db.members.bulkAdd([
        { name: 'Tiger Woods', handicapIndex: 2.4, divisionId: 1, joinDate: new Date(), isActive: true },
        { name: 'Rory McIlroy', handicapIndex: 1.1, divisionId: 1, joinDate: new Date(), isActive: true },
        { name: 'Jon Rahm', handicapIndex: 0.5, divisionId: 1, joinDate: new Date(), isActive: true },
        { name: 'Average Joe', handicapIndex: 18.5, divisionId: 2, joinDate: new Date(), isActive: true },
        { name: 'Weekend Warrior', handicapIndex: 24.0, divisionId: 3, joinDate: new Date(), isActive: true },
      ]);

      // Add Course
      const holes = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: [3, 4, 5].includes(i % 3) ? 3 : 4, // Just some random pars
        yardage: 350 + (i * 10),
        strokeIndex: (i % 18) + 1
      }));
      
      const courseId = await db.courses.add({
        name: 'Augusta National',
        location: 'Georgia, USA',
        par: holes.reduce((sum, h) => sum + h.par, 0),
        yardage: holes.reduce((sum, h) => sum + h.yardage, 0),
        courseRating: 74.5,
        slopeRating: 135,
        holes
      });

      // Add Tournament
      await db.tournaments.add({
        name: 'The Masters Society Event',
        courseId: courseId,
        seasonId: 1,
        date: new Date(),
        format: 'Stableford',
        isMajor: true
      });

      alert('Sample data seeded successfully!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <button 
          onClick={handleSeedData}
          disabled={isSeeding}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <DatabaseZap className="w-4 h-4" />
          {isSeeding ? 'Seeding...' : 'Seed Sample Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Members" value={memberCount ?? 0} icon={Users} color="bg-blue-500" />
        <StatCard title="Tournaments" value={tournamentCount ?? 0} icon={Trophy} color="bg-amber-500" />
        <StatCard title="Courses" value={courseCount ?? 0} icon={Map} color="bg-emerald-500" />
        <StatCard title="Scores Entered" value={scoreCount ?? 0} icon={CalendarIcon} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <p className="text-slate-500 text-sm">No recent activity to show.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4">Upcoming Tournaments</h2>
          <p className="text-slate-500 text-sm">No upcoming tournaments.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`p-4 rounded-lg text-white ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
