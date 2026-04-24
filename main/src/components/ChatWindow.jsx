import { useEffect, useMemo, useRef, useState } from "react";
import { sendChatMessage } from "../services/chatbotService";
import { useNavigate } from "react-router-dom";
import { uploadCV } from "../services/resumeService";
import { getQuickTest } from "../services/testService";
import { getCurrentUser } from "../services/authService";

const initialBotMessage = {
  id: 1,
  role: "bot",
  text: "Hi! I’m your CareerClarity assistant. Ask me about careers, skills, degrees, colleges, or your next step.",
};

function ChatWindow({ isOpen, onClose, userIdentity, initialMessage, onInitialMessageSent }) {
  const [messages, setMessages] = useState([{ ...initialBotMessage }]);
  const [inputValue, setInputValue] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [nextTestLabel, setNextTestLabel] = useState("Quick Test");

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const sessionIdRef = useRef(`${userIdentity}-${Date.now()}`);
  const onboardingBootstrappedRef = useRef(false);
  const initialNoticeShownRef = useRef(false);

  const navigate = useNavigate();

  const resetChatState = () => {
  setMessages([{ ...initialBotMessage, id: Date.now() }]);
  setInputValue("");
  setIsBotTyping(false);
  sessionIdRef.current = `${userIdentity}-${Date.now()}`;
  onboardingBootstrappedRef.current = false;
  initialNoticeShownRef.current = false;
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
  };

  const handleClose = () => {
  resetChatState();
  onClose();
  };

  const buildConversationHistory = (extraUserMessage = "") => {
  const serializable = messages
    .filter((item) => ["user", "bot"].includes(item.role) && typeof item.text === "string" && item.text.trim())
    .slice(-10)
    .map((item) => ({ role: item.role, text: item.text.trim() }));

  if (extraUserMessage.trim()) {
    serializable.push({ role: "user", text: extraUserMessage.trim() });
  }

  return serializable.slice(-10);
  };

  const appendBotMessage = (text, actions = []) => {
  setMessages((prev) => [
    ...prev,
    {
      id: Date.now() + Math.random(),
      role: "bot",
      text,
      actions,
    },
  ]);
  };

  useEffect(() => {
  if (!isOpen) return;
  inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
  if (!isOpen) {
    return;
  }

  let mounted = true;

  const loadNextTestLabel = async () => {
    try {
      const quickTestData = await getQuickTest();
      if (!mounted) {
        return;
      }

      setNextTestLabel(quickTestData?.attempted ? "Skill Test" : "Quick Test");
    } catch {
      if (mounted) {
        setNextTestLabel("Quick Test");
      }
    }
  };

  loadNextTestLabel();

  return () => {
    mounted = false;
  };
  }, [isOpen]);

  useEffect(() => {
  if (!isOpen || !initialMessage || initialNoticeShownRef.current) {
    return;
  }

  initialNoticeShownRef.current = true;

  if (initialMessage === "__UPLOAD_CV__") {
    appendBotMessage(
      "Please upload your renewed CV now. After upload, your skills, recommendations, and skill-test flow will refresh.",
      [{ label: "Upload CV", type: "upload" }, { label: "Close Chat", type: "close" }]
    );
    onInitialMessageSent?.();
    return;
  }

  appendBotMessage(initialMessage.trim());
  onInitialMessageSent?.();
  }, [isOpen, initialMessage, onInitialMessageSent]);

  useEffect(() => {
	if (!isOpen) return;
	endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping, isOpen]);

  useEffect(() => {
	resetChatState();
  }, [userIdentity]);

  const canSend = useMemo(() => inputValue.trim().length > 0 && !isBotTyping, [inputValue, isBotTyping]);

  const handleAction = (action) => {
    if (action.type === "upload") {
    fileInputRef.current?.click();
  } else if (action.type === "close") {
    handleClose();
  } else if (action.route) {
    navigate(action.route);
    handleClose();
  }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsBotTyping(true);
    appendBotMessage("Uploading your file...");

    try {
    const res = await uploadCV(file);
    const detectedSkills = Array.isArray(res.skills)
      ? res.skills
      : Array.isArray(res.extractedSkills)
        ? res.extractedSkills
        : [];
    const uploadStatusMessage =
      typeof res.uploadMessage === "string" && res.uploadMessage.trim().length > 0
        ? res.uploadMessage
        : "Document uploaded successfully.";

    const uploadReply =
      detectedSkills.length > 0
        ? `${uploadStatusMessage} I identified: ${detectedSkills.join(", ")}. Next step: take the ${nextTestLabel.toLowerCase()}.`
        : `${uploadStatusMessage} Upload is complete. Continue by updating profile or taking the ${nextTestLabel.toLowerCase()}.`;

    appendBotMessage(uploadReply, [
      ...(detectedSkills.length > 0 ? [] : [{ label: "Update Profile", route: "/profile" }]),
      { label: `Take ${nextTestLabel}`, route: "/quick-test" },
      { label: "Close Chat", type: "close" },
    ]);
  } catch (err) {
    const failureMessage = err?.message || "Upload failed. Please try again.";
    appendBotMessage(`Upload failed: ${failureMessage}`, [
      { label: "Upload Again", type: "upload" },
      { label: "Close Chat", type: "close" },
    ]);
  } finally {
    setIsBotTyping(false);
  }
  };

  const sendMessage = async (rawMessage, options = {}) => {
  const { includeUserMessage = true } = options;
  const userMessage = rawMessage.trim();
  if (!userMessage || isBotTyping) return;

  if (includeUserMessage) {
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: userMessage }]);
  }

  setIsBotTyping(true);

  try {
    const currentUser = getCurrentUser() || {};
    const displayName = currentUser?.name || currentUser?.username || userIdentity || "student";
    const routeHint = window.location.pathname || "/dashboard";
    const result = await sendChatMessage(userMessage, {
      sessionId: sessionIdRef.current,
      history: buildConversationHistory(userMessage),
      flowContext: {
        currentRoute: window.location.pathname,
        nextTestLabel,
        username: currentUser?.username || userIdentity,
        educationLevel: currentUser?.educationLevel || "",
      },
    });

    const botReply =
      result?.reply ||
      result?.message ||
      `I’m continuing with your context, ${displayName}. From ${routeHint}, your next best step is ${nextTestLabel.toLowerCase()} or recommendations based on your profile.`;
    const sanitizedBotReply = botReply.replace(
      /take\s+(the\s+)?ability\s+test/gi,
      `take the ${nextTestLabel.toLowerCase()}`
    );
    const normalizedBotReply =
      nextTestLabel === "Skill Test"
        ? sanitizedBotReply.replace(/take\s+(the\s+)?quick\s+test/gi, "take the skill test")
        : sanitizedBotReply;

    const actions = Array.isArray(result?.actions)
      ? result.actions.map((action) => {
          const nextAction = { ...action };
          if (
            typeof nextAction.label === "string" &&
            /take\s+(the\s+)?(ability|quick|skill)\s+test/i.test(nextAction.label)
          ) {
            nextAction.label = `Take ${nextTestLabel}`;
            nextAction.route = "/quick-test";
          }
          return nextAction;
        })
      : [];

    const needsUploadAction = /upload\s+your\s+cv|get\s+started|upload\s+marks\s*card/i.test(normalizedBotReply);
    if (needsUploadAction && actions.length === 0) {
      actions.push({ label: "Upload CV", type: "upload" });
    }

    actions.push({ label: "Close Chat", type: "close" });
    appendBotMessage(normalizedBotReply, actions);
  } catch {
    const currentUser = getCurrentUser() || {};
    const displayName = currentUser?.name || currentUser?.username || userIdentity || "student";
    const routeHint = window.location.pathname || "/dashboard";
    appendBotMessage(
      `I hit a temporary issue while processing your request, ${displayName}. From ${routeHint}, continue with ${nextTestLabel.toLowerCase()} or ask me a follow-up and I’ll use your latest chat context.`,
      [{ label: "Close Chat", type: "close" }]
    );
  } finally {
    setIsBotTyping(false);
  }
  };

  const onSend = async () => {
  const userMessage = inputValue.trim();
  if (!userMessage || isBotTyping) return;
  setInputValue("");
  await sendMessage(userMessage);
  };

  useEffect(() => {
  if (!isOpen || isBotTyping || onboardingBootstrappedRef.current) {
    return;
  }

  onboardingBootstrappedRef.current = true;
  sendMessage("__onboarding__", { includeUserMessage: false });
  }, [isOpen, isBotTyping]);

  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/35 p-4 backdrop-blur-[2px] sm:p-6" onClick={handleClose}>
    <div
      className="flex h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-indigo-100/80 bg-white shadow-2xl shadow-slate-900/20"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">CareerClarity Assistant</h2>
          <p className="text-xs text-slate-500">Session active • remembers this chat until you close</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-700"
          aria-label="Close chatbot"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
            <p
              className={`max-w-[86%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm ${
                message.role === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {message.text}
            </p>

            {message.actions && message.actions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.actions.map((action, index) => {
                  const isCloseAction = action.type === "close";
                  return (
                    <button
                      key={`${action.label}-${index}`}
                      onClick={() => handleAction(action)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isCloseAction
                          ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      }`}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {isBotTyping && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-200 [animation-delay:240ms]" />
            Thinking...
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="border-t border-indigo-100 bg-white p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="cc-input h-11 flex-1"
            placeholder="Ask about careers, skills, tests, or next steps..."
          />

          <input type="file" ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleFileUpload} />

          <button
            type="submit"
            disabled={!canSend}
            className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  </div>
  );
}

export default ChatWindow;