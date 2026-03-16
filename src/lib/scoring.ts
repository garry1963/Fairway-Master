export const ScoringEngine = {
  calculateNetHoleScore: (grossScore: number, holeStrokeIndex: number, playingHandicap: number): number => {
    let extraStrokes = 0;
    if (playingHandicap >= holeStrokeIndex) extraStrokes++;
    if (playingHandicap - 18 >= holeStrokeIndex) extraStrokes++; // For handicaps > 18
    if (playingHandicap - 36 >= holeStrokeIndex) extraStrokes++; // For handicaps > 36
    
    return grossScore - extraStrokes;
  },

  calculateStablefordPoints: (netScore: number, holePar: number): number => {
    const diff = netScore - holePar;
    if (diff <= -3) return 5; // Albatross
    if (diff === -2) return 4; // Eagle
    if (diff === -1) return 3; // Birdie
    if (diff === 0) return 2; // Par
    if (diff === 1) return 1; // Bogey
    return 0; // Double Bogey or worse
  }
};
