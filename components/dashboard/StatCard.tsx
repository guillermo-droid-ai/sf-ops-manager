import { clsx } from 'clsx';

const colors = {
  blue: 'bg-blue-600/20 text-blue-400 border-blue-700/50',
  green: 'bg-green-600/20 text-green-400 border-green-700/50',
  red: 'bg-red-600/20 text-red-400 border-red-700/50',
  yellow: 'bg-yellow-600/20 text-yellow-400 border-yellow-700/50',
  gray: 'bg-gray-700/20 text-gray-400 border-gray-700/50',
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: keyof typeof colors;
  loading?: boolean;
}

export default function StatCard({ label, value, sub, icon, color = 'blue', loading }: StatCardProps) {
  return (
    <div className={clsx('rounded-xl border p-4', colors[color])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-700 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
          )}
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  );
}
