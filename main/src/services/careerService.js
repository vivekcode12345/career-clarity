import api, { getApiData } from "./api";
import { getCurrentUser } from "./authService";

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

function normalize(value) {
	return String(value || "").trim().toLowerCase();
}

function getCareerTrack(career) {
	const text = normalize(career);
	if (["data", "ai", "ml", "analyst"].some((token) => text.includes(token))) return "data";
	if (["design", "ui", "ux", "graphic"].some((token) => text.includes(token))) return "design";
	if (["business", "marketing", "product", "manager"].some((token) => text.includes(token))) return "business";
	if (["developer", "software", "engineer", "web", "backend", "frontend"].some((token) => text.includes(token))) return "software";
	return "general";
}

function buildPersonalizedFallbackRecommendations(user) {
	const interests = Array.isArray(user?.interests) ? user.interests.map((item) => normalize(item)) : [];
	const skills = Array.isArray(user?.skills) ? user.skills : [];
	const interestText = interests.join(" ");

	if (interestText.includes("design") || interestText.includes("creative")) {
		return [
			{ title: "UI/UX Designer", description: "Best fit for your creative and user-focused profile.", requiredSkills: ["Figma", "User Research", "Wireframing"], salaryRange: "₹4 LPA - ₹12 LPA" },
			{ title: "Product Designer", description: "Great path if you enjoy balancing product goals and design quality.", requiredSkills: ["Interaction Design", "Prototyping", "Design Systems"], salaryRange: "₹6 LPA - ₹18 LPA" },
			{ title: "Visual Designer", description: "Strong option for communication-heavy design roles.", requiredSkills: ["Typography", "Branding", "Illustration"], salaryRange: "₹4 LPA - ₹11 LPA" },
		];
	}

	if (interestText.includes("business") || interestText.includes("management")) {
		return [
			{ title: "Business Analyst", description: "Aligned with your business and decision-making interests.", requiredSkills: ["Excel", "SQL", "Communication"], salaryRange: "₹4 LPA - ₹14 LPA" },
			{ title: "Product Manager", description: "Ideal when you enjoy strategy, user needs, and execution.", requiredSkills: ["Strategy", "Research", "Leadership"], salaryRange: "₹8 LPA - ₹28 LPA" },
			{ title: "Marketing Strategist", description: "Suited for growth, communication, and market insight.", requiredSkills: ["Digital Marketing", "Analytics", "Branding"], salaryRange: "₹4 LPA - ₹15 LPA" },
		];
	}

	if (skills.some((item) => normalize(item).includes("python") || normalize(item).includes("sql"))) {
		return [
			{ title: "Data Analyst", description: "Fits your current analytical skill profile.", requiredSkills: ["SQL", "Python", "Statistics"], salaryRange: "₹4 LPA - ₹12 LPA" },
			{ title: "Data Scientist", description: "A strong progression path from your data fundamentals.", requiredSkills: ["Machine Learning", "Python", "Data Visualization"], salaryRange: "₹6 LPA - ₹22 LPA" },
			{ title: "AI Engineer", description: "Good fit if you want to build intelligent systems.", requiredSkills: ["Python", "ML", "APIs"], salaryRange: "₹7 LPA - ₹25 LPA" },
		];
	}

	return fallbackRecommendations;
}

function buildCareerSpecificFallbackRoadmap(career, user) {
	const safeCareer = career || fallbackRoadmap.career;
	const track = getCareerTrack(safeCareer);
	const skills = Array.isArray(user?.skills) && user.skills.length > 0 ? user.skills : fallbackRoadmap.skills;

	const trackSteps = {
		software: ["Coding Foundations", "Projects", "Backend & Databases", "Deployment", "Interview Prep", "Specialization"],
		data: ["Statistics Basics", "SQL & Data Cleaning", "Dashboards", "ML Basics", "Model Evaluation", "Domain Portfolio"],
		design: ["Design Principles", "Figma & Prototyping", "User Research", "Case Studies", "Design Handoff", "Specialization"],
		business: ["Business Fundamentals", "Analytics Tools", "Market Research", "Strategy Projects", "Stakeholder Skills", "Role Portfolio"],
		general: ["Explore Options", "Core Skills", "Pick a Track", "Build Portfolio", "Real Experience", "Apply & Improve"],
	};

	const timelines = ["Month 1", "Month 2-3", "Month 4-5", "Month 6-7", "Month 8-9", "Month 10-12"];
	const labels = trackSteps[track] || trackSteps.general;

	return {
		...fallbackRoadmap,
		career: safeCareer,
		skills,
		steps: labels.map((title, index) => ({
			title,
			description: `Focused step for ${safeCareer} based on your profile skills: ${skills.slice(0, 3).join(", ") || "foundation learning"}.`,
			timeline: timelines[index] || `Phase ${index + 1}`,
			resources: [
				{ title: `${safeCareer} roadmap`, type: "docs", link: "https://roadmap.sh" },
				{ title: `${safeCareer} practice`, type: "practice", link: "https://www.coursera.org" },
			],
		})),
	};
}

const fallbackAlerts = [
	{
		id: 1,
		type: "admission",
		title: "IIT Admissions Round 1",
		description: "Admission notifications and important dates for eligible candidates.",
		eligibility: "Class 12 students",
		deadline: "2026-04-18",
		deadline_display: "2026-04-18",
		link: "https://www.jee.gov.in/",
		source: "Official admissions portal",
		detail_points: [
			"Category: Admission",
			"Eligibility: Class 12 students",
			"Deadline: 2026-04-18",
			"Source: Official admissions portal",
		],
		requirements: [
			"Class 12 qualification as per notice",
			"Government ID and academic documents",
			"Read official instructions before submission",
		],
		application_steps: [
			"Visit official portal",
			"Complete registration and form details",
			"Upload documents and submit before deadline",
		],
		official_note: "Verify all criteria and timelines on the official portal before applying.",
	},
	{
		id: 2,
		type: "scholarship",
		title: "National Scholarship Portal Deadline",
		description: "Check official eligibility and apply before the closing date.",
		eligibility: "Class 10, Class 12, UG and PG students",
		deadline: "2026-03-30",
		deadline_display: "2026-03-30",
		link: "https://scholarships.gov.in/",
		source: "National Scholarship Portal",
		detail_points: [
			"Category: Scholarship",
			"Eligibility: Class 10, Class 12, UG and PG students",
			"Deadline: 2026-03-30",
			"Source: National Scholarship Portal",
		],
		requirements: [
			"Match scholarship scheme eligibility criteria",
			"Valid institute and identity proof",
			"Income and category documents where required",
		],
		application_steps: [
			"Sign in to scholarship portal",
			"Choose relevant scheme and verify eligibility",
			"Submit application and keep acknowledgement",
		],
		official_note: "Use only official scholarship portal links for submission.",
	},
	{
		id: 3,
		type: "exam",
		title: "CUET Registration Closes",
		description: "Exam registration notice with eligibility guidelines and application details.",
		eligibility: "Class 12 students",
		deadline: "2026-04-10",
		deadline_display: "2026-04-10",
		link: "https://cuet.nta.nic.in/",
		source: "NTA",
		detail_points: [
			"Category: Exam",
			"Eligibility: Class 12 students",
			"Deadline: 2026-04-10",
			"Source: NTA",
		],
		requirements: [
			"Check CUET eligibility rules",
			"Keep mark sheets and ID ready",
			"Review exam pattern and official syllabus",
		],
		application_steps: [
			"Open CUET official portal",
			"Complete registration and exam preferences",
			"Pay fee and submit final form",
		],
		official_note: "Refer to NTA official notifications for latest updates.",
	},
];

export async function submitQuickTestAnswers(payload) {
	const response = await api.post("/test/quick/submit/", payload);
	return getApiData(response);
}

export async function getCareerRecommendations(options = {}) {
	const { useFallback = true } = options;
	try {
		const response = await api.get("/predict/");
		return getApiData(response);
	} catch {
		if (!useFallback) {
			throw new Error("Unable to load recommendations");
		}
		const currentUser = getCurrentUser() || {};
		return { recommendations: buildPersonalizedFallbackRecommendations(currentUser) };
	}
}

export async function getCareerRoadmap(career) {
	try {
		const response = await api.get("/roadmap/", { params: { career } });
		return getApiData(response);
	} catch {
		const currentUser = getCurrentUser() || {};
		return buildCareerSpecificFallbackRoadmap(career, currentUser);
	}
}

export async function getAlerts(params = { page: 1, page_size: 10 }, options = {}) {
	const { useFallback = true } = options;
	try {
		const response = await api.get("/alerts/", { params });
		const data = getApiData(response);
		return {
			...data,
			alerts: Array.isArray(data?.results) ? data.results : [],
		};
	} catch {
		if (!useFallback) {
			throw new Error("Unable to load alerts");
		}
		return {
			results: fallbackAlerts,
			alerts: fallbackAlerts,
			page: 1,
			page_size: fallbackAlerts.length,
			total_pages: 1,
			total_count: fallbackAlerts.length,
			recommended: fallbackAlerts.slice(0, 3),
			cached: false,
		};
	}
}

export async function getDashboardSummary(options = {}) {
	const { useFallback = true } = options;
	try {
		const response = await api.get("/dashboard/");
		return getApiData(response);
	} catch {
		if (!useFallback) {
			throw new Error("Unable to load dashboard summary");
		}
		return {
			top_career: fallbackRecommendations[0]
				? {
					title: fallbackRecommendations[0].title,
					reason: fallbackRecommendations[0].description,
					requiredSkills: fallbackRecommendations[0].requiredSkills || [],
				}
				: null,
			skill_gap: {
				have_skills: [],
				missing_skills: fallbackRecommendations[0]?.requiredSkills?.slice(0, 2) || [],
			},
			top_alerts: (fallbackAlerts || []).slice(0, 3).map((item) => ({
				id: item.id,
				title: item.title,
				type: item.type,
				deadline: item.deadline,
				deadline_display: item.deadline_display || item.deadline || "To be announced",
				link: item.link,
			})),
			progress: {
				completed_steps: 1,
				total_steps: 5,
				label: "Step 1 of 5 completed",
			},
			stats: {
				profile_completion_percent: 40,
				quick_test_attempted: false,
				career_discovered: true,
			},
		};
	}
}
