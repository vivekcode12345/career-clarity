import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import TestResultPage from "./TestResultPage";
import SkillsSelectionPage from "./SkillsSelectionPage";
import SystemCheckPage from "./SystemCheckPage";
import {
  getQuickTest,
  submitQuickTest,
  getSkillTest,
  submitSkillTest,
  getCombinedSkillTest,
  submitCombinedSkillTest,
  getSkillCooldownStatus,
  getSkillOptions,
} from "../services/testService";
import { getCurrentUser } from "../services/authService";

const WARNING_DURATION_MS = 2500;
const QUICK_TEST_DURATION_SECONDS = 10 * 60;
const SKILL_TEST_DURATION_SECONDS = 15 * 60;
const COMBINED_SKILL_TEST_DURATION_SECONDS = 20 * 60;
const FULLSCREEN_EXIT_GRACE_SECONDS = 10;
const PREPARING_TIP_ROTATION_MS = 2500;

const TEST_PREPARATION_TIPS = [
  "Read each question fully before selecting an option.",
  "Eliminate clearly wrong choices first to improve accuracy.",
  "Manage time evenly across all questions.",
  "Use your first instinct unless you spot a clear mistake.",
  "Stay calm and avoid rushing the final questions.",
];

const TestPage = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [testMode, setTestMode] = useState("single");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [showFullscreenExitWarning, setShowFullscreenExitWarning] = useState(false);
  const [fullscreenExitCountdown, setFullscreenExitCountdown] = useState(FULLSCREEN_EXIT_GRACE_SECONDS);
  const [isPreparingQuestions, setIsPreparingQuestions] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [cooldownInfo, setCooldownInfo] = useState({
    cooldown: false,
    cooldown_by_skill: {},
    message: "",
  });

  const timerRef = useRef(null);
  const warningRef = useRef(null);
  const fullscreenExitTimeoutRef = useRef(null);
  const fullscreenExitIntervalRef = useRef(null);
  const preparingTipsIntervalRef = useRef(null);
  const intentionalFullscreenExitRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const currentUserKey = getCurrentUser()?.username || getCurrentUser()?.name || "guest";

  const isSkillTestPage = page === "skillTest";

  useEffect(() => {
    checkTestStatus();
    return () => {
      stopTimer();
      clearWarningTimer();
      clearFullscreenExitWarningTimers();
      clearPreparingTipsTimer();
      exitFullscreen();
    };
  }, [currentUserKey]);

  useEffect(() => {
    if (!isPreparingQuestions) {
      clearPreparingTipsTimer();
      setTipIndex(0);
      return undefined;
    }

    preparingTipsIntervalRef.current = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TEST_PREPARATION_TIPS.length);
    }, PREPARING_TIP_ROTATION_MS);

    return () => clearPreparingTipsTimer();
  }, [isPreparingQuestions]);

  useEffect(() => {
    if (page !== "skillTest") return undefined;

    const onFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(active);

      if (active) {
        clearFullscreenExitWarningTimers();
        setShowFullscreenExitWarning(false);
        setFullscreenExitCountdown(FULLSCREEN_EXIT_GRACE_SECONDS);
        return;
      }

      if (intentionalFullscreenExitRef.current) {
        intentionalFullscreenExitRef.current = false;
        return;
      }

      triggerFullscreenExitWarning();
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, [page]);

  useEffect(() => {
    if (page !== "skillTest") return undefined;

    const watchdog = setInterval(() => {
      const active = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );

      setIsFullscreen(active);
      if (!active && !intentionalFullscreenExitRef.current) {
        triggerFullscreenExitWarning();
      }
    }, 400);

    return () => clearInterval(watchdog);
  }, [page]);

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

      if (key === "escape" || key === "esc") {
        event.preventDefault();
        triggerWarning();
        if (page === "skillTest") {
          triggerFullscreenExitWarning();
        }
        return;
      }

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
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyDown, true);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyDown, true);
    };
  }, [isSkillTestPage]);

  const clearWarningTimer = () => {
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  };

  const clearPreparingTipsTimer = () => {
    if (preparingTipsIntervalRef.current) {
      clearInterval(preparingTipsIntervalRef.current);
      preparingTipsIntervalRef.current = null;
    }
  };

  const clearFullscreenExitWarningTimers = () => {
    if (fullscreenExitTimeoutRef.current) {
      clearTimeout(fullscreenExitTimeoutRef.current);
      fullscreenExitTimeoutRef.current = null;
    }
    if (fullscreenExitIntervalRef.current) {
      clearInterval(fullscreenExitIntervalRef.current);
      fullscreenExitIntervalRef.current = null;
    }
  };

  const triggerFullscreenExitWarning = () => {
    if (page !== "skillTest") return;
    if (fullscreenExitTimeoutRef.current) return;

    clearFullscreenExitWarningTimers();
    setShowFullscreenExitWarning(true);
    setFullscreenExitCountdown(FULLSCREEN_EXIT_GRACE_SECONDS);

    fullscreenExitIntervalRef.current = setInterval(() => {
      setFullscreenExitCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    fullscreenExitTimeoutRef.current = setTimeout(() => {
      if (autoSubmitTriggeredRef.current) return;
      autoSubmitTriggeredRef.current = true;
      setShowFullscreenExitWarning(false);
      handleAutoSubmit();
    }, FULLSCREEN_EXIT_GRACE_SECONDS * 1000);
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
      setError("Loading your test setup...");
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
      setError("");
      startTimer(QUICK_TEST_DURATION_SECONDS);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load test setup. Please try again.");
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
      autoSubmitTriggeredRef.current = false;
      clearFullscreenExitWarningTimers();
      setShowFullscreenExitWarning(false);
      setFullscreenExitCountdown(FULLSCREEN_EXIT_GRACE_SECONDS);
      return true;
    } catch (err) {
      setIsFullscreen(false);
      setError("Could not enter fullscreen mode. Please allow fullscreen and try again.");
      return false;
    }
  };

  const exitFullscreen = async () => {
    try {
      intentionalFullscreenExitRef.current = true;
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

  const handleReturnToFullscreen = async () => {
    setError("");
    const entered = await enterFullscreen();
    if (!entered) {
      setError("Fullscreen is required for this test. Please re-enter fullscreen or your test will be auto-submitted.");
      triggerFullscreenExitWarning();
      return;
    }
    setShowFullscreenExitWarning(false);
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill);
    setSelectedSkills([]);
    setTestMode("single");
    setPage("systemCheck");
  };

  const handleCombinedSkillSelect = (skills) => {
    setSelectedSkills(Array.isArray(skills) ? skills : []);
    setSelectedSkill("");
    setTestMode("combined");
    setPage("systemCheck");
  };

  const handleSystemCheckComplete = async () => {
    try {
      if (isPreparingQuestions) return;

      setLoading(true);
      setError("");
      setIsPreparingQuestions(true);
      setError("Generating your skill test questions...");

      const entered = await enterFullscreen();
      if (!entered) {
        setIsPreparingQuestions(false);
        setPage("systemCheck");
        return;
      }

      const skillTestData =
        testMode === "combined"
          ? await getCombinedSkillTest(selectedSkills)
          : await getSkillTest(selectedSkill);

      if (!skillTestData?.questions?.length) {
        setIsPreparingQuestions(false);
        setError(skillTestData?.message || "Failed to generate questions for this skill. Please try another skill or retry.");
        setPage("error");
        return;
      }

      setQuestions(skillTestData.questions);
      setCurrentQuestion(0);
      setAnswers({});
      setIsPreparingQuestions(false);
      setError("");
      setPage("skillTest");
      startTimer(testMode === "combined" ? COMBINED_SKILL_TEST_DURATION_SECONDS : SKILL_TEST_DURATION_SECONDS);
    } catch (err) {
      setIsPreparingQuestions(false);
      const message = err?.response?.data?.message || "Failed to generate skill test questions. Please retry.";
      setError(message);
      setPage("error");
    } finally {
      setIsPreparingQuestions(false);
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

  const buildSubmissionAnswers = (forceComplete = false) => {
    const preparedAnswers = { ...answers };

    if (!forceComplete) {
      return preparedAnswers;
    }

    questions.forEach((questionItem) => {
      const questionId = String(questionItem?.id || "");
      if (!questionId || preparedAnswers[questionId]) return;

      const options = questionItem?.options || {};
      const firstOptionKey = Object.keys(options)[0] || "A";
      preparedAnswers[questionId] = firstOptionKey;
    });

    return preparedAnswers;
  };

  const handleSubmitTest = async ({ forceComplete = false } = {}) => {
    try {
      setLoading(true);
      const submissionAnswers = buildSubmissionAnswers(forceComplete);

      if (page === "quickTest") {
        await submitQuickTest(submissionAnswers);
        stopTimer();
        setQuestions([]);
        setAnswers({});
        setCurrentQuestion(0);
        navigate("/recommendations");
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("careerclarity:open-chatbot", {
              detail: {
                initialMessage:
                  "Quick test completed. View your recommendations and choose a skill test for better predictions.",
              },
            })
          );
        }, 200);
        return;
      }

      if (page === "skillTest") {
        clearFullscreenExitWarningTimers();
        setShowFullscreenExitWarning(false);
        const submitResponse =
          testMode === "combined"
            ? await submitCombinedSkillTest(submissionAnswers, selectedSkills)
            : await submitSkillTest(submissionAnswers, selectedSkill);
        stopTimer();
        await exitFullscreen();
        setResult(submitResponse);
        setPage("result");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to submit test. Your answers are safe; please try submitting again.";
      setError(message);
      setPage("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    clearFullscreenExitWarningTimers();
    setShowFullscreenExitWarning(false);
    handleSubmitTest({ forceComplete: true });
  };

  const SecurityWarning = () => (
    <div className="fixed top-4 right-4 z-50 rounded-lg bg-red-600 px-5 py-3 text-white shadow-xl">
      <p className="font-semibold">Security Warning</p>
      <p className="text-sm">Restricted action detected. Stay on the test page.</p>
    </div>
  );

  const FullscreenExitWarningModal = () => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-extrabold text-red-700">⚠️ Fullscreen Exit Detected</h3>
        <p className="mt-2 text-sm text-slate-700">
          You exited fullscreen during the skill test. Return to fullscreen now to continue safely.
        </p>
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Auto-submit in {fullscreenExitCountdown}s if ignored.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleReturnToFullscreen}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Return to Fullscreen
          </button>
          <button
            type="button"
            onClick={handleAutoSubmit}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Submit Test Now
          </button>
        </div>
      </div>
    </div>
  );

  const PreparingQuestionsModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Preparing questions...</h3>
            <p className="text-sm text-slate-600">Server is generating your skill test. Please wait.</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Tip for better performance</p>
          <p className="mt-2 text-sm font-medium text-slate-700">💡 {TEST_PREPARATION_TIPS[tipIndex]}</p>
          <div className="mt-4 flex items-center gap-1">
            {TEST_PREPARATION_TIPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index === tipIndex ? "bg-indigo-600" : "bg-indigo-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
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
    return (
      <SkillsSelectionPage
        onSkillSelect={handleSkillSelect}
        onCombinedTestSelect={handleCombinedSkillSelect}
        cooldownInfo={cooldownInfo}
        availableSkills={availableSkills}
      />
    );
  }

  if (page === "systemCheck") {
    return (
      <>
        <SystemCheckPage
          skillName={testMode === "combined" ? "Combined Skill Test" : selectedSkill}
          onCheckComplete={handleSystemCheckComplete}
          onCancel={() => setPage("skillsSelection")}
          isPreparingQuestions={isPreparingQuestions}
        />
        {isPreparingQuestions ? <PreparingQuestionsModal /> : null}
      </>
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
        {showFullscreenExitWarning && <FullscreenExitWarningModal />}

        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-2xl border border-blue-500/40 bg-slate-800/90 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-white">
              <div>
                <h1 className="text-3xl font-bold">
                  🎯 {testMode === "combined" ? "Combined Skill Test" : `Skill Test - ${selectedSkill?.toUpperCase()}`}
                </h1>
                <p className="text-blue-100 mt-1">
                  Security mode enabled • {testMode === "combined" ? "20 questions" : "15 questions"} • {testMode === "combined" ? "20" : "15"} minutes
                </p>
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
