import { Lightbulb, Lock, ChevronUp, Sparkles } from 'lucide-react';
import { useShadowTwin } from '../contexts/ShadowTwinContext';

function ShadowTwinButton() {
  const {
    isLockdown,
    hintsUsed,
    maxHints,
    isPanelOpen,
    togglePanel,
    currentHint
  } = useShadowTwin();

  // Don't show button when panel is open
  if (isPanelOpen) return null;

  // Lockdown mode
  if (isLockdown) {
    return (
      <div className="fixed bottom-0 left-0 z-40">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#45475a] text-[#6c7086] rounded-tr-xl">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">AI Locked</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 z-40">
      <button
        onClick={togglePanel}
        className="group flex items-center gap-3 pl-4 pr-5 py-3 bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] hover:from-[#d4b4fa] hover:to-[#9fc4ff] text-[#1e1e2e] font-medium rounded-tr-xl shadow-lg transition-all relative"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-semibold">Shadow Twin</span>

        {/* Hints counter */}
        <span className="text-xs bg-[#1e1e2e]/20 px-2 py-0.5 rounded-full">
          {maxHints - hintsUsed} left
        </span>

        <ChevronUp className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:-translate-y-0.5 transition" />

        {/* Active hint indicator */}
        {currentHint && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#a6e3a1] rounded-full flex items-center justify-center shadow">
            <Lightbulb className="w-2.5 h-2.5 text-[#1e1e2e]" />
          </span>
        )}
      </button>
    </div>
  );
}

export default ShadowTwinButton;
