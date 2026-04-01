import api from "./api";

const fallbackRecommendations = [
	{
		title: "Data Analyst",
		description: "Analyze data patterns to support decisions across industries.",
		requiredSkills: ["Excel", "SQL", "Python", "Statistics"],
		salaryRange: "₹4 LPA - ₹10 LPA",
	},
	{
		title: "Software Developer",
		description: "Design and build software products for web and mobile platforms.",
		requiredSkills: ["JavaScript", "React", "Problem Solving", "Git"],
		salaryRange: "₹5 LPA - ₹18 LPA",
	},
	{
		title: "UI/UX Designer",
		description: "Create intuitive digital experiences with user-first design.",
		requiredSkills: ["Figma", "Research", "Wireframing", "Visual Design"],
		salaryRange: "₹4 LPA - ₹12 LPA",
	},
];

const fallbackRoadmap = {
	career: "Software Developer",
	steps: [
		"Build strong fundamentals in programming and data structures",
		"Create 3-4 real-world projects and host them online",
		"Learn backend basics and APIs",
		"Prepare for coding interviews and internships",
	],
	exams: ["JEE (for engineering aspirants)", "GATE (higher studies)", "NIMCET (MCA aspirants)"],
	certifications: ["Meta Front-End Developer", "AWS Cloud Practitioner", "Google IT Automation"],
	skillRoadmap: ["Programming", "Web Development", "System Design", "Communication"],
};

const fallbackAlerts = [
	{ id: 1, type: "Admission", title: "IIT Admissions Round 1", date: "2026-04-18" },
	{ id: 2, type: "Scholarship", title: "National Scholarship Portal Deadline", date: "2026-03-30" },
	{ id: 3, type: "Exam", title: "CUET Registration Closes", date: "2026-04-10" },
];

export async function submitQuickTestAnswers(payload) {
	const response = await api.post("/test/quick/submit/", payload);
	return response.data;
}

export async function getCareerRecommendations() {
	try {
		const response = await api.get("/careers/recommendations");
		return response.data;
	} catch {
		return { recommendations: fallbackRecommendations };
	}
}

export async function getCareerRoadmap(career) {
	try {
		const response = await api.get("/careers/roadmap", { params: { career } });
		return response.data;
	} catch {
		return { ...fallbackRoadmap, career: career || fallbackRoadmap.career };
	}
}

export async function getAlerts() {
	try {
		const response = await api.get("/alerts");
		return response.data;
	} catch {
		return { alerts: fallbackAlerts };
	}
}
