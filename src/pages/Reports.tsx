import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FileText, FileSpreadsheet, Image as ImageIcon, Download, Share2, Printer, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng, toCanvas } from 'html-to-image';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function Reports() {
  const [activeTab, setActiveTab] = useState<'pdf' | 'csv' | 'social' | 'scorecard'>('pdf');
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [selectedTournament, setSelectedTournament] = useState<number | 'all'>('all');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Social Media Graphic State
  const [socialTemplate, setSocialTemplate] = useState('player-of-month');
  const [socialPlayerId, setSocialPlayerId] = useState<number | ''>('');
  const [socialSubtitle, setSocialSubtitle] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

  const seasons = useLiveQuery(() => db.seasons.toArray());
  const tournaments = useLiveQuery(() => db.tournaments.toArray());
  const members = useLiveQuery(() => db.members.toArray());
  const scoreCards = useLiveQuery(() => db.scoreCards.toArray());
  const courses = useLiveQuery(() => db.courses.toArray());
  const divisions = useLiveQuery(() => db.divisions.toArray());

  const getMemberName = (memberId: number) => {
    return members?.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const getTournamentName = (tournamentId: number) => {
    return tournaments?.find(t => t.id === tournamentId)?.name || 'Unknown';
  };

  const getDivisionName = (idStr: string) => {
    if (idStr === 'Unassigned') return 'Unassigned';
    const id = parseInt(idStr, 10);
    return divisions?.find(d => d.id === id)?.name || `Division ${id}`;
  };

  const calculateOrderOfMerit = () => {
    if (!scoreCards || !members || !tournaments) return [];
    
    const playerPoints: Record<number, number> = {};
    const playerEvents: Record<number, number> = {};
    
    scoreCards.forEach(sc => {
      const tournament = tournaments.find(t => t.id === sc.tournamentId);
      if (!tournament || tournament.isOrderOfMerit === false) return;
      
      if (selectedSeason !== 'all' && tournament.seasonId !== selectedSeason) return;
      if (selectedTournament !== 'all' && tournament.id !== selectedTournament) return;

      playerPoints[sc.memberId] = (playerPoints[sc.memberId] || 0) + sc.stablefordPoints;
      playerEvents[sc.memberId] = (playerEvents[sc.memberId] || 0) + 1;
    });

    return Object.keys(playerPoints)
      .map(memberId => ({
        memberId: Number(memberId),
        name: getMemberName(Number(memberId)),
        points: playerPoints[Number(memberId)],
        events: playerEvents[Number(memberId)]
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  };

  const calculateDivisionTables = () => {
    if (!scoreCards || !members || !tournaments) return {};
    
    // Calculate total qualifying rounds per member in the selected season
    const totalRoundsPerMember: Record<number, number> = {};
    scoreCards.forEach(sc => {
      const tournament = tournaments.find(t => t.id === sc.tournamentId);
      if (!tournament || tournament.isOrderOfMerit === false) return;
      if (selectedSeason !== 'all' && tournament.seasonId !== selectedSeason) return;
      
      if (sc.grossScore > 0) {
        totalRoundsPerMember[sc.memberId] = (totalRoundsPerMember[sc.memberId] || 0) + 1;
      }
    });

    const divisionPoints: Record<string, Record<number, { points: number, events: number }>> = {};
    
    scoreCards.forEach(sc => {
      const tournament = tournaments.find(t => t.id === sc.tournamentId);
      if (!tournament || tournament.isOrderOfMerit === false) return;
      
      if (selectedSeason !== 'all' && tournament.seasonId !== selectedSeason) return;
      if (selectedTournament !== 'all' && tournament.id !== selectedTournament) return;

      const member = members.find(m => m.id === sc.memberId);
      if (!member) return;
      
      const divId = member.divisionId?.toString() || 'Unassigned';
      if (!divisionPoints[divId]) divisionPoints[divId] = {};
      
      if (!divisionPoints[divId][sc.memberId]) {
        divisionPoints[divId][sc.memberId] = { points: 0, events: 0 };
      }
      
      divisionPoints[divId][sc.memberId].points += sc.stablefordPoints;
      if (sc.grossScore > 0) {
        divisionPoints[divId][sc.memberId].events += 1;
      }
    });

    const divisionTables: Record<string, any[]> = {};
    Object.keys(divisionPoints).forEach(divId => {
      divisionTables[divId] = Object.keys(divisionPoints[divId])
        .map(memberIdStr => {
          const memberId = Number(memberIdStr);
          return {
            memberId,
            name: getMemberName(memberId),
            points: divisionPoints[divId][memberId].points,
            events: divisionPoints[divId][memberId].events
          };
        })
        .filter(player => (totalRoundsPerMember[player.memberId] || 0) >= 4)
        .sort((a, b) => b.points - a.points);
    });

    return divisionTables;
  };

  const calculateTournamentLeaderboard = () => {
    if (!scoreCards || !members || selectedTournament === 'all') return [];
    
    const tournamentScores = scoreCards.filter(sc => sc.tournamentId === selectedTournament);
    
    return tournamentScores.map(sc => ({
      memberId: sc.memberId,
      name: getMemberName(sc.memberId),
      gross: sc.grossScore,
      net: sc.netScore,
      stableford: sc.stablefordPoints
    })).sort((a, b) => b.stableford - a.stableford);
  };

  const calculatePerformanceMetrics = () => {
    if (!scoreCards || !members || !tournaments || !courses) return [];
    
    const playerStats: Record<number, { 
      rounds: number, fir: number, gir: number, putts: number, sandSaves: number, totalHoles: number, par3s: number,
      par3Score: number, par3Count: number,
      par4Score: number, par4Count: number,
      par5Score: number, par5Count: number,
      birdiesOrBetter: number, pars: number, bogeys: number, doubleBogeysOrWorse: number
    }> = {};
    
    scoreCards.forEach(sc => {
      const tournament = tournaments.find(t => t.id === sc.tournamentId);
      if (!tournament) return;
      
      if (selectedSeason !== 'all' && tournament.seasonId !== selectedSeason) return;
      if (selectedTournament !== 'all' && tournament.id !== selectedTournament) return;

      const course = courses?.find(c => c.id === tournament.courseId);
      if (!course) return;
      
      if (!playerStats[sc.memberId]) {
        playerStats[sc.memberId] = { 
          rounds: 0, fir: 0, gir: 0, putts: 0, sandSaves: 0, totalHoles: 0, par3s: 0,
          par3Score: 0, par3Count: 0,
          par4Score: 0, par4Count: 0,
          par5Score: 0, par5Count: 0,
          birdiesOrBetter: 0, pars: 0, bogeys: 0, doubleBogeysOrWorse: 0
        };
      }
      
      const stats = playerStats[sc.memberId];
      stats.rounds += 1;
      
      sc.holes.forEach(h => {
        if (h.grossScore > 0) {
          stats.totalHoles += 1;
          stats.putts += (h.putts || 0);
          if (h.fir) stats.fir += 1;
          if (h.gir) stats.gir += 1;
          if (h.sandSave) stats.sandSaves += 1;
          
          // Check if par 3
          const holeDef = course?.holes.find(ch => ch.holeNumber === h.holeNumber);
          if (holeDef) {
            if (holeDef.par === 3) {
              stats.par3s += 1;
              stats.par3Score += h.grossScore;
              stats.par3Count += 1;
            } else if (holeDef.par === 4) {
              stats.par4Score += h.grossScore;
              stats.par4Count += 1;
            } else if (holeDef.par === 5) {
              stats.par5Score += h.grossScore;
              stats.par5Count += 1;
            }

            const diff = h.grossScore - holeDef.par;
            if (diff <= -1) stats.birdiesOrBetter += 1;
            else if (diff === 0) stats.pars += 1;
            else if (diff === 1) stats.bogeys += 1;
            else if (diff >= 2) stats.doubleBogeysOrWorse += 1;
          }
        }
      });
    });

    return Object.keys(playerStats)
      .map(memberId => {
        const stats = playerStats[Number(memberId)];
        const firPossible = stats.totalHoles - stats.par3s;
        return {
          memberId: Number(memberId),
          name: getMemberName(Number(memberId)),
          firPct: firPossible > 0 ? Math.round((stats.fir / firPossible) * 100) : 0,
          girPct: stats.totalHoles > 0 ? Math.round((stats.gir / stats.totalHoles) * 100) : 0,
          puttsPerRound: stats.rounds > 0 ? (stats.putts / stats.rounds).toFixed(1) : '0.0',
          sandSaves: stats.sandSaves,
          par3Avg: stats.par3Count > 0 ? (stats.par3Score / stats.par3Count).toFixed(2) : 'N/A',
          par4Avg: stats.par4Count > 0 ? (stats.par4Score / stats.par4Count).toFixed(2) : 'N/A',
          par5Avg: stats.par5Count > 0 ? (stats.par5Score / stats.par5Count).toFixed(2) : 'N/A',
          birdiesOrBetter: stats.birdiesOrBetter,
          pars: stats.pars,
          bogeys: stats.bogeys,
          doubleBogeysOrWorse: stats.doubleBogeysOrWorse
        };
      })
      .sort((a, b) => b.girPct - a.girPct)
      .slice(0, 10);
  };

  const getSideGamesByType = () => {
    if (!tournaments) return {};
    
    const gamesByType: Record<string, { tournamentName: string, winnerName: string }[]> = {};
    
    tournaments.forEach(t => {
      if (selectedSeason !== 'all' && t.seasonId !== selectedSeason) return;
      if (selectedTournament !== 'all' && t.id !== selectedTournament) return;

      if (t.sideGames) {
        t.sideGames.forEach(sg => {
          if (!gamesByType[sg.type]) {
            gamesByType[sg.type] = [];
          }
          gamesByType[sg.type].push({
            tournamentName: t.name,
            winnerName: getMemberName(sg.memberId)
          });
        });
      }
    });
    
    return gamesByType;
  };

  const orderOfMerit = calculateOrderOfMerit();
  const divisionTables = calculateDivisionTables();
  const tournamentLeaderboard = calculateTournamentLeaderboard();
  const performanceMetrics = calculatePerformanceMetrics();
  const sideGamesByType = getSideGamesByType();

  const getSocialPlayerStats = () => {
    if (!socialPlayerId || !scoreCards || !tournaments) return null;
    
    const playerScores = scoreCards.filter(sc => sc.memberId === socialPlayerId);
    if (playerScores.length === 0) return null;
    
    const wins = playerScores.filter(sc => {
      // Simplistic win calculation: highest stableford points in a tournament
      const tournamentScores = scoreCards.filter(s => s.tournamentId === sc.tournamentId);
      const maxPoints = Math.max(...tournamentScores.map(s => s.stablefordPoints));
      return sc.stablefordPoints === maxPoints && maxPoints > 0;
    }).length;
    
    const totalPoints = playerScores.reduce((sum, sc) => sum + sc.stablefordPoints, 0);
    const avgScore = playerScores.reduce((sum, sc) => sum + sc.grossScore, 0) / playerScores.length;
    
    const member = members?.find(m => m.id === socialPlayerId);
    
    return {
      name: member?.name || 'Unknown',
      handicap: member?.handicapIndex || 'N/A',
      wins,
      avgScore: avgScore.toFixed(1),
      totalPoints
    };
  };

  const socialStats = getSocialPlayerStats();

  const handleExportCSV = () => {
    if (!members || !scoreCards || !tournaments || !courses) return;

    const data = scoreCards.map(sc => {
      const member = members.find(m => m.id === sc.memberId);
      const tournament = tournaments.find(t => t.id === sc.tournamentId);
      const course = courses.find(c => c.id === tournament?.courseId);

      let birdiesOrBetter = 0;
      let pars = 0;
      let bogeys = 0;
      let doubleBogeysOrWorse = 0;

      if (course) {
        sc.holes.forEach(h => {
          if (h.grossScore > 0) {
            const holeDef = course.holes.find(ch => ch.holeNumber === h.holeNumber);
            if (holeDef) {
              const diff = h.grossScore - holeDef.par;
              if (diff <= -1) birdiesOrBetter += 1;
              else if (diff === 0) pars += 1;
              else if (diff === 1) bogeys += 1;
              else if (diff >= 2) doubleBogeysOrWorse += 1;
            }
          }
        });
      }

      return {
        Player: member?.name || 'Unknown',
        Tournament: tournament?.name || 'Unknown',
        Date: tournament?.date ? format(tournament.date, 'yyyy-MM-dd') : '',
        Course: course?.name || 'Unknown',
        Gross: sc.grossScore,
        Net: sc.netScore,
        Stableford: sc.stablefordPoints,
        Putts: sc.holes.reduce((sum, h) => sum + (h.putts || 0), 0),
        FIR: sc.holes.filter(h => h.fir).length,
        GIR: sc.holes.filter(h => h.gir).length,
        SandSaves: sc.holes.filter(h => h.sandSave).length,
        'Birdies+': birdiesOrBetter,
        Pars: pars,
        Bogeys: bogeys,
        'Double Bogeys+': doubleBogeysOrWorse
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");
    XLSX.writeFile(workbook, `golf_society_export_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('pdf-report-content');
    if (!element) return;

    const canvas = await toCanvas(element, { pixelRatio: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`season_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleExportSocial = async () => {
    const element = document.getElementById('social-graphic-content');
    if (!element) return;

    const dataUrl = await toPng(element, { pixelRatio: 3 });
    const link = document.createElement('a');
    link.download = `social_graphic_${format(new Date(), 'yyyyMMdd')}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Reports & Exports</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 p-0"
            >
              <option value="all">All Seasons</option>
              {seasons?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 p-0"
            >
              <option value="all">All Tournaments</option>
              {tournaments?.filter(t => selectedSeason === 'all' || t.seasonId === selectedSeason).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'pdf' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            PDF Reports
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'csv' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV & Excel
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'social' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Social Media Graphics
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'scorecard' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Scorecard Images
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'pdf' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">Printable PDF Reports</h2>
                <button onClick={handleExportPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" />
                  Generate PDF
                </button>
              </div>
              <p className="text-slate-600">Best for "ready-to-print" documents like full-season leaderboards, detailed round breakdowns, and professional sponsorship fulfillment reports.</p>
              
              <div className="bg-slate-50 p-8 rounded-xl border border-slate-200" id="pdf-report-content">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wider">Golf Society</h1>
                  <h2 className="text-xl text-slate-600 mt-2">Season Summary Report</h2>
                  <p className="text-sm text-slate-500 mt-1">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">Order of Merit - Top 10</h3>
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="p-2 font-semibold">Rank</th>
                          <th className="p-2 font-semibold">Player</th>
                          <th className="p-2 font-semibold">Events</th>
                          <th className="p-2 font-semibold text-right">Total Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderOfMerit.length > 0 ? orderOfMerit.map((player, idx) => (
                          <tr key={player.memberId} className="border-b border-slate-200">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-medium">{player.name}</td>
                            <td className="p-2">{player.events}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">{player.points}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="p-4 text-center text-slate-500">No data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">Division Tables</h3>
                    {Object.keys(divisionTables).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.keys(divisionTables).map(divId => (
                          <div key={divId}>
                            <h4 className="font-bold text-emerald-700 mb-2">
                              {getDivisionName(divId)}
                            </h4>
                            <table className="w-full text-sm text-left">
                              <thead>
                                <tr className="bg-slate-200">
                                  <th className="p-2 font-semibold">Rank</th>
                                  <th className="p-2 font-semibold">Player</th>
                                  <th className="p-2 font-semibold">Events</th>
                                  <th className="p-2 font-semibold text-right">Points</th>
                                </tr>
                              </thead>
                              <tbody>
                                {divisionTables[divId].map((player, idx) => (
                                  <tr key={player.memberId} className="border-b border-slate-200">
                                    <td className="p-2">{idx + 1}</td>
                                    <td className="p-2 font-medium">{player.name}</td>
                                    <td className="p-2">{player.events}</td>
                                    <td className="p-2 text-right font-bold text-emerald-700">{player.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 bg-slate-50 rounded border border-slate-200">
                        No division data available
                      </div>
                    )}
                  </div>

                  {selectedTournament !== 'all' && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">Tournament Leaderboard: {getTournamentName(selectedTournament)}</h3>
                      {tournamentLeaderboard.length > 0 ? (
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="bg-slate-200">
                              <th className="p-2 font-semibold">Rank</th>
                              <th className="p-2 font-semibold">Player</th>
                              <th className="p-2 font-semibold text-center">Gross</th>
                              <th className="p-2 font-semibold text-center">Net</th>
                              <th className="p-2 font-semibold text-right">Stableford</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournamentLeaderboard.map((player, idx) => (
                              <tr key={player.memberId} className="border-b border-slate-200">
                                <td className="p-2">{idx + 1}</td>
                                <td className="p-2 font-medium">{player.name}</td>
                                <td className="p-2 text-center">{player.gross}</td>
                                <td className="p-2 text-center">{player.net}</td>
                                <td className="p-2 text-right font-bold text-emerald-700">{player.stableford}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-slate-500 bg-slate-50 rounded border border-slate-200">
                          No leaderboard data available for this tournament
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">Advanced Statistics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-200">
                            <th className="p-2 font-semibold">Player</th>
                            <th className="p-2 font-semibold text-center">FIR %</th>
                            <th className="p-2 font-semibold text-center">GIR %</th>
                            <th className="p-2 font-semibold text-center">Putts/Rd</th>
                            <th className="p-2 font-semibold text-center">Par 3 Avg</th>
                            <th className="p-2 font-semibold text-center">Par 4 Avg</th>
                            <th className="p-2 font-semibold text-center">Par 5 Avg</th>
                            <th className="p-2 font-semibold text-center">Birdies+</th>
                            <th className="p-2 font-semibold text-center">Pars</th>
                            <th className="p-2 font-semibold text-center">Bogeys</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceMetrics.length > 0 ? performanceMetrics.map((player) => (
                            <tr key={player.memberId} className="border-b border-slate-200">
                              <td className="p-2 font-medium">{player.name}</td>
                              <td className="p-2 text-center">{player.firPct}%</td>
                              <td className="p-2 text-center">{player.girPct}%</td>
                              <td className="p-2 text-center">{player.puttsPerRound}</td>
                              <td className="p-2 text-center">{player.par3Avg}</td>
                              <td className="p-2 text-center">{player.par4Avg}</td>
                              <td className="p-2 text-center">{player.par5Avg}</td>
                              <td className="p-2 text-center">{player.birdiesOrBetter}</td>
                              <td className="p-2 text-center">{player.pars}</td>
                              <td className="p-2 text-center">{player.bogeys}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={10} className="p-4 text-center text-slate-500">No data available</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">Side Games & Contests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.keys(sideGamesByType).length > 0 ? Object.keys(sideGamesByType).map(type => (
                        <div key={type} className="bg-white p-4 rounded border border-slate-200">
                          <h4 className="font-bold text-emerald-700">{type} Winners</h4>
                          <ul className="mt-2 space-y-1 text-sm">
                            {sideGamesByType[type].map((game, idx) => (
                              <li key={idx}><span className="font-medium">{game.tournamentName}:</span> {game.winnerName}</li>
                            ))}
                          </ul>
                        </div>
                      )) : (
                        <div className="col-span-2 text-slate-500 text-sm">No side games recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">Data Export (CSV & Excel)</h2>
                <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" />
                  Export to Excel
                </button>
              </div>
              <p className="text-slate-600">Critical for "data nerds" who want to perform custom analysis, create their own charts, or archive long-term player history.</p>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center justify-center min-h-[300px]">
                <div className="text-center max-w-md">
                  <FileSpreadsheet className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Batch Exporting Available</h3>
                  <p className="text-slate-600 text-sm">
                    Export player data for the entire group at once. Includes all performance metrics (FIR, GIR, Putts, Sand Saves), handicap tracking history, and tournament scores.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">Social Media Graphics</h2>
                <button 
                  onClick={handleExportSocial} 
                  disabled={isGeneratingImage || !socialPlayerId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isGeneratingImage ? 'Generating...' : 'Download Graphic'}
                </button>
              </div>
              <p className="text-slate-600">Provide editable templates for members to share achievements, round summaries, or "Player of the Month" stats on Instagram or WhatsApp.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4">Customize Graphic</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Template Type</label>
                        <select 
                          value={socialTemplate}
                          onChange={(e) => setSocialTemplate(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="player-of-month">Player of the Month</option>
                          <option value="tournament-winner">Tournament Winner</option>
                          <option value="season-stats">Season Stats</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Player</label>
                        <select 
                          value={socialPlayerId}
                          onChange={(e) => setSocialPlayerId(Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-- Select a Player --</option>
                          {[...(members || [])]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle (e.g., Month/Event)</label>
                        <input 
                          type="text" 
                          value={socialSubtitle}
                          onChange={(e) => setSocialSubtitle(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="e.g., May 2024"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-2 flex justify-center items-center bg-slate-100 p-8 rounded-xl border border-slate-200">
                  {socialPlayerId && socialStats ? (
                    <div id="social-graphic-content" className="w-[400px] h-[400px] bg-gradient-to-br from-emerald-800 to-slate-900 rounded-xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-white p-8">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                      
                      <div className="z-10 text-center w-full">
                        <div className="uppercase tracking-widest text-emerald-400 text-xs font-bold mb-4">
                          {socialTemplate === 'player-of-month' ? 'Player of the Month' : 
                           socialTemplate === 'tournament-winner' ? 'Tournament Winner' : 'Season Stats'}
                        </div>
                        <h2 className="text-4xl font-black mb-1">{socialStats.name.toUpperCase()}</h2>
                        <p className="text-slate-300 text-sm mb-8">{socialSubtitle}</p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-emerald-400">{socialStats.wins}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-300 mt-1">Wins</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-emerald-400">{socialStats.avgScore}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-300 mt-1">Avg Score</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-emerald-400">{socialStats.totalPoints}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-300 mt-1">Total Pts</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-emerald-400">{socialStats.handicap}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-300 mt-1">Handicap</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute bottom-4 text-center w-full text-xs text-slate-400/60 font-medium tracking-widest">
                        GOLF SOCIETY APP
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 p-8">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Select a player to preview the graphic</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scorecard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">Scorecard Images</h2>
              </div>
              <p className="text-slate-600">Allow users to save digital scorecards as high-resolution images for easy sharing or personal digital scrapbooking.</p>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center justify-center min-h-[300px]">
                <div className="text-center max-w-md">
                  <ImageIcon className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Select a Round to Export</h3>
                  <p className="text-slate-600 text-sm mb-6">
                    Navigate to the Scores page, select a specific round, and click the "Export Scorecard" button to generate a high-resolution image of the scorecard.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
