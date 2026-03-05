import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface Alert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: string;
}

const severityConfig = {
  high: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/50' },
  medium: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/50' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/50' },
};

export default function AlertsFeed({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">
        AI Alerts
        {alerts.length > 0 && (
          <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-800 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-6 text-gray-600 text-sm">
          ✅ All clear — no alerts right now
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className={clsx('rounded-lg border p-3', cfg.bg)}>
                <div className="flex gap-2">
                  <Icon className={clsx('h-4 w-4 flex-shrink-0 mt-0.5', cfg.color)} />
                  <div>
                    <p className="text-xs font-semibold text-white">{alert.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>
                    {alert.action && (
                      <p className="text-xs text-blue-400 mt-1">→ {alert.action}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
