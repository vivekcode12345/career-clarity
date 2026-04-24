import { useEffect, useState } from "react";
import ChatWindow from "./ChatWindow";
import { getCurrentUser, isAuthenticated } from "../services/authService";
import { getProfileReadiness } from "../services/resumeService";
import { useLocation } from "react-router-dom";

function Chatbot() {
	const [isOpen, setIsOpen] = useState(false);
	const [pendingInitialMessage, setPendingInitialMessage] = useState("");
	const location = useLocation();
	const userIdentity = getCurrentUser()?.username || "guest";
	const forceCloseRoutes = ["/profile", "/quick-test"];

	useEffect(() => {
		let isMounted = true;

		const autoOpenForDashboard = async () => {
			if (forceCloseRoutes.includes(location.pathname)) {
				setIsOpen(false);
				return;
			}

			if (!isAuthenticated()) {
				setIsOpen(false);
				return;
			}

			if (location.pathname !== "/dashboard") {
				return;
			}

			try {
				const isReady = await getProfileReadiness();
				if (!isMounted) return;

				if (!isReady) {
					setPendingInitialMessage(
						"Welcome! Please upload your CV or marks card, or update your profile to continue."
					);
					setIsOpen(true);
				}
			} catch {
				if (isMounted) {
					setPendingInitialMessage(
						"Welcome! Please upload your CV or marks card, or update your profile to continue."
					);
					setIsOpen(true);
				}
			}
		};

		autoOpenForDashboard();

		return () => {
			isMounted = false;
		};
	}, [location.pathname]);

	useEffect(() => {
		const handleOpenChatbotEvent = (event) => {
			const initialMessage = event?.detail?.initialMessage;
			if (typeof initialMessage === "string" && initialMessage.trim()) {
				setPendingInitialMessage(initialMessage.trim());
			}
			setIsOpen(true);
		};

		const handleCloseChatbotEvent = () => {
			setIsOpen(false);
		};

		window.addEventListener("careerclarity:open-chatbot", handleOpenChatbotEvent);
		window.addEventListener("careerclarity:close-chatbot", handleCloseChatbotEvent);
		return () => {
			window.removeEventListener("careerclarity:open-chatbot", handleOpenChatbotEvent);
			window.removeEventListener("careerclarity:close-chatbot", handleCloseChatbotEvent);
		};
	}, []);

	return (
		<>
			{!forceCloseRoutes.includes(location.pathname) && (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="fixed bottom-5 right-5 z-40 rounded-full border border-white/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:shadow-xl"
					aria-label="Open career chatbot"
				>
					Chat with AI
				</button>
			)}

			<ChatWindow
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				userIdentity={userIdentity}
				initialMessage={pendingInitialMessage}
				onInitialMessageSent={() => setPendingInitialMessage("")}
			/>
		</>
	);
}

export default Chatbot;
