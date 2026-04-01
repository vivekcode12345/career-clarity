import api from "./api";

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
	const uploadMessage = typeof payload.message === "string" && payload.message.trim().length > 0
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

		const analysis = normalizeCVAnalysis(response.data?.analysis || response.data);
		saveLastCVAnalysis(analysis);
		return analysis;
	} catch (error) {
		const apiMessage = error.response?.data?.error;
		throw new Error(apiMessage || "CV upload failed. Please try again.");
	}
}

export async function hasUploadedCV() {
	try {
		const response = await api.get("/cv/cv-data/");
		return Array.isArray(response.data?.skills) && response.data.skills.length > 0;
	} catch (error) {
		if (error.response?.status === 404) {
			return false;
		}
		throw error;
	}
}

export async function getProfileReadiness() {
	/**
	 * Checks if user has completed their profile setup.
	 * For all users: if profile skills exist, profile is considered ready.
	 * If profile skills are missing, fall back to CV data check.
	 */
	try {
		const response = await api.get("/cv/profile-skills/");
		const profile = response.data;
		const hasProfileSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
		if (hasProfileSkills) {
			return true;
		}

		try {
			const cvResponse = await api.get("/cv/cv-data/");
			return Array.isArray(cvResponse.data?.skills) && cvResponse.data.skills.length > 0;
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
