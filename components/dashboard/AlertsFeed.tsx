'use client';

import type { Alert } from '@/lib/types';

interface AlertsFeedProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
}

export function AlertsFeed({ alerts, onAlertClick }: AlertsFeedProps) {
  const getSeverityStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'red':
        return 'bg-red-900/50 border-red-700 hover:bg-red-900/70';
      case 'yellow':
        return 'bg-yellow-900/50 border-yellow-700 hover:bg-yellow-900/70';
      case 'green':
        return 'bg-green-900/50 border-green-700 hover:bg-green-900/70';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'red':
        return '🔴';
      case 'yellow':
        return '🟡';
      case 'green':
        return '🟢';
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-200 mb-3">Alerts</h2>
      <div className="flex flex-wrap gap-3">
        {alerts.map((alert, index) => (
          <button
            key={index}
            onClick={() => alert.filterKey && onAlertClick(alert)}
            disabled={!alert.filterKey}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${getSeverityStyles(
              alert.severity
            )} ${alert.filterKey ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span>{getSeverityIcon(alert.severity)}</span>
            <span className="text-sm text-gray-100">{alert.message}</span>
            {alert.filterKey && (
              <span className="text-xs text-gray-400 ml-1">→</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
