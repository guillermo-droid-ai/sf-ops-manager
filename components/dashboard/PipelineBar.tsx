'use client';

interface PipelineSegment {
  label: string;
  count: number;
  color: string;
}

interface PipelineBarProps {
  title: string;
  total: number;
  segments: PipelineSegment[];
  warningText?: string;
  onSegmentClick: (label: string) => void;
}

const COLORS: Record<string, string> = {
  // Lead statuses
  'New': 'bg-blue-500',
  'Working': 'bg-purple-500',
  'Follow Up': 'bg-indigo-500',
  'Qualified': 'bg-green-500',
  'Offer': 'bg-emerald-500',
  'Appointment': 'bg-teal-500',
  'Unqualified': 'bg-red-500',
  'Realtor Referral': 'bg-gray-500',
  
  // Opportunity stages
  'Podio Deals': 'bg-orange-500',
  'Closed Lost': 'bg-red-600',
  'Contract Signed': 'bg-green-600',
  'Pending Appointment': 'bg-yellow-500',
  'Negotiation': 'bg-blue-600',
  'Convert Lead': 'bg-purple-600',
  'Long Term Followup': 'bg-indigo-400',
  'Appointment Set': 'bg-teal-400',
  
  // Transaction paths - blocked ones in red
  'On Hold': 'bg-red-500',
  'Title Issues': 'bg-red-600',
  'Waiting on Funds': 'bg-red-500',
  'Cancellation Sent - Waiting to Sign': 'bg-red-700',
  'New Contract': 'bg-blue-500',
  'Memoed': 'bg-purple-500',
  'Need Dispo Decision': 'bg-yellow-500',
  'Marketing': 'bg-indigo-500',
  'Showings/Inspections': 'bg-cyan-500',
  'Buyers Found': 'bg-green-400',
  'Accepted Offer/Assigned': 'bg-green-500',
  'Documents sent to Title': 'bg-teal-500',
  'Title search completed': 'bg-teal-600',
  'Clear to Close': 'bg-emerald-500',
  'Closed/Memo': 'bg-emerald-600',
  'Closed/Won': 'bg-green-600',
  'Closed - Realtor Referral': 'bg-gray-500',
  'Cancelled Contract/Lost': 'bg-gray-600',
};

export function PipelineBar({ title, total, segments, warningText, onSegmentClick }: PipelineBarProps) {
  // Sort segments by count descending, filter out zero counts
  const visibleSegments = segments.filter(s => s.count > 0).sort((a, b) => b.count - a.count);
  
  if (total === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          <span className="text-sm text-gray-400">0 total</span>
        </div>
        <div className="h-8 bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-sm text-gray-500">No data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        <span className="text-sm text-gray-400">{total.toLocaleString()} total</span>
      </div>
      
      {/* Pipeline bar */}
      <div className="h-8 bg-gray-700 rounded-lg overflow-hidden flex">
        {visibleSegments.map((segment) => {
          const width = (segment.count / total) * 100;
          const bgColor = COLORS[segment.label] || 'bg-gray-500';
          
          return (
            <button
              key={segment.label}
              onClick={() => onSegmentClick(segment.label)}
              className={`h-full ${bgColor} hover:opacity-80 transition-opacity flex items-center justify-center relative group`}
              style={{ width: `${width}%`, minWidth: width > 3 ? '40px' : '20px' }}
              title={`${segment.label}: ${segment.count.toLocaleString()}`}
            >
              {width > 5 && (
                <span className="text-xs text-white font-medium truncate px-1">
                  {segment.count.toLocaleString()}
                </span>
              )}
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                {segment.label}: {segment.count.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {visibleSegments.slice(0, 6).map((segment) => {
          const bgColor = COLORS[segment.label] || 'bg-gray-500';
          return (
            <button
              key={segment.label}
              onClick={() => onSegmentClick(segment.label)}
              className="flex items-center gap-1 text-xs hover:opacity-80"
            >
              <span className={`w-2 h-2 rounded-full ${bgColor}`} />
              <span className="text-gray-300">{segment.label}</span>
              <span className="text-gray-500">({segment.count.toLocaleString()})</span>
            </button>
          );
        })}
        {visibleSegments.length > 6 && (
          <span className="text-xs text-gray-500">+{visibleSegments.length - 6} more</span>
        )}
      </div>

      {/* Warning text */}
      {warningText && (
        <p className="text-sm text-red-400 mt-2">{warningText}</p>
      )}
    </div>
  );
}
