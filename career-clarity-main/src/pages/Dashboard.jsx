import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import { getCurrentUser } from "../services/authService";
import { openChatbot } from "../services/chatbotService";
import { getDashboardSummary } from "../services/careerService";

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
		value: "0%",
		color: "from-blue-500 to-cyan-400",
		key: "profile",
	},
	{
		emoji: "✅",
		label: "Quick Test",
		value: "Not Attempted",
		color: "from-emerald-500 to-teal-400",
		key: "test",
	},
	{
		emoji: "🎯",
		label: "Career Path",
		value: "Not Discovered",
		color: "from-purple-500 to-indigo-400",
		key: "career",
	},
];

function Dashboard() {
	const user = getCurrentUser();
	const userName = user?.name || "Student";
	const educationLevel = user?.educationLevel || "Class 12";
	const isGraduate = educationLevel === "Graduate";
	const [isLoading, setIsLoading] = useState(true);
	const [quickTestAttempted, setQuickTestAttempted] = useState(false);
	const [dashboardSummary, setDashboardSummary] = useState({
		top_career: null,
		skill_gap: null,
		top_alerts: [],
		progress: { completed_steps: 0, total_steps: 5, label: "Step 0 of 5 completed" },
		stats: {
			profile_completion_percent: 0,
			quick_test_attempted: false,
			career_discovered: false,
			has_profile_data: false,
			has_interest_data: false,
			has_skill_data: false,
			has_personalization_signal: false,
		},
	});

	useEffect(() => {
		const loadDashboardData = async () => {
			setIsLoading(true);
			try {
				const data = await getDashboardSummary({ useFallback: false });
				setDashboardSummary({
					top_career: data?.top_career || null,
					skill_gap: data?.skill_gap || null,
					top_alerts: Array.isArray(data?.top_alerts) ? data.top_alerts : [],
					progress: data?.progress || { completed_steps: 0, total_steps: 5, label: "Step 0 of 5 completed" },
					stats: data?.stats || {
						profile_completion_percent: 0,
						quick_test_attempted: false,
						career_discovered: false,
						has_profile_data: false,
						has_interest_data: false,
						has_skill_data: false,
						has_personalization_signal: false,
					},
				});
				setQuickTestAttempted(Boolean(data?.stats?.quick_test_attempted));
			} catch {
				setQuickTestAttempted(false);
				setDashboardSummary((prev) => ({
					...prev,
					top_career: null,
					skill_gap: null,
					top_alerts: [],
					progress: { completed_steps: 0, total_steps: 5, label: "Step 0 of 5 completed" },
					stats: {
						profile_completion_percent: 0,
						quick_test_attempted: false,
						career_discovered: false,
						has_profile_data: false,
						has_interest_data: false,
						has_skill_data: false,
						has_personalization_signal: false,
					},
				}));
			} finally {
				setIsLoading(false);
			}
		};

		loadDashboardData();
	}, [user?.username, user?.name]);

	const testAction = quickTestAttempted
		? {
			...actionCards[0],
			title: "Take Skill Test",
			description: "Continue with a skill assessment for deeper predictions.",
		}
		: actionCards[0];

	const visibleCards = [testAction, ...actionCards.slice(1)].filter(
		(card) => !card.onlyGraduate || isGraduate
	);

	const hasProfileData = Boolean(dashboardSummary?.stats?.has_profile_data);
	const hasPersonalizationSignal = Boolean(dashboardSummary?.stats?.has_personalization_signal);
	const hasSkillData = Boolean(dashboardSummary?.stats?.has_skill_data);
	const hasRecommendation = Boolean(dashboardSummary?.top_career?.title);

	const visibleStatCards = statCards.map((card) => {
		if (card.key === "profile") {
			return {
				...card,
				label: "Profile Completion",
				value: `${dashboardSummary?.stats?.profile_completion_percent || 0}%`,
			};
		}

		if (card.key === "test") {
			return {
				...card,
				label: quickTestAttempted ? "Skill Test" : "Quick Test",
				value: quickTestAttempted ? "Attempted" : "Not Attempted",
			};
		}

		if (card.key === "career") {
			return {
				...card,
				label: "Career Path",
				value: dashboardSummary?.top_career?.title || "Not Discovered",
			};
		}

		return card;
	});

	if (isLoading) {
		return (
			<div className="space-y-8">
				<section className="cc-card p-8 sm:p-10">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="mt-4 h-12 w-2/3" />
					<Skeleton className="mt-3 h-5 w-1/2" />
					<div className="mt-8 grid gap-3 sm:grid-cols-3">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				</section>
				<div className="grid gap-4 sm:grid-cols-3">
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
				<div className="grid gap-4 lg:grid-cols-3">
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{!hasProfileData && (
				<EmptyState
					message="Complete your profile to unlock personalized recommendations"
					className="cc-fade-in border-indigo-200 bg-indigo-50 text-indigo-700"
				/>
			)}

			{hasProfileData && !quickTestAttempted && (
				<EmptyState
					message="Take the quick test to discover your career path"
					className="cc-fade-in border-amber-200 bg-amber-50 text-amber-700"
				/>
			)}

			{hasPersonalizationSignal && !hasRecommendation && (
				<EmptyState
					message="No recommendations available yet. Complete your profile and test."
					className="cc-fade-in border-rose-200 bg-rose-50 text-rose-700"
				/>
			)}

			{/* Header: Welcome Section with gradient background */}
			<section className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-8 sm:p-10 text-white shadow-xl">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
				
				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Welcome back</p>
					<h1 className="cc-h1 mt-2">Hi, {userName} 👋</h1>
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
							className="cc-fade-in group rounded-2xl bg-gradient-to-br p-6 shadow-lg ring-1 ring-white/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-white/30"
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

			{/* Smart Insights Section */}
			<section className="cc-fade-in" style={{ animationDelay: "130ms" }}>
				<div className="grid gap-4 lg:grid-cols-3">
					<div className="cc-card p-5">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">🎯 Top Career Recommendation</p>
						{hasRecommendation ? (
							<>
								<p className="mt-2 text-lg font-bold text-slate-900">{dashboardSummary?.top_career?.title}</p>
								<p className="mt-1 text-sm text-slate-600 line-clamp-3">{dashboardSummary?.top_career?.reason}</p>
							</>
						) : (
							<p className="mt-2 text-sm text-slate-600">No top career recommendation available yet.</p>
						)}
					</div>

					<div className="cc-card p-5">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">⚠️ Skill Gap Snapshot</p>
						{!hasSkillData ? (
							<p className="mt-2 text-sm text-slate-600">No skill data available. Upload CV or take skill test.</p>
						) : Array.isArray(dashboardSummary?.skill_gap?.missing_skills) && dashboardSummary.skill_gap.missing_skills.length > 0 ? (
							<ul className="mt-2 space-y-1 text-sm text-slate-700">
								{dashboardSummary.skill_gap.missing_skills.slice(0, 4).map((skill) => (
									<li key={skill}>• {skill}</li>
								))}
							</ul>
						) : (
							<p className="mt-2 text-sm text-slate-600">No critical missing skills identified yet.</p>
						)}
					</div>

					<div className="cc-card p-5">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">🔔 Top Opportunities</p>
						{hasPersonalizationSignal && dashboardSummary?.top_alerts?.length > 0 ? (
							<div className="mt-2 space-y-2 text-sm text-slate-700">
								{dashboardSummary.top_alerts.slice(0, 3).map((alert) => (
									<div key={alert.id || `${alert.title}-${alert.type}`} className="rounded-lg bg-slate-50 p-2">
										<p className="font-semibold text-slate-900 line-clamp-1">{alert.title}</p>
										<p className="text-xs text-slate-600">Deadline: {alert.deadline_display || alert.deadline || "To be announced"}</p>
									</div>
								))}
							</div>
						) : (
							<p className="mt-2 text-sm text-slate-600">No personalized opportunities found yet. Complete profile and test to unlock them.</p>
						)}
					</div>
				</div>

				<div className="cc-card mt-4 p-5">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">🛤️ Progress Indicator</p>
					<p className="mt-2 text-sm font-semibold text-slate-900">
						{dashboardSummary?.progress?.label || "Step 0 of 5 completed"}
					</p>
					<div className="mt-3 h-2 w-full rounded-full bg-slate-200">
						<div
							className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
							style={{
								width: `${Math.max(
									0,
									Math.min(
										100,
										((dashboardSummary?.progress?.completed_steps || 0) / (dashboardSummary?.progress?.total_steps || 5)) * 100
									)
								)}%`,
							}}
						/>
					</div>
				</div>
			</section>

			{/* Quick Actions Section */}
			<section className="cc-fade-in" style={{ animationDelay: "150ms" }}>
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h2 className="cc-h2 text-slate-900">Quick Actions</h2>
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
								className="cc-fade-in cc-card group bg-white/90 backdrop-blur-sm"
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
				<button
					type="button"
					onClick={() => openChatbot("I need guidance on my next career step.")}
					className="cc-btn-secondary relative mt-6 border-white bg-white px-6 py-3 text-indigo-600 hover:bg-indigo-50"
				>
					Start Chatting
				</button>
			</section>
		</div>
	);
}

export default Dashboard;
