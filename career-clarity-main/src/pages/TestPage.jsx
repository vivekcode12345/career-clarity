import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import TestResultPage from "./TestResultPage";
import SkillsSelectionPage from "./SkillsSelectionPage";
import SystemCheckPage from "./SystemCheckPage";
import { getQuickTest, submitQuickTest, getSkillTest, submitSkillTest, getSkillCooldownStatus, getSkillOptions } from "../services/testService";

const WARNING_DURATION_MS = 2500;
const QUICK_TEST_DURATION_SECONDS = 10 * 60;
const SKILL_TEST_DURATION_SECONDS = 20 * 60;

const TestPage = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedSkill, setSelectedSkill] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [cooldownInfo, setCooldownInfo] = useState({
    cooldown: false,
    cooldown_by_skill: {},
    message: "",
  });

  const timerRef = useRef(null);
  const warningRef = useRef(null);

  const isSkillTestPage = page === "skillTest";

  useEffect(() => {
    checkTestStatus();
    return () => {
      stopTimer();
      clearWarningTimer();
      exitFullscreen();
    };
  }, []);

  useEffect(() => {
    if (!isSkillTestPage) return undefined;

    const triggerWarning = () => {
      setShowSecurityWarning(true);
      clearWarningTimer();
      warningRef.current = setTimeout(() => setShowSecurityWarning(false), WARNING_DURATION_MS);
    };

    const onCopy = (event) => {
      event.preventDefault();
      triggerWarning();
    };

    const onPaste = (event) => {
      event.preventDefault();
      triggerWarning();
    };

    const onCut = (event) => {
      event.preventDefault();
      triggerWarning();
    };

    const onContextMenu = (event) => {
      event.preventDefault();
      triggerWarning();
    };

    const onVisibility = () => {
      if (document.hidden) {
        triggerWarning();
      }
    };

    const onBlur = () => {
      triggerWarning();
    };

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const blockedCombo =
        (event.ctrlKey && ["c", "v", "x", "a", "p", "s", "u"].includes(key)) ||
        (event.metaKey && ["c", "v", "x", "a", "p", "s", "u"].includes(key)) ||
        (event.altKey && key === "tab");

      if (blockedCombo) {
        event.preventDefault();
        triggerWarning();
      }
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSkillTestPage]);

  const clearWarningTimer = () => {
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (seconds) => {
    stopTimer();
    setTimeRemaining(seconds);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          stopTimer();
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const checkTestStatus = async () => {
    try {
      setLoading(true);
      const quickTestData = await getQuickTest();

      if (quickTestData?.attempted) {
        await loadCooldownStatus();
        await loadSkillOptions();
        setPage("skillsSelection");
        return;
      }

      setQuestions(quickTestData?.questions || []);
      setCurrentQuestion(0);
      setAnswers({});
      setPage("quickTest");
      startTimer(QUICK_TEST_DURATION_SECONDS);
    } catch (err) {
      setError("Failed to load test.");
      setPage("error");
    } finally {
      setLoading(false);
    }
  };

  const loadCooldownStatus = async () => {
    try {
      const cooldownData = await getSkillCooldownStatus();
      setCooldownInfo({
        cooldown: Boolean(cooldownData?.cooldown),
        cooldown_by_skill: cooldownData?.cooldown_by_skill || {},
        message: cooldownData?.message || "",
      });
    } catch {
      setCooldownInfo({
        cooldown: false,
        cooldown_by_skill: {},
        message: "",
      });
    }
  };

  const loadSkillOptions = async () => {
    try {
      const options = await getSkillOptions();
      const skills = Array.isArray(options?.skills) ? options.skills : [];
      setAvailableSkills(skills);
    } catch {
      setAvailableSkills([]);
    }
  };

  const enterFullscreen = async () => {
    const element = document.documentElement;
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
      setIsFullscreen(true);
      return true;
    } catch (err) {
      setIsFullscreen(false);
      setError("Could not enter fullscreen mode. Please allow fullscreen and try again.");
      return false;
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msFullscreenElement && document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch {
    } finally {
      setIsFullscreen(false);
    }
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill);
    setPage("systemCheck");
  };

  const handleSystemCheckComplete = async () => {
    try {
      setLoading(true);
      setError("");

      const entered = await enterFullscreen();
      if (!entered) {
        setPage("systemCheck");
        return;
      }

      const skillTestData = await getSkillTest(selectedSkill);
      if (!skillTestData?.questions?.length) {
        setError(skillTestData?.message || "No questions available for this skill.");
        setPage("error");
        return;
      }

      setQuestions(skillTestData.questions);
      setCurrentQuestion(0);
      setAnswers({});
      setPage("skillTest");
      startTimer(SKILL_TEST_DURATION_SECONDS);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load skill test questions.";
      setError(message);
      setPage("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (option) => {
    const questionId = questions[currentQuestion]?.id;
    if (!questionId) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmitTest = async () => {
    try {
      setLoading(true);

      if (page === "quickTest") {
        await submitQuickTest(answers);
        stopTimer();
        setQuestions([]);
        setAnswers({});
        setCurrentQuestion(0);
        await loadCooldownStatus();
        await loadSkillOptions();
        setPage("skillsSelection");
        return;
      }

      if (page === "skillTest") {
        const submitResponse = await submitSkillTest(answers, selectedSkill);
        stopTimer();
        await exitFullscreen();
        setResult(submitResponse);
        setPage("result");
      }
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to submit test.";
      setError(message);
      setPage("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitTest();
  };

  const SecurityWarning = () => (
    <div className="fixed top-4 right-4 z-50 rounded-lg bg-red-600 px-5 py-3 text-white shadow-xl">
      <p className="font-semibold">Security Warning</p>
      <p className="text-sm">Restricted action detected. Stay on the test page.</p>
    </div>
  );

  if (loading && page === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-700">Loading test...</p>
      </div>
    );
  }

  if (page === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900">Error</h2>
          <p className="mt-2 text-slate-600">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (page === "result") {
    return <TestResultPage result={result} testType="skill" />;
  }

  if (page === "skillsSelection") {
    return <SkillsSelectionPage onSkillSelect={handleSkillSelect} cooldownInfo={cooldownInfo} availableSkills={availableSkills} />;
  }

  if (page === "systemCheck") {
    return (
      <SystemCheckPage
        skillName={selectedSkill}
        onCheckComplete={handleSystemCheckComplete}
        onCancel={() => setPage("skillsSelection")}
      />
    );
  }

  if (page === "quickTest" && questions.length > 0) {
    const question = questions[currentQuestion];
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-2xl bg-white/90 border border-white shadow-xl p-6 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">📝 Quick Test</h1>
                <p className="text-slate-600 mt-1">Answer all questions to unlock skill tests • 10 minutes</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Time remaining</p>
                <p className="text-2xl font-semibold text-indigo-700">{formatTime(timeRemaining)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {questions.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`h-8 w-8 rounded-md text-xs font-semibold transition ${
                    index === currentQuestion
                      ? "bg-indigo-600 text-white"
                      : answers[item.id]
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 md:p-8 shadow-xl border border-slate-100">
            <QuestionCard
              question={question}
              questionNumber={currentQuestion + 1}
              totalQuestions={questions.length}
              selectedAnswer={answers[question.id]}
              onSelectAnswer={handleSelectAnswer}
              theme="light"
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setCurrentQuestion((value) => Math.max(value - 1, 0))}
              disabled={currentQuestion === 0}
              className="flex-1 rounded-lg border border-slate-300 bg-white py-3 font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmitTest}
                disabled={loading}
                className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white"
              >
                  Submit Quick Test
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion((value) => Math.min(value + 1, questions.length - 1))}
                className="flex-1 rounded-lg bg-indigo-600 py-3 font-semibold text-white"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (page === "skillTest" && questions.length > 0) {
    const question = questions[currentQuestion];
    return (
      <div className={`min-h-screen px-4 py-8 ${isFullscreen ? "bg-slate-900" : "bg-slate-100"}`}>
        {showSecurityWarning && <SecurityWarning />}

        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-2xl border border-blue-500/40 bg-slate-800/90 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-white">
              <div>
                <h1 className="text-3xl font-bold">🎯 Skill Test - {selectedSkill?.toUpperCase()}</h1>
                <p className="text-blue-100 mt-1">Security mode enabled • 15 questions</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-blue-200">Time remaining</p>
                <p className={`text-2xl font-semibold ${timeRemaining <= 300 ? "text-rose-300" : "text-white"}`}>{formatTime(timeRemaining)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {questions.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`h-8 w-8 rounded-md text-xs font-semibold transition ${
                    index === currentQuestion
                      ? "bg-indigo-500 text-white"
                      : answers[item.id]
                        ? "bg-emerald-300 text-emerald-950"
                        : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-400 bg-slate-900 p-6 md:p-8 shadow-2xl">
            <QuestionCard
              question={question}
              questionNumber={currentQuestion + 1}
              totalQuestions={questions.length}
              selectedAnswer={answers[question.id]}
              onSelectAnswer={handleSelectAnswer}
              theme="dark"
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setCurrentQuestion((value) => Math.max(value - 1, 0))}
              disabled={currentQuestion === 0}
              className="flex-1 rounded-lg bg-slate-700 py-3 font-semibold text-white disabled:opacity-50"
            >
              Previous
            </button>
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmitTest}
                disabled={loading}
                className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white"
              >
                Submit Skill Test
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion((value) => Math.min(value + 1, questions.length - 1))}
                className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TestPage;
