import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { getQuickTest } from "../services/testService";

const actionCards = [
	{
		title: "Take Quick Test",
		description: "Discover strengths with a structured career quick assessment.",
		path: "/quick-test",
		key: "test",
	},
	{
		title: "View Recommendations",
		description: "See personalized top career options based on your profile.",
		path: "/recommendations",
		key: "recommendations",
	},
	{
		title: "College Finder",
		description: "Explore colleges by location, course, and fees.",
		path: "/college-finder",
		key: "college",
	},
	{
		title: "Alerts",
		description: "Track deadlines, scholarships, and upcoming entrance exams.",
		path: "/alerts",
		key: "alerts",
	},
	{
		title: "CV Analysis",
		description: "Upload your CV and get skill-gap insights and career suggestions.",
		path: "/cv-upload",
		onlyGraduate: true,
		key: "cv",
	},
];

const statCards = [
	{
		emoji: "📝",
		label: "Profile Status",
		value: "In Progress",
		color: "from-blue-500 to-cyan-400",
	},
	{
		emoji: "✅",
		label: "Quick Test",
		value: "Ready to Start",
		color: "from-emerald-500 to-teal-400",
		key: "test",
	},
	{
		emoji: "🎯",
		label: "Career Path",
		value: "Discover Now",
		color: "from-purple-500 to-indigo-400",
	},
];

function Dashboard() {
	const [hasCompletedQuickTest, setHasCompletedQuickTest] = useState(false);

	useEffect(() => {
		let mounted = true;

		const loadQuickTestStatus = async () => {
			try {
				const quickTestData = await getQuickTest();
				if (!mounted) {
					return;
				}
				setHasCompletedQuickTest(Boolean(quickTestData?.attempted));
			} catch {
				if (mounted) {
					setHasCompletedQuickTest(false);
				}
			}
		};

		loadQuickTestStatus();

		return () => {
			mounted = false;
		};
	}, []);

	const user = getCurrentUser();
	const userName = user?.name || "Student";
	const educationLevel = user?.educationLevel || "Class 12";
	const isGraduate = educationLevel === "Graduate";

	const testAction = hasCompletedQuickTest
		? {
			title: "Take Skill Test",
			description: "Choose your skill and continue with the timed skill assessment.",
			path: "/quick-test",
			key: "test",
		}
		: actionCards[0];

	const visibleCards = [testAction, ...actionCards.slice(1)].filter(
		(card) => !card.onlyGraduate || isGraduate
	);

	const visibleStatCards = statCards.map((card) => {
		if (card.key !== "test") {
			return card;
		}

		return {
			...card,
			label: hasCompletedQuickTest ? "Skill Test" : "Quick Test",
			value: hasCompletedQuickTest ? "Ready to Start" : "Ready to Start",
		};
	});

	return (
		<div className="space-y-8">
			{/* Header: Welcome Section with gradient background */}
			<section className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-8 sm:p-10 text-white shadow-xl">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
				
				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Welcome back</p>
					<h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">Hi, {userName} 👋</h1>
					<p className="mt-3 text-lg text-indigo-100">
						Let's continue your journey to discover your perfect career path
					</p>

					{/* Quick stats under header */}
					<div className="mt-8 grid gap-3 sm:grid-cols-3">
						<div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2 text-sm">
							<p className="text-indigo-200">Education Level</p>
							<p className="font-semibold">{educationLevel}</p>
						</div>
						<div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2 text-sm">
							<p className="text-indigo-200">Account Status</p>
							<p className="font-semibold">Active ✓</p>
						</div>
						<div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2 text-sm">
							<p className="text-indigo-200">Progress</p>
							<p className="font-semibold">Getting Started</p>
						</div>
					</div>
				</div>
			</section>

			{/* Stat Cards Section */}
			<section className="cc-fade-in" style={{ animationDelay: "100ms" }}>
				<div className="grid gap-4 sm:grid-cols-3">
					{visibleStatCards.map((stat, index) => (
						<div
							key={stat.label}
							className="cc-fade-in group rounded-2xl bg-gradient-to-br p-6 shadow-lg ring-1 ring-white/20 transition hover:shadow-xl hover:ring-white/30"
							style={{
								backgroundImage: `linear-gradient(135deg, var(--stat-start), var(--stat-end))`,
								"--stat-start": `rgba(${stat.color === "from-blue-500 to-cyan-400" ? "59, 130, 246" : stat.color === "from-emerald-500 to-teal-400" ? "16, 185, 129" : "168, 85, 247"}, 0.1)`,
								"--stat-end": `rgba(${stat.color === "from-blue-500 to-cyan-400" ? "34, 211, 238" : stat.color === "from-emerald-500 to-teal-400" ? "20, 184, 166" : "99, 102, 241"}, 0.05)`,
								animationDelay: `${index * 50}ms`,
							}}
						>
							<div className="text-4xl mb-2">{stat.emoji}</div>
							<p className="text-sm font-semibold text-slate-600">{stat.label}</p>
							<p className="mt-2 text-2xl font-extrabold bg-gradient-to-r p-0.5 bg-clip-text text-transparent" style={{
								backgroundImage: `linear-gradient(135deg, ${stat.color === "from-blue-500 to-cyan-400" ? "#3b82f6, #06b6d4" : stat.color === "from-emerald-500 to-teal-400" ? "#10b981, #14b8a6" : "#a855f7, #6366f1"})`
							}}>
								{stat.value}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* Quick Actions Section */}
			<section className="cc-fade-in" style={{ animationDelay: "150ms" }}>
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-extrabold text-slate-900">Quick Actions</h2>
						<p className="mt-1 text-sm text-slate-600">Choose where to go next in your career journey</p>
					</div>
				</div>

				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{visibleCards.map((card, index) => {
						// Emoji mapping for action cards
						const emojiMap = {
							"Take Quick Test": "🧠",
							"Take Skill Test": "🧠",
							"View Recommendations": "🎯",
							"College Finder": "🏫",
							"Alerts": "🔔",
							"CV Analysis": "📄",
						};

						return (
							<Link
								key={card.title}
								to={card.path}
								className="cc-fade-in group rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-md ring-1 ring-slate-200 transition duration-300 hover:-translate-y-2 hover:shadow-xl hover:ring-indigo-300"
								style={{
									animationDelay: `${200 + index * 75}ms`,
								}}
							>
								<div className="text-4xl mb-3">{emojiMap[card.title]}</div>
								<h3 className="text-base font-bold text-slate-900 transition group-hover:text-indigo-600">
									{card.title}
								</h3>
								<p className="mt-2 text-sm text-slate-600">{card.description}</p>
								<div className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 transition group-hover:gap-3">
									<span>Explore</span>
									<span>→</span>
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			{/* CTA Section */}
			<section className="cc-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white shadow-lg" style={{ animationDelay: "400ms" }}>
				<div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
				<h3 className="relative text-2xl font-extrabold">Need guidance?</h3>
				<p className="relative mt-2 text-indigo-100">
					Chat with our AI career advisor to get personalized insights
				</p>
				<Link
					to="/cv-upload"
					className="relative mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50"
				>
					Start Chatting
				</Link>
			</section>
		</div>
	);
}

export default Dashboard;
