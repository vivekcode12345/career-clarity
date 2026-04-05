import api, { getApiData, getApiMessage, getApiErrorMessage } from "./api";

function normalizeCVAnalysis(payload) {
	if (!payload) {
		return null;
	}

	if (
		Array.isArray(payload.extractedSkills) ||
		Array.isArray(payload.missingSkills) ||
		Array.isArray(payload.suggestedCareers)
	) {
		return payload;
	}

	const extractedSkills = Array.isArray(payload.skills) ? payload.skills : [];
	const resumeScore = extractedSkills.length > 0 ? Math.min(95, 55 + extractedSkills.length * 7) : 55;
	const uploadMessage = typeof payload.uploadMessage === "string" && payload.uploadMessage.trim().length > 0
		? payload.uploadMessage.trim()
		: typeof payload.message === "string" && payload.message.trim().length > 0
		? payload.message.trim()
		: "Document uploaded successfully.";

	return {
		extractedSkills,
		skills: extractedSkills,
		uploadMessage,
		missingSkills: [],
		suggestedCareers: ["Career recommendations are being prepared based on your profile."],
		resumeScore,
		improvementSuggestions: [
			"Add measurable achievements for each project or internship",
			"Include certifications and relevant coursework",
			"Tailor your CV summary to the target role",
		],
	};
}

export async function uploadCV(file) {
	const formData = new FormData();
	formData.append("cv", file);

	try {
		const response = await api.post("/cv/upload-cv/", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});

		const data = getApiData(response);
		const message = getApiMessage(response);
		const analysis = normalizeCVAnalysis({ ...data, uploadMessage: message });
		saveLastCVAnalysis(analysis);
		return analysis;
	} catch (error) {
		throw new Error(getApiErrorMessage(error, "CV upload failed. Please try again."));
	}
}

export async function hasUploadedCV() {
	try {
		const response = await api.get("/cv/cv-data/");
		const data = getApiData(response);
		return Array.isArray(data?.skills) && data.skills.length > 0;
	} catch (error) {
		if (error.response?.status === 404) {
			return false;
		}
		throw error;
	}
}

export async function getProfileReadiness() {
	/**
	 * Checks if user has completed onboarding enough to stop chatbot auto-open.
	 * Ready when at least one is true:
	 * - Profile completion is done (name + interests)
	 * - Profile skills are present
	 * - CV skills are present
	 */
	try {
		try {
			const completion = await api.get("/cv/profile-completion-check/");
			const completionData = getApiData(completion);
			if (completionData?.is_complete) {
				return true;
			}
		} catch {
			// Continue with other readiness checks.
		}

		const response = await api.get("/cv/profile-skills/");
		const profile = getApiData(response);
		const hasProfileSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
		if (hasProfileSkills) {
			return true;
		}

		try {
			const cvResponse = await api.get("/cv/cv-data/");
			const cvData = getApiData(cvResponse);
			if (cvData?.uploaded === true) {
				return true;
			}
			return Array.isArray(cvData?.skills);
		} catch {
			return false;
		}
	} catch (error) {
		return false;
	}
}

export function saveLastCVAnalysis(analysis) {
	localStorage.setItem("cvAnalysis", JSON.stringify(analysis));
}

export function getLastCVAnalysis() {
	try {
		const raw = localStorage.getItem("cvAnalysis");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
