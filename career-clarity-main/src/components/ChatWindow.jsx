import { useEffect, useMemo, useRef, useState } from "react";
import { sendChatMessage } from "../services/chatbotService";
import { useNavigate } from "react-router-dom";
import { uploadCV } from "../services/resumeService";

const initialBotMessage = {
  id: 1,
  role: "bot",
  text: "Hi! I’m your CareerClarity assistant. Ask me about streams, degrees, skills, colleges, or career roadmaps.",
};

function ChatWindow({ isOpen, onClose, userIdentity, initialMessage, onInitialMessageSent }) {
  const [messages, setMessages] = useState([initialBotMessage]);

  const [inputValue, setInputValue] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null); // ✅ FIXED
  const lastAutoSentMessageRef = useRef("");

  const navigate = useNavigate();

  const resetChatState = () => {
    setMessages([{ ...initialBotMessage }]);
    setInputValue("");
    setIsBotTyping(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetChatState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping, isOpen]);

  useEffect(() => {
    resetChatState();
  }, [userIdentity]);

  const canSend = useMemo(
    () => inputValue.trim().length > 0 && !isBotTyping,
    [inputValue, isBotTyping]
  );

  // ✅ HANDLE BUTTON ACTIONS
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

  // ✅ HANDLE FILE UPLOAD
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsBotTyping(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "bot",
        text: "⏳ Uploading your file...",
      },
    ]);

    try {
      const res = await uploadCV(file);

      const detectedSkills = Array.isArray(res.skills)
        ? res.skills
        : Array.isArray(res.extractedSkills)
          ? res.extractedSkills
          : [];
      const uploadStatusMessage = typeof res.uploadMessage === "string" && res.uploadMessage.trim().length > 0
        ? res.uploadMessage
        : "Document uploaded successfully.";
      const isMarksCardUpload = /marks\s*card/i.test(uploadStatusMessage) || /\.(jpg|jpeg|png)$/i.test(file.name || "");
      const documentLabel = isMarksCardUpload ? "marks card" : "CV";
      const uploadReply =
        detectedSkills.length > 0
          ? `${uploadStatusMessage} I identified: ${detectedSkills.join(", ")}. Next step is to take the quick test.`
          : `${uploadStatusMessage} I couldn't infer enough skills yet. Please share your interest subjects (for example: Maths, Biology, Computer Science).`;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "bot",
          text: `${uploadStatusMessage} ⏳ Processing your ${documentLabel}, few seconds to go...`,
        },
      ]);

      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            text: uploadReply,
            actions:
              detectedSkills.length > 0
                ? [{ label: "Take Quick Test", route: "/quick-test" }, { label: "Close Chat", type: "close" }]
                : [{ label: "Upload Again", type: "upload" }, { label: "Close Chat", type: "close" }],
          },
        ]);
        setIsBotTyping(false);
      }, 1400);
    } catch (err) {
      console.error(err);
      const failureMessage = err?.message || "Upload failed. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "bot",
          text: `Upload failed: ${failureMessage}`,
          actions: [{ label: "Upload Again", type: "upload" }, { label: "Close Chat", type: "close" }],
        },
      ]);
      setIsBotTyping(false);
    }
  };

  const sendMessage = async (rawMessage) => {
    const userMessage = rawMessage.trim();
    if (!userMessage || isBotTyping) return;

    // show user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: userMessage },
    ]);

    setIsBotTyping(true);

    try {
      const result = await sendChatMessage(userMessage);
      const botReply =
        result?.reply ||
        result?.message ||
        "Thanks for your query. I’ll help you with the next steps.";

      const sanitizedBotReply = botReply.replace(
        /take\s+(the\s+)?ability\s+test/gi,
        "take the quick test"
      );

      const actions = Array.isArray(result?.actions)
        ? result.actions.map((action) => {
            const nextAction = { ...action };
            if (
              typeof nextAction.label === "string" &&
              /take\s+(the\s+)?ability\s+test/i.test(nextAction.label)
            ) {
              nextAction.label = "Take Quick Test";
            }
            return nextAction;
          })
        : [];
      const needsUploadAction = /upload\s+your\s+cv|get\s+started/i.test(botReply);
      if (needsUploadAction && actions.length === 0) {
        actions.push({ label: "Upload CV", type: "upload" });
      }
      
      // Always add a close button to all responses
      actions.push({ label: "Close Chat", type: "close" });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: sanitizedBotReply,
          actions,
        },
      ]);
    } catch (err) {
      console.error(err);
    }

    setIsBotTyping(false);
  };

  // ✅ SEND MESSAGE
  const onSend = async () => {
    const userMessage = inputValue.trim();
    if (!userMessage || isBotTyping) return;
    setInputValue("");
    await sendMessage(userMessage);
  };

  useEffect(() => {
    if (!isOpen || !initialMessage || isBotTyping) {
      return;
    }

    if (lastAutoSentMessageRef.current === initialMessage) {
      return;
    }

    lastAutoSentMessageRef.current = initialMessage;
    sendMessage(initialMessage);
    onInitialMessageSent?.();
  }, [isOpen, initialMessage, isBotTyping, onInitialMessageSent]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/40 p-4 backdrop-blur-[2px] sm:p-6"
      onClick={handleClose}
    >
      <div
        className="flex h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            CareerClarity AI Chatbot
          </h2>
          <button onClick={handleClose}>✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* Text */}
              <p
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700"
                }`}
              >
                {message.text}
              </p>

              {/* ✅ ACTION BUTTONS */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.actions.map((action, index) => {
                    const isProfileAction = action.label.includes("Profile");
                    const isCloseAction = action.type === "close";
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAction(action)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isProfileAction
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : isCloseAction
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

          {/* Typing */}
          {isBotTyping && <p className="text-sm text-slate-500">⏳ Processing...</p>}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 border px-2 py-1"
              placeholder="Ask something..."
            />

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            <button disabled={!canSend}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;