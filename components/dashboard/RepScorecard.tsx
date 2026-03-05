'use client';

import type { RepScore } from '@/lib/types';

interface RepScorecardProps {
  reps: RepScore[];
  onRepClick: (ownerId: string, name: string) => void;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function getScoreStyles(score: RepScore['score']): string {
  switch (score) {
    case 'A':
      return 'bg-green-600 text-white';
    case 'B':
      return 'bg-blue-600 text-white';
    case 'C':
      return 'bg-yellow-600 text-black';
    case 'D':
      return 'bg-red-600 text-white';
  }
}

export function RepScorecard({ reps, onRepClick }: RepScorecardProps) {
  if (reps.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-200 mb-3">Rep Scorecard</h2>
        <p className="text-gray-400 text-sm">No rep data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-200 mb-3">Rep Scorecard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="pb-2 pr-4">Rep Name</th>
              <th className="pb-2 px-4 text-right">Leads</th>
              <th className="pb-2 px-4 text-right">Stale 7d+</th>
              <th className="pb-2 px-4 text-right">Opps</th>
              <th className="pb-2 px-4 text-right">Trans</th>
              <th className="pb-2 px-4">Last Activity</th>
              <th className="pb-2 pl-4 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep) => {
              const stalePercent = rep.leadsActive > 0 
                ? Math.round((rep.leadsStale7d / rep.leadsActive) * 100) 
                : 0;
              
              return (
                <tr 
                  key={rep.ownerId} 
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-2 pr-4">
                    <button 
                      onClick={() => onRepClick(rep.ownerId, rep.name)}
                      className="text-blue-400 hover:text-blue-300 hover:underline text-left"
                    >
                      {rep.name}
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right text-gray-200">
                    {rep.leadsActive.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className={stalePercent > 25 ? 'text-red-400' : stalePercent > 10 ? 'text-yellow-400' : 'text-gray-200'}>
                      {rep.leadsStale7d.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-xs ml-1">({stalePercent}%)</span>
                  </td>
                  <td className="py-2 px-4 text-right text-gray-200">
                    {rep.oppPipeline.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-200">
                    {rep.transActive.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {formatDate(rep.lastActivity)}
                  </td>
                  <td className="py-2 pl-4 text-center">
                    <span className={`inline-block w-8 py-0.5 rounded text-xs font-bold ${getScoreStyles(rep.score)}`}>
                      {rep.score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
