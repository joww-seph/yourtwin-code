import { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  Brain,
  AlertTriangle,
  Maximize,
  Copy,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';

const ALERT_SESSION_KEY = 'yourtwin_system_alert_shown_this_session';

function SystemAlertModal({ onClose, onRequestFullscreen }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Shield,
      title: 'Academic Integrity Monitoring',
      color: 'text-[#f38ba8]',
      bgColor: 'bg-[#f38ba8]/10',
      content: [
        'Your coding activities are monitored to ensure academic integrity',
        'Tab switches and window changes are tracked and logged',
        'Time spent away from the activity is recorded',
        'All submissions are validated for authenticity'
      ]
    },
    {
      icon: Copy,
      title: 'Paste Detection System',
      color: 'text-[#fab387]',
      bgColor: 'bg-[#fab387]/10',
      content: [
        'External paste operations (from outside the editor) are detected',
        'Large paste operations are flagged for review',
        'In lockdown mode, external pastes are blocked entirely',
        'Paste patterns help identify potential code copying'
      ]
    },
    {
      icon: Brain,
      title: 'AI-Powered Code Validation',
      color: 'text-[#cba6f7]',
      bgColor: 'bg-[#cba6f7]/10',
      content: [
        'Final submissions are analyzed by AI for workarounds',
        'Hardcoded outputs and shortcuts are detected',
        'Your code logic is verified against requirements',
        'Suspicious patterns are flagged for instructor review'
      ]
    },
    {
      icon: Eye,
      title: 'Instructor Visibility',
      color: 'text-[#89b4fa]',
      bgColor: 'bg-[#89b4fa]/10',
      content: [
        'Instructors can view your activity in real-time',
        'Tab switch counts and away time are visible',
        'Flagged behaviors are highlighted for review',
        'Your submission integrity score is calculated'
      ]
    },
    {
      icon: Maximize,
      title: 'Fullscreen Recommendation',
      color: 'text-[#a6e3a1]',
      bgColor: 'bg-[#a6e3a1]/10',
      content: [
        'We recommend using fullscreen mode during activities',
        'This helps prevent accidental tab or window switches',
        'Fullscreen mode provides a distraction-free environment',
        'You can toggle fullscreen anytime using the button above settings'
      ]
    }
  ];

  const handleAcknowledge = () => {
    // Use sessionStorage so modal shows again on next login (session)
    sessionStorage.setItem(ALERT_SESSION_KEY, 'true');
    onClose();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#181825] rounded-xl border border-[#313244] w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e1e2e] px-6 py-4 border-b border-[#313244]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f38ba8]/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-[#f38ba8]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#cdd6f4]">System Capabilities Notice</h2>
              <p className="text-xs text-[#6c7086]">Please read before proceeding</p>
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-3 bg-[#1e1e2e]/50">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-[#89b4fa] w-6'
                  : index < currentStep
                  ? 'bg-[#a6e3a1]'
                  : 'bg-[#313244]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`${currentStepData.bgColor} rounded-xl p-6 mb-4`}>
            <div className="flex items-center gap-3 mb-4">
              <Icon className={`w-8 h-8 ${currentStepData.color}`} />
              <h3 className={`text-lg font-semibold ${currentStepData.color}`}>
                {currentStepData.title}
              </h3>
            </div>
            <ul className="space-y-3">
              {currentStepData.content.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className={`w-4 h-4 ${currentStepData.color} flex-shrink-0 mt-0.5`} />
                  <span className="text-sm text-[#cdd6f4]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step indicator */}
          <p className="text-center text-xs text-[#6c7086] mb-4">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-2.5 rounded-lg border border-[#313244] text-[#cdd6f4] text-sm font-medium hover:bg-[#313244] transition"
            >
              Previous
            </button>
          )}
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 py-2.5 rounded-lg bg-[#89b4fa] text-[#1e1e2e] text-sm font-medium hover:bg-[#7ba3e8] transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleAcknowledge}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] text-sm font-medium hover:opacity-90 transition"
            >
              I Understand, Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to check if alert should be shown
// Shows once per session (login) - modal reappears on each new login
export function useSystemAlert() {
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    const shownThisSession = sessionStorage.getItem(ALERT_SESSION_KEY);
    if (!shownThisSession) {
      setShowAlert(true);
    }
  }, []);

  const closeAlert = () => setShowAlert(false);
  const resetAlert = () => {
    sessionStorage.removeItem(ALERT_SESSION_KEY);
    setShowAlert(true);
  };

  return { showAlert, closeAlert, resetAlert };
}

export default SystemAlertModal;
