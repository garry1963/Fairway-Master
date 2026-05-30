import { useLiveQuery } from 'dexie-react-hooks';
import { Users, Trophy, Map, Calendar as CalendarIcon, DatabaseZap, Award } from 'lucide-react';
import { db } from '../db';
import { useState } from 'react';
import { MemberOfTheMonth } from '../components/MemberOfTheMonth';

export function Dashboard() {
  const [isSeeding, setIsSeeding] = useState(false);
  const memberCount = useLiveQuery(() => db.members.count());
  const tournamentCount = useLiveQuery(() => db.tournaments.count());
  const courseCount = useLiveQuery(() => db.courses.count());
  const scoreCount = useLiveQuery(() => db.scoreCards.count());

  // Fetch the 5 most recently entered tournament scores
  const recentScores = useLiveQuery(async () => {
    const cards = await db.scoreCards.toArray();
    // Sort by id descending (most recently created/entered first)
    const sorted = cards.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
    
    // Resolve member and tournament titles
    const data = await Promise.all(
      sorted.map(async (card) => {
        const member = await db.members.get(card.memberId);
        const tournament = await db.tournaments.get(card.tournamentId);
        return {
          id: card.id,
          playerName: member ? member.name : 'Unknown Player',
          tournamentName: tournament ? tournament.name : 'Unknown Tournament',
          points: card.stablefordPoints,
          grossScore: card.grossScore,
          netScore: card.netScore
        };
      })
    );
    return data;
  });

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <MemberOfTheMonth />
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            Recently Entered Scores
          </h2>
          {recentScores && recentScores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="pb-3 font-medium">Player</th>
                    <th className="pb-3 font-medium">Tournament</th>
                    <th className="pb-3 font-medium text-right">Points Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentScores.map((score) => (
                    <tr key={score.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-medium text-slate-900">{score.playerName}</td>
                      <td className="py-3 text-slate-600">{score.tournamentName}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {score.points} pts
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm py-4">No scores entered yet. Go to the Score Entry page to log tournament rounds!</p>
          )}
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
