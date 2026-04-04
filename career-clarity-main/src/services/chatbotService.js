import api from "./api";

export function openChatbot(initialMessage = "") {
	if (typeof window === "undefined") return;

	window.dispatchEvent(
		new CustomEvent("careerclarity:open-chatbot", {
			detail: { initialMessage },
		})
	);
}

export async function sendChatMessage(message) {
	try {
		const response = await api.post("/chatbot/", { message });
		return response.data;
	} catch (error) {
		const status = error?.response?.status;
		const backendMessage = error?.response?.data?.reply || error?.response?.data?.message || error?.response?.data?.detail;

		if (status === 401) {
			return {
				reply: "Please sign in again to use the chatbot.",
			};
		}

		if (backendMessage) {
			return {
				reply: backendMessage,
			};
		}

		return {
			reply:
				"I’m unable to reach the server right now. Please try again shortly, or ask about career paths, skills, or exams and I’ll still guide you.",
		};
	}
}
