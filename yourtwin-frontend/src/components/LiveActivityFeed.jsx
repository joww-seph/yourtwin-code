import { useSocket } from '../contexts/SocketContext';
import {
  Activity,
  CheckCircle,
  XCircle,
  Lightbulb,
  UserPlus,
  Clock,
  X
} from 'lucide-react';

function LiveActivityFeed({ maxItems = 10 }) {
  const { recentActivity, clearRecentActivity, isConnected } = useSocket();

  // Format relative time
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return then.toLocaleDateString();
  };

  // Get icon and color based on activity type
  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'submission':
        return activity.status === 'passed' ? (
          <CheckCircle className="w-4 h-4 text-[#a6e3a1]" />
        ) : (
          <XCircle className="w-4 h-4 text-[#f38ba8]" />
        );
      case 'hint':
        return <Lightbulb className="w-4 h-4 text-[#f9e2af]" />;
      case 'join':
        return <UserPlus className="w-4 h-4 text-[#89b4fa]" />;
      default:
        return <Activity className="w-4 h-4 text-[#bac2de]" />;
    }
  };

  // Get activity description
  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case 'submission':
        return (
          <span>
            <span className="font-medium text-[#cdd6f4]">{activity.studentName}</span>
            {' submitted '}
            <span className="text-[#89b4fa]">{activity.activityTitle}</span>
            {' — '}
            <span className={activity.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'}>
              {activity.score}% ({activity.passedTests}/{activity.totalTests} tests)
            </span>
          </span>
        );
      case 'hint':
        return (
          <span>
            <span className="font-medium text-[#cdd6f4]">{activity.studentName}</span>
            {' requested Level '}
            <span className="text-[#f9e2af]">{activity.hintLevel}</span>
            {' hint for '}
            <span className="text-[#89b4fa]">{activity.activityTitle}</span>
          </span>
        );
      case 'join':
        return (
          <span>
            <span className="font-medium text-[#cdd6f4]">{activity.studentName}</span>
            {' joined '}
            <span className="text-[#89b4fa]">{activity.sessionTitle}</span>
          </span>
        );
      default:
        return <span className="text-[#bac2de]">Unknown activity</span>;
    }
  };

  const displayedActivities = recentActivity.slice(0, maxItems);

  return (
    <div className="bg-[#313244] border border-[#45475a] rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-[#45475a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#a6e3a1]" />
          <h3 className="font-bold text-[#cdd6f4]">Live Activity Feed</h3>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-[#a6e3a1]">
              <span className="w-2 h-2 bg-[#a6e3a1] rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        {recentActivity.length > 0 && (
          <button
            onClick={clearRecentActivity}
            className="p-1 hover:bg-[#45475a] rounded transition"
            title="Clear feed"
          >
            <X className="w-4 h-4 text-[#6c7086]" />
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {displayedActivities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-8 h-8 text-[#45475a] mx-auto mb-2" />
            <p className="text-sm text-[#6c7086]">
              {isConnected
                ? 'Waiting for student activity...'
                : 'Connecting to live feed...'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#45475a]">
            {displayedActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-3 hover:bg-[#1e1e2e] transition flex items-start gap-3"
              >
                <div className="mt-0.5">{getActivityIcon(activity)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#bac2de] leading-relaxed">
                    {getActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-[#6c7086] mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {recentActivity.length > maxItems && (
        <div className="p-2 border-t border-[#45475a] text-center">
          <p className="text-xs text-[#6c7086]">
            Showing {maxItems} of {recentActivity.length} activities
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveActivityFeed;
