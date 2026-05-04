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
  divisionSettings?: Record<number, { promote: number; relegate: number }>;
}

export interface HoleScore {
  holeNumber: number;
  grossScore: number;
  putts?: number;
  fir?: boolean; // Fairway in Regulation
  gir?: boolean; // Green in Regulation
  sandSave?: boolean;
}

export interface SideGameWinner {
  type: 'Longest Drive' | 'Nearest the Pin' | string;
  memberId: number;
  holeNumber?: number;
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
  isOrderOfMerit?: boolean;
  sideGames?: SideGameWinner[];
}

export interface Division {
  id?: number;
  name: string;
}

const db = new Dexie('GolfSocietyDB') as Dexie & {
  members: EntityTable<Member, 'id'>;
  courses: EntityTable<Course, 'id'>;
  seasons: EntityTable<Season, 'id'>;
  tournaments: EntityTable<Tournament, 'id'>;
  scoreCards: EntityTable<ScoreCard, 'id'>;
  divisions: EntityTable<Division, 'id'>;
};

db.version(1).stores({
  members: '++id, name, divisionId, isActive',
  courses: '++id, name',
  seasons: '++id, name, startDate',
  tournaments: '++id, seasonId, courseId, date',
  scoreCards: '++id, tournamentId, memberId, [tournamentId+memberId]'
});

db.version(2).stores({
  members: '++id, name, divisionId, isActive',
  courses: '++id, name',
  seasons: '++id, name, startDate',
  tournaments: '++id, seasonId, courseId, date',
  scoreCards: '++id, tournamentId, memberId, [tournamentId+memberId]',
  divisions: '++id, name'
});

export { db };
