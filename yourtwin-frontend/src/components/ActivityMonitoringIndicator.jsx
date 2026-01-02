import { Eye, EyeOff, AlertTriangle, ArrowLeftRight, Clipboard } from 'lucide-react';

function ActivityMonitoringIndicator({
  isMonitoring = false,
  stats = {},
  showDetails = false,
  variant = 'compact' // 'compact' | 'full'
}) {
  const { tabSwitchCount = 0, pasteCount = 0, timeAwayPercentage = 0 } = stats;

  if (!isMonitoring) {
    return null;
  }

  // Compact variant - just shows the eye icon and basic info
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f9e2af]/10 border border-[#f9e2af]/30 rounded-lg">
        <Eye className="w-4 h-4 text-[#f9e2af]" />
        <span className="text-xs text-[#f9e2af] font-medium">Monitored</span>
        {showDetails && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#f9e2af]/30">
            <span className="text-xs text-[#a6adc8]" title="Tab switches">
              <ArrowLeftRight className="w-3 h-3 inline mr-1" />
              {tabSwitchCount}
            </span>
            {pasteCount > 0 && (
              <span className="text-xs text-[#a6adc8]" title="Paste events">
                <Clipboard className="w-3 h-3 inline mr-1" />
                {pasteCount}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full variant - shows detailed stats panel
  return (
    <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-5 h-5 text-[#f9e2af]" />
        <h3 className="text-sm font-semibold text-[#cdd6f4]">Activity Monitoring</h3>
        <span className="text-xs px-2 py-0.5 bg-[#f9e2af]/20 text-[#f9e2af] rounded-full">Active</span>
      </div>

      <p className="text-xs text-[#a6adc8] mb-4">
        Your activity is being monitored for academic integrity.
        This includes tab switches, paste events, and time spent.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1e1e2e] rounded-lg p-3 text-center">
          <ArrowLeftRight className="w-4 h-4 text-[#89b4fa] mx-auto mb-1" />
          <div className="text-lg font-bold text-[#cdd6f4]">{tabSwitchCount}</div>
          <div className="text-xs text-[#6c7086]">Tab Switches</div>
        </div>

        <div className="bg-[#1e1e2e] rounded-lg p-3 text-center">
          <Clipboard className="w-4 h-4 text-[#cba6f7] mx-auto mb-1" />
          <div className="text-lg font-bold text-[#cdd6f4]">{pasteCount}</div>
          <div className="text-xs text-[#6c7086]">Pastes</div>
        </div>

        <div className="bg-[#1e1e2e] rounded-lg p-3 text-center">
          <EyeOff className="w-4 h-4 text-[#f38ba8] mx-auto mb-1" />
          <div className="text-lg font-bold text-[#cdd6f4]">{timeAwayPercentage}%</div>
          <div className="text-xs text-[#6c7086]">Time Away</div>
        </div>
      </div>

      {(tabSwitchCount > 10 || pasteCount > 5) && (
        <div className="mt-3 flex items-start gap-2 p-2 bg-[#f38ba8]/10 border border-[#f38ba8]/30 rounded">
          <AlertTriangle className="w-4 h-4 text-[#f38ba8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#f38ba8]">
            High activity detected. This may be flagged for review by your instructor.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActivityMonitoringIndicator;
