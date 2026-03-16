/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Courses } from './pages/Courses';
import { Tournaments } from './pages/Tournaments';
import { Scores } from './pages/Scores';
import { Leaderboards } from './pages/Leaderboards';
import { Seasons } from './pages/Seasons';
import { Divisions } from './pages/Divisions';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';
import { Backup } from './pages/Backup';
import { Help } from './pages/Help';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="seasons" element={<Seasons />} />
          <Route path="divisions" element={<Divisions />} />
          <Route path="courses" element={<Courses />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="scores" element={<Scores />} />
          <Route path="leaderboards" element={<Leaderboards />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="backup" element={<Backup />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<div className="p-8 text-center text-gray-500">Coming soon...</div>} />
        </Route>
      </Routes>
    </Router>
  );
}
