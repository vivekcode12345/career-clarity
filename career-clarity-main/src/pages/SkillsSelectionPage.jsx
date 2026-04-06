import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SkillsSelectionPage Component
 * Displays available skills after quick test completion
 * User can select a skill to take the skill test for that specific skill
 */
const SkillsSelectionPage = ({ onSkillSelect, onCombinedTestSelect, cooldownInfo, availableSkills = [] }) => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [multiSkillMode, setMultiSkillMode] = useState(false);
  const [startMode, setStartMode] = useState("single");
  const [showWarning, setShowWarning] = useState(false);
  const [hoveredSkillId, setHoveredSkillId] = useState(null);

  // Skill catalog metadata
  const skillCatalog = [
    {
      id: 1,
      key: "python",
      name: "Python",
      icon: "🐍",
      description: "Test your Python programming skills",
      difficulty: "Intermediate"
    },
    {
      id: 2,
      key: "javascript",
      name: "JavaScript",
      icon: "📜",
      description: "Test your JavaScript proficiency",
      difficulty: "Intermediate"
    },
    {
      id: 3,
      key: "react",
      name: "React",
      icon: "⚛️",
      description: "Test your React development skills",
      difficulty: "Advanced"
    },
    {
      id: 4,
      key: "data analysis",
      name: "Data Analysis",
      icon: "📊",
      description: "Test your data analysis abilities",
      difficulty: "Intermediate"
    },
    {
      id: 5,
      key: "sql",
      name: "SQL",
      icon: "🗄️",
      description: "Test your database management skills",
      difficulty: "Beginner"
    },
    {
      id: 6,
      key: "cloud computing",
      name: "Cloud Computing",
      icon: "☁️",
      description: "Test your cloud infrastructure knowledge",
      difficulty: "Advanced"
    }
  ];

  const normalizedSkills = Array.isArray(availableSkills)
    ? [...new Set(availableSkills.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))]
    : [];

  const mappedSkills = normalizedSkills.map((skillKey, idx) => {
    const match = skillCatalog.find((item) => item.key === skillKey);
    if (match) {
      return match;
    }

    const display = skillKey
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return {
      id: 1000 + idx,
      key: skillKey,
      name: display,
      icon: "🧠",
      description: `Test your ${display} proficiency`,
      difficulty: "Intermediate",
    };
  });

  const handleStartTest = (skill) => {
    if (multiSkillMode) {
      return;
    }

    const skillKey = skill.key || skill.name.toLowerCase();
    const skillCooldown = cooldownInfo?.cooldown_by_skill?.[skillKey];
    if (skillCooldown?.cooldown) {
      return;
    }
    setStartMode("single");
    setSelectedSkill(skillKey);
    setShowWarning(true);
  };

  const toggleSkillSelection = (skillKey) => {
    if (!multiSkillMode) return;

    const skillCooldown = cooldownInfo?.cooldown_by_skill?.[skillKey];
    if (skillCooldown?.cooldown) return;

    setSelectedSkills((prev) => {
      if (prev.includes(skillKey)) {
        return prev.filter((item) => item !== skillKey);
      }
      return [...prev, skillKey];
    });
  };

  const handleStartCombinedTest = () => {
    if (!multiSkillMode || selectedSkills.length < 2) {
      return;
    }
    setStartMode("combined");
    setShowWarning(true);
  };

  const handleConfirmStart = () => {
    if (startMode === "combined") {
      onCombinedTestSelect?.(selectedSkills);
    } else {
      onSkillSelect(selectedSkill);
    }
    setShowWarning(false);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-amber-100 text-amber-800";
      case "intermediate":
        return "bg-blue-100 text-blue-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatRemaining = (seconds) => {
    const total = Math.max(Number(seconds || 0), 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const lockedSkillsCount = Object.values(cooldownInfo?.cooldown_by_skill || {}).filter(
    (item) => item?.cooldown
  ).length;

  // Warning Modal
  const WarningModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-2xl cc-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Before You Start: {startMode === "combined" ? "Combined Skill Test" : selectedSkill?.toUpperCase()}
          </h2>
          <p className="text-slate-600">Test Guidelines</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start space-x-3">
            <span className="text-xl">🚫</span>
            <p className="text-slate-700">Do not switch tabs or minimize the window</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-xl">🚫</span>
            <p className="text-slate-700">Do not copy or paste content</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-xl">🚫</span>
            <p className="text-slate-700">Do not right-click during the test</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-xl">⏱️</span>
            <p className="text-slate-700">
              {startMode === "combined"
                ? "You have 20 minutes to complete 20 combined questions"
                : "You have 15 minutes to complete 15 questions"}
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-xl">🔒</span>
            <p className="text-slate-700">Fullscreen mode will be enabled automatically</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleConfirmStart}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            ✨ Start Test
          </button>
          <button
            onClick={() => setShowWarning(false)}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-3 rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      {showWarning && <WarningModal />}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 cc-fade-in">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            🎯 Skill Tests
          </h1>
          <div className="mb-4 flex items-center justify-center gap-2">
            <input
              id="multiSkillMode"
              type="checkbox"
              checked={multiSkillMode}
              onChange={(event) => {
                const enabled = event.target.checked;
                setMultiSkillMode(enabled);
                if (!enabled) {
                  setSelectedSkills([]);
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="multiSkillMode" className="text-sm font-semibold text-slate-700">
              Need multiple skills at a time
            </label>
          </div>
          {lockedSkillsCount > 0 ? (
            <div className="inline-block rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800 text-sm font-semibold">
              🔒 {lockedSkillsCount} skill test{lockedSkillsCount > 1 ? "s are" : " is"} on cooldown. Hover a locked skill to view remaining time.
            </div>
          ) : (
            <p className="text-slate-600 text-lg">
              Choose a skill to test your knowledge. Single skill test has 15 questions and 15 minutes.
            </p>
          )}
          {multiSkillMode && (
            <p className="mt-2 text-sm text-indigo-700 font-semibold">
              Select at least 2 skills to unlock Combined Test (20 questions • 20 minutes).
            </p>
          )}
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {mappedSkills.map((skill, idx) => {
            const skillKey = skill.key || skill.name.toLowerCase();
            const skillCooldown = cooldownInfo?.cooldown_by_skill?.[skillKey];
            const isLocked = Boolean(skillCooldown?.cooldown);

            return (
              <div
                key={skill.id}
                className={`relative bg-white rounded-xl shadow-lg transition-all duration-300 p-6 cc-fade-in ${
                  isLocked ? "opacity-80" : "hover:shadow-xl"
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
                onMouseEnter={() => setHoveredSkillId(skill.id)}
                onMouseLeave={() => setHoveredSkillId(null)}
              >
              {/* Skill Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{skill.icon}</div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getDifficultyColor(skill.difficulty)}`}>
                  {skill.difficulty}
                </span>
              </div>

              {/* Skill Info */}
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{skill.name}</h3>
              <p className="text-slate-600 mb-4 text-sm">{skill.description}</p>

              {multiSkillMode && (
                <label className="mb-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skillKey)}
                    disabled={isLocked}
                    onChange={() => toggleSkillSelection(skillKey)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Select for combined test
                </label>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-6 py-4 border-t border-b border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">15</div>
                  <div className="text-xs text-slate-600">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">20</div>
                  <div className="text-xs text-slate-600">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">✨</div>
                  <div className="text-xs text-slate-600">Points</div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => handleStartTest(skill)}
                disabled={isLocked || multiSkillMode}
                className={`w-full font-bold py-3 rounded-lg transition-all shadow-lg ${
                  isLocked || multiSkillMode
                    ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white hover:shadow-xl"
                }`}
                title={
                  isLocked
                    ? `Cooldown remaining time: ${formatRemaining(skillCooldown?.remaining_seconds)}`
                    : multiSkillMode
                    ? "Disable multiple-skill mode to start individual test"
                    : "Start Test"
                }
              >
                {isLocked ? "🔒 Locked" : multiSkillMode ? "Select via checkbox" : "Start Test →"}
              </button>

              {isLocked && hoveredSkillId === skill.id && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-xl z-20">
                  Cooldown remaining time: {formatRemaining(skillCooldown?.remaining_seconds)}
                </div>
              )}
              </div>
            );
          })}
        </div>

        {mappedSkills.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm mb-8">
            <p className="text-lg font-semibold text-slate-900 mb-2">No skills available yet</p>
            <p className="text-slate-600 mb-4">Upload your CV or add skills to profile to unlock skill tests.</p>
            <button
              onClick={() => navigate("/cv-upload")}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Upload CV
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 cc-fade-in">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white border-2 border-slate-200 text-slate-900 font-bold py-3 px-8 rounded-lg hover:bg-slate-50 transition-all"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => navigate("/recommendations")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg"
          >
            💼 Career Recommendations
          </button>
          <button
            onClick={handleStartCombinedTest}
            disabled={!multiSkillMode || selectedSkills.length < 2}
            className={`font-bold py-3 px-8 rounded-lg transition-all shadow-lg ${
              !multiSkillMode || selectedSkills.length < 2
                ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
            }`}
          >
            🧩 Take Combined Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillsSelectionPage;
