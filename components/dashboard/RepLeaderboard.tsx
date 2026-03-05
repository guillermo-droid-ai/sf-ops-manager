import { clsx } from 'clsx';

interface RepStats {
  ownerName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  staleLeads: number;
  tasksLogged: number;
}

export default function RepLeaderboard({ reps, loading }: { reps: RepStats[]; loading: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">Rep Leaderboard</h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-800 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : reps.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-4">No rep data yet</p>
      ) : (
        <div className="space-y-2">
          {reps.slice(0, 8).map((rep, i) => (
            <div key={rep.ownerName} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition">
              <span className="text-gray-600 text-xs w-4 text-center font-bold">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{rep.ownerName}</p>
                <p className="text-xs text-gray-500">
                  {rep.totalLeads} leads · {rep.tasksLogged} activities
                </p>
              </div>
              <div className="text-right">
                <p className={clsx('text-sm font-bold', rep.conversionRate >= 20 ? 'text-green-400' : rep.conversionRate >= 10 ? 'text-yellow-400' : 'text-gray-400')}>
                  {rep.conversionRate}%
                </p>
                {rep.staleLeads > 0 && (
                  <p className="text-xs text-red-400">{rep.staleLeads} stale</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
