import api, { getApiData, getApiErrorMessage } from "./api";

export function openChatbot(initialMessage = "") {
	if (typeof window === "undefined") return;

	window.dispatchEvent(
		new CustomEvent("careerclarity:open-chatbot", {
			detail: { initialMessage },
		})
	);
}

export async function sendChatMessage(message, options = {}) {
	const routeHint = options?.flowContext?.currentRoute ? ` on ${options.flowContext.currentRoute}` : "";
	const userLabel = options?.flowContext?.username || "your profile";
	const payload = {
		message,
		sessionId: options?.sessionId || "",
		history: Array.isArray(options?.history) ? options.history : [],
		flowContext: options?.flowContext && typeof options.flowContext === "object" ? options.flowContext : {},
	};

	try {
		const response = await api.post("/cv/chatbot/", payload);
		return getApiData(response);
	} catch (error) {
		const status = error?.response?.status;
		const payload = error?.response?.data?.data || {};
		const backendMessage = payload?.reply || getApiErrorMessage(error, "");

		if (status === 401) {
			return {
				reply: `Your session expired for ${userLabel}. Please sign in again to continue this chat${routeHint}.`,
			};
		}

		if (backendMessage) {
			return {
				reply: backendMessage,
			};
		}

		return {
			reply: `I couldn’t reach the assistant service right now${routeHint}. I can still guide ${userLabel} using your latest profile context if you ask your next career step.`,
		};
	}
}
