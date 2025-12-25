import { useSocket } from '../contexts/SocketContext';
import { Users, Circle } from 'lucide-react';

function OnlineCounter({ showDetails = false }) {
  const { onlineCount, isConnected } = useSocket();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-[#6c7086]">
        <Circle size={8} className="fill-current" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#313244] rounded-lg border border-[#45475a] p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#a6e3a1]/20 rounded-full flex items-center justify-center">
          <Users className="text-[#a6e3a1]" size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Circle size={8} className="fill-[#a6e3a1] text-[#a6e3a1]" />
            <span className="text-2xl font-bold text-[#cdd6f4]">
              {onlineCount.studentsOnline}
            </span>
            <span className="text-sm text-[#bac2de]">
              {onlineCount.studentsOnline === 1 ? 'Student' : 'Students'} Online
            </span>
          </div>
          {onlineCount.instructorsOnline > 0 && (
            <p className="text-xs text-[#6c7086] mt-1">
              {onlineCount.instructorsOnline} instructor{onlineCount.instructorsOnline !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
      </div>

      {showDetails && onlineCount.students && onlineCount.students.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#45475a]">
          <p className="text-xs font-medium text-[#6c7086] mb-2">Currently Online:</p>
          <div className="flex flex-wrap gap-2">
            {onlineCount.students.slice(0, 10).map((student, index) => (
              <span
                key={student.userId || index}
                className="px-2 py-1 bg-[#1e1e2e] rounded text-xs text-[#bac2de]"
              >
                {student.userName || 'Unknown'}
              </span>
            ))}
            {onlineCount.students.length > 10 && (
              <span className="px-2 py-1 text-xs text-[#6c7086]">
                +{onlineCount.students.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OnlineCounter;
