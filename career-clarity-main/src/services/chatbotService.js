import api from "./api";

export async function sendChatMessage(message) {
	try {
		const response = await api.post("/cv/chat/", { message });
		return response.data;
	} catch {
		return {
			reply:
				"I’m unable to reach the server right now. Please try again shortly, or ask about career paths, skills, or exams and I’ll still guide you.",
		};
	}
}
