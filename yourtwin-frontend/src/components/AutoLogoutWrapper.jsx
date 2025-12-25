import { useState, useCallback } from 'react';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { useAuth } from '../contexts/AuthContext';
import { Clock, X } from 'lucide-react';

function AutoLogoutWrapper({ children }) {
  const { isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const handleWarning = useCallback((seconds) => {
    setSecondsLeft(seconds);
    setShowWarning(true);

    // Countdown timer
    const countdown = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const { resetTimer } = useAutoLogout(handleWarning);

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    resetTimer();
  };

  if (!isAuthenticated) return children;

  return (
    <>
      {children}

      {/* Inactivity Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313244] rounded-lg shadow-2xl p-6 max-w-sm w-full border border-[#45475a]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#f9e2af]">
                <Clock size={24} />
                <h3 className="text-lg font-semibold">Session Timeout</h3>
              </div>
              <button
                onClick={handleStayLoggedIn}
                className="text-[#6c7086] hover:text-[#cdd6f4]"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-[#bac2de] mb-4">
              You will be logged out in <span className="text-[#f38ba8] font-bold">{secondsLeft}</span> seconds due to inactivity.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 bg-[#89b4fa] text-[#1e1e2e] py-2 rounded-lg font-medium hover:opacity-90 transition"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AutoLogoutWrapper;
