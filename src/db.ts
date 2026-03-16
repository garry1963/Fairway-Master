import Dexie, { type EntityTable } from 'dexie';

export interface Member {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  handicapIndex: number;
  divisionId: number;
  joinDate: Date;
  isActive: boolean;
}

export interface HoleDefinition {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number;
}

export interface Course {
  id?: number;
  name: string;
  location: string;
  par: number;
  yardage: number;
  slopeRating: number;
  courseRating: number;
  holes: HoleDefinition[];
}

export interface Season {
  id?: number;
  name: string;
  startDate: Date;
  endDate: Date;
  numDivisions: number;
}

export interface Tournament {
  id?: number;
  seasonId: number;
  courseId: number;
  name: string;
  date: Date;
  endDate?: Date;
  numberOfRounds?: number;
  format: string; // 'Stableford', 'Stroke Play', etc.
  isMajor: boolean;
}

export interface HoleScore {
  holeNumber: number;
  grossScore: number;
}

export interface ScoreCard {
  id?: number;
  tournamentId: number;
  memberId: number;
  holes: HoleScore[];
  grossScore: number;
  netScore: number;
  stablefordPoints: number;
}

const db = new Dexie('GolfSocietyDB') as Dexie & {
  members: EntityTable<Member, 'id'>;
  courses: EntityTable<Course, 'id'>;
  seasons: EntityTable<Season, 'id'>;
  tournaments: EntityTable<Tournament, 'id'>;
  scoreCards: EntityTable<ScoreCard, 'id'>;
};

db.version(1).stores({
  members: '++id, name, divisionId, isActive',
  courses: '++id, name',
  seasons: '++id, name, startDate',
  tournaments: '++id, seasonId, courseId, date',
  scoreCards: '++id, tournamentId, memberId, [tournamentId+memberId]'
});

export { db };
