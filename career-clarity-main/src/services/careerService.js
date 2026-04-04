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
	ability: "medium",
	skills: ["JavaScript", "Problem Solving"],
	steps: [
		{
			title: "Master Programming Fundamentals",
			description: "Build strong foundation in programming, data structures, and algorithms to excel in coding interviews.",
			resources: [
				{ title: "CS50's Introduction to Computer Science", type: "course", link: "https://cs50.harvard.edu" },
				{ title: "LeetCode DSA Problems", type: "practice", link: "https://leetcode.com" },
				{ title: "GeeksforGeeks DSA Tutorials", type: "docs", link: "https://www.geeksforgeeks.org" },
			],
		},
		{
			title: "Build Real-World Projects",
			description: "Create 3-4 portfolio projects using modern frameworks to showcase practical skills to employers.",
			resources: [
				{ title: "React Official Documentation", type: "docs", link: "https://react.dev" },
				{ title: "Full Stack Web Development Course", type: "course", link: "https://www.udemy.com" },
				{ title: "GitHub Project Hosting", type: "practice", link: "https://github.com" },
			],
		},
		{
			title: "Learn Backend & APIs",
			description: "Master server-side development, databases, and REST APIs to become a full-stack developer.",
			resources: [
				{ title: "Node.js Documentation", type: "docs", link: "https://nodejs.org/docs" },
				{ title: "Backend Web Development Course", type: "course", link: "https://www.udemy.com" },
				{ title: "SQL Practice Platform", type: "practice", link: "https://www.hackerrank.com" },
			],
		},
		{
			title: "Interview Preparation",
			description: "Prepare for technical coding interviews and system design rounds to land your first software engineering role.",
			resources: [
				{ title: "Cracking the Coding Interview", type: "docs", link: "https://www.crackingthecodinginterview.com" },
				{ title: "Blind Interview Prep", type: "practice", link: "https://www.blind.com" },
				{ title: "System Design Interview Course", type: "course", link: "https://www.educative.io" },
			],
		},
		{
			title: "Secure Internship & First Role",
			description: "Apply to internships and entry-level positions to gain real-world experience and professional growth.",
			resources: [
				{ title: "LinkedIn Job Search", type: "practice", link: "https://www.linkedin.com" },
				{ title: "AngelList Startup Jobs", type: "practice", link: "https://www.angellist.com" },
				{ title: "Resume Building Guide", type: "docs", link: "https://www.indeed.com" },
			],
		},
		{
			title: "Specialize & Advance Career",
			description: "Choose a specialization (frontend, backend, full-stack) and build expertise for senior roles.",
			resources: [
				{ title: "Advanced TypeScript Course", type: "course", link: "https://www.udemy.com" },
				{ title: "Microservices Architecture", type: "docs", link: "https://microservices.io" },
				{ title: "System Design Mastery", type: "practice", link: "https://www.educative.io" },
			],
		},
	],
	exams: ["JEE (for engineering aspirants)", "GATE (higher studies)", "NIMCET (MCA aspirants)"],
	certifications: ["Meta Front-End Developer", "AWS Cloud Practitioner", "Google IT Automation"],
	skillRoadmap: ["Programming", "Data Structures", "Web Development", "System Design", "Communication"],
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
		const response = await api.get("/predict/");
		return response.data;
	} catch {
		return { recommendations: fallbackRecommendations };
	}
}

export async function getCareerRoadmap(career) {
	try {
		const response = await api.get("/roadmap/", { params: { career } });
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
