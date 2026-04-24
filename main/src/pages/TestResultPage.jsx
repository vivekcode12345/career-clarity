import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPredictions } from "../services/testService";

/**
 * ResultPage Component
 * Displays test results with score, level, and next recommendations
 */
const ResultPage = ({ result, testType = "quick" }) => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testType === "skill") {
      fetchPredictions();
    } else {
      setLoading(false);
    }
  }, [testType]);

  const fetchPredictions = async () => {
    try {
      const data = await getPredictions();
      setPredictions(data);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "advanced":
        return "from-emerald-500 to-teal-500";
      case "intermediate":
        return "from-blue-500 to-indigo-500";
      case "beginner":
        return "from-amber-500 to-orange-500";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  const getLevelEmoji = (level) => {
    switch (level?.toLowerCase()) {
      case "advanced":
        return "🚀";
      case "intermediate":
        return "📈";
      case "beginner":
        return "🌱";
      default:
        return "✨";
    }
  };

  const scorePercentage = result?.total ? (result?.score / result?.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Animation */}
        <div className="text-center mb-8 cc-fade-in">
          <div className="inline-block text-6xl mb-4 animate-bounce">✅</div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {testType === "skill" ? "Skill Test Completed!" : "Quick Test Completed!"}
          </h1>
          <p className="text-slate-600">Here's how you performed</p>
        </div>

        {/* Score Card */}
        <div
          className={`bg-gradient-to-r ${getLevelColor(
            result?.level
          )} rounded-2xl shadow-xl p-8 text-white mb-8 cc-fade-in`}
        >
          <div className="grid grid-cols-3 gap-6 text-center">
            {/* Score */}
            <div>
              <div className="text-5xl font-bold mb-2">{result?.score}</div>
              <div className="text-sm opacity-90">Questions Correct</div>
            </div>

            {/* Total */}
            <div>
              <div className="text-5xl font-bold mb-2">{result?.total}</div>
              <div className="text-sm opacity-90">Total Questions</div>
            </div>

            {/* Percentage */}
            <div>
              <div className="text-5xl font-bold mb-2">{scorePercentage.toFixed(0)}%</div>
              <div className="text-sm opacity-90">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Level Badge */}
        {result?.level && (
          <div className="text-center mb-8 cc-fade-in">
            <div className="inline-block">
              <div className="text-6xl mb-3">{getLevelEmoji(result.level)}</div>
              <div className="text-3xl font-bold text-slate-900 capitalize">
                {result.level} Level
              </div>
              <div className="text-slate-600 mt-2">
                {result.level === "advanced"
                  ? "Excellent performance! You have mastered this skill."
                  : result.level === "intermediate"
                  ? "Good work! You have solid knowledge in this area."
                  : "Great start! Keep practicing to improve your skills."}
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {result?.message && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-8 cc-fade-in">
            <p className="text-blue-800">{result.message}</p>
          </div>
        )}

        {/* Predictions (Skill Test Only) */}
        {testType === "skill" && predictions && !loading && (
          <div className="space-y-6 mb-8">
            {/* Ability */}
            {predictions.ability && (
              <div className="bg-white rounded-lg shadow p-6 cc-fade-in border-l-4 border-purple-500">
                <div className="flex items-start space-x-4">
                  <span className="text-3xl">💪</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Your Ability</h3>
                    <p className="text-slate-700">{predictions.ability}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {predictions.top_careers && predictions.top_careers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 cc-fade-in border-l-4 border-emerald-500">
                <h3 className="font-bold text-lg text-slate-900 mb-4">🎯 Recommended Careers</h3>
                <div className="space-y-3">
                  {predictions.top_careers.slice(0, 3).map((career, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{career.title}</div>
                        <div className="text-sm text-slate-600">{career.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4 mt-8 cc-fade-in">
          {testType === "skill" ? (
            <>
              <button
                onClick={() => navigate("/recommendations")}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                💼 View Career Recommendations
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 font-bold py-3 rounded-lg hover:bg-slate-50 transition-all"
              >
                ← Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/recommendations")}
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                💼 Show Recommendations
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 font-bold py-3 rounded-lg hover:bg-slate-50 transition-all"
              >
                ← Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
