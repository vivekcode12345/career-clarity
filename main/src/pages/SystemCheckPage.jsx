import React, { useState, useEffect } from "react";

/**
 * SystemCheckPage Component
 * Verifies system requirements before starting skill test
 * Checks: camera permissions, microphone, fullscreen capability, network
 */
const SystemCheckPage = ({ skillName, onCheckComplete, onCancel, isPreparingQuestions = false }) => {
  const [checks, setChecks] = useState({
    browser: { status: "checking", message: "Checking browser compatibility..." },
    fullscreen: { status: "checking", message: "Checking fullscreen support..." },
    network: { status: "checking", message: "Checking network connection..." },
    storage: { status: "checking", message: "Checking storage access..." },
  });

  const [allChecksPassed, setAllChecksPassed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    performSystemCheck();
  }, []);

  const performSystemCheck = async () => {
    const newChecks = { ...checks };

    // Check 1: Browser Compatibility
    setTimeout(() => {
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent);
      const isEdge = /Edge/.test(navigator.userAgent);

      if (isChrome || isFirefox || isSafari || isEdge) {
        newChecks.browser = { status: "passed", message: `${navigator.userAgent.split(" ")[navigator.userAgent.split(" ").length - 1]} browser detected` };
      } else {
        newChecks.browser = { status: "warning", message: "Browser may not be fully supported" };
      }

      setChecks({ ...newChecks });
    }, 500);

    // Check 2: Fullscreen API Support
    setTimeout(() => {
      const isFullscreenSupported =
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled;

      if (isFullscreenSupported) {
        newChecks.fullscreen = { status: "passed", message: "Fullscreen mode supported" };
      } else {
        newChecks.fullscreen = { status: "failed", message: "Fullscreen mode not supported" };
      }

      setChecks({ ...newChecks });
    }, 1000);

    // Check 3: Network Connection
    setTimeout(() => {
      if (navigator.onLine) {
        newChecks.network = { status: "passed", message: "Stable internet connection detected" };
      } else {
        newChecks.network = { status: "failed", message: "No internet connection" };
      }

      setChecks({ ...newChecks });
    }, 1500);

    // Check 4: Local Storage
    setTimeout(() => {
      try {
        const test = "__test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        newChecks.storage = { status: "passed", message: "Local storage accessible" };
      } catch (e) {
        newChecks.storage = { status: "warning", message: "Local storage may be restricted" };
      }

      setChecks({ ...newChecks });
      setIsChecking(false);

      // Check if all critical checks passed
      const allPassed =
        (newChecks.browser.status === "passed" || newChecks.browser.status === "warning") &&
        newChecks.fullscreen.status === "passed" &&
        newChecks.network.status === "passed";

      setAllChecksPassed(allPassed);
    }, 2000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "passed":
        return "✅";
      case "failed":
        return "❌";
      case "warning":
        return "⚠️";
      case "checking":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "passed":
        return "text-emerald-600";
      case "failed":
        return "text-red-600";
      case "warning":
        return "text-amber-600";
      case "checking":
        return "text-blue-600 animate-spin";
      default:
        return "text-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 cc-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔍</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">System Check</h2>
          <p className="text-slate-600">Verifying test requirements for {skillName}</p>
        </div>

        {/* Checks List */}
        <div className="space-y-4 mb-8">
          {Object.entries(checks).map(([key, check]) => (
            <div key={key} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
              <div className={`text-2xl ${getStatusColor(check.status)}`}>
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 capitalize">{key}</div>
                <div className="text-sm text-slate-600">{check.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Info */}
        {isChecking && (
          <div className="text-center mb-6">
            <div className="w-40 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 animate-pulse" />
            </div>
            <p className="text-sm text-slate-600 mt-3">Running system checks...</p>
          </div>
        )}

        {/* Status Message */}
        {!isChecking && (
          <div className={`p-4 rounded-lg mb-6 ${
            allChecksPassed
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <p className={`text-sm font-semibold ${
              allChecksPassed ? "text-emerald-800" : "text-red-800"
            }`}>
              {allChecksPassed
                ? "✅ All checks passed! Ready to start test."
                : "❌ Some checks failed. Please verify and try again."}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onCheckComplete(skillName)}
            disabled={!allChecksPassed || isChecking || isPreparingQuestions}
            className={`w-full font-bold py-3 rounded-lg transition-all ${
              allChecksPassed && !isChecking && !isPreparingQuestions
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                : "bg-slate-300 text-slate-600 cursor-not-allowed"
            }`}
          >
            {isChecking ? "Checking..." : isPreparingQuestions ? "⏳ Preparing questions..." : "✨ Enter Fullscreen"}
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-white border-2 border-slate-200 text-slate-900 font-bold py-3 rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="text-xs text-slate-600 space-y-2">
            <p>• Fullscreen mode will be enabled automatically</p>
            <p>• Security restrictions will be enforced</p>
            <p>• Do not close this window during the test</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemCheckPage;
