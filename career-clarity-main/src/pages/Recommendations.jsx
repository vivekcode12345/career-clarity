import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loader from "../components/Loader";
import { getCareerRecommendations } from "../services/careerService";
import { getCurrentUser } from "../services/authService";
import { openChatbot } from "../services/chatbotService";

function Recommendations() {
	const [careers, setCareers] = useState([]);
	const [ability, setAbility] = useState("");
	const [interest, setInterest] = useState("");
	const [skills, setSkills] = useState([]);
	const [skillTest, setSkillTest] = useState(null);
	const [skillHistory, setSkillHistory] = useState([]);
	const [savedRoadmapTitles, setSavedRoadmapTitles] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		const loadRecommendations = async () => {
			setIsLoading(true);
			setErrorMessage("");

			try {
				const data = await getCareerRecommendations();
				const rawRecommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
				const normalizedCareers = rawRecommendations
					.map((item) => {
						if (typeof item === "string") {
							return {
								title: item,
								description: "Recommended based on your quick test profile and learning direction.",
							};
						}

						if (item && typeof item === "object") {
							return {
								title: item.title || item.name || item.career || "Career Path",
								description: item.description || "Recommended based on your quick test profile and learning direction.",
								requiredSkills: item.requiredSkills || item.skills || [],
								salaryRange: item.salaryRange || item.salary || "",
							};
						}

						return null;
					})
					.filter(Boolean);

				setCareers(normalizedCareers);
				const currentUser = getCurrentUser() || {};
				setAbility(data.ability || currentUser.ability || currentUser.abilityLevel || "N/A");
				setInterest(data.interest || currentUser.interest || currentUser.interests?.[0] || "N/A");
				setSkills(data.skills || currentUser.skills || []);
				setSkillTest(data?.skillTest || null);
				setSkillHistory(Array.isArray(data?.skillHistory) ? data.skillHistory : []);
				setSavedRoadmapTitles(
					Array.isArray(data.savedRoadmaps)
						? data.savedRoadmaps.map((item) => item?.career_title).filter(Boolean)
						: []
				);
			} catch (err) {
				console.error(err);
				setErrorMessage("Unable to load recommendations right now.");
			} finally {
				setIsLoading(false);
			}
		};

		loadRecommendations();
	}, []);

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-lg">
				<Loader label="Generating personalized recommendations..." />
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="cc-fade-in rounded-2xl border border-indigo-200 bg-indigo-50 p-5" style={{ animationDelay: "80ms" }}>
				<p className="text-sm font-semibold text-indigo-700">Advanced Prediction</p>
					<p className="mt-1 text-slate-700">Take a skill test to unlock deeper and more accurate career options.</p>
				<Link
					to="/quick-test"
					className="mt-3 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
				>
					Go to Skill Test →
				</Link>
			</div>

			{/* Header Card */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-emerald-100">AI-Powered Insights</p>
					<h1 className="mt-2 text-4xl font-extrabold">Your Career Path 🎯</h1>
					<p className="mt-3 text-lg text-emerald-100">
						Discover career opportunities tailored to your profile and abilities
					</p>
				</div>
			</div>

			{/* Insights Cards */}
			<div className="cc-fade-in grid gap-4 lg:grid-cols-4 sm:grid-cols-2" style={{ animationDelay: "100ms" }}>
				{/* Ability Card */}
				<div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-md ring-1 ring-blue-200">
					<div className="text-3xl mb-2">💪</div>
					<p className="text-sm font-semibold text-slate-600 uppercase">Your Ability</p>
					<p className="mt-3 text-xl font-bold text-blue-600">{ability || "N/A"}</p>
				</div>

				{/* Interest Card */}
				<div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-md ring-1 ring-purple-200">
					<div className="text-3xl mb-2">⚡</div>
					<p className="text-sm font-semibold text-slate-600 uppercase">Your Interest</p>
					<p className="mt-3 text-xl font-bold text-purple-600">{interest || "N/A"}</p>
				</div>

				{/* Skills Card */}
				<div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-md ring-1 ring-emerald-200">
					<div className="text-3xl mb-2">🎓</div>
					<p className="text-sm font-semibold text-slate-600 uppercase">Your Skills</p>
					<div className="mt-3 text-sm font-semibold text-emerald-600">
						{skills.length > 0 ? (
							<div className="flex flex-wrap gap-2">
								{skills.map((skill, i) => (
									<span key={i} className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs">
										{skill}
									</span>
								))}
							</div>
						) : (
							"N/A"
						)}
					</div>
				</div>

				{/* Skill Test Card */}
				<div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md ring-1 ring-amber-200">
					<div className="text-3xl mb-2">🧠</div>
					<p className="text-sm font-semibold text-slate-600 uppercase">Skill Test History</p>
					{skillHistory.length > 0 ? (
						<div className="mt-3 space-y-3">
							{skillTest?.skill && (
								<div className="rounded-lg bg-white/80 p-3 shadow-sm ring-1 ring-amber-100">
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Test</p>
									<p className="font-bold text-amber-700">{skillTest.skill}</p>
									<p className="text-sm text-slate-700">Level: {skillTest.level || "N/A"}</p>
									<p className="text-sm text-slate-700">
										Score: {skillTest.score ?? "N/A"}
										{typeof skillTest.total === "number" ? ` / ${skillTest.total}` : ""}
									</p>
								</div>
							)}

							<div className="max-h-44 space-y-2 overflow-y-auto pr-1">
								{skillHistory.map((item, index) => (
									<div key={`${item.skill || "skill"}-${index}`} className="rounded-lg bg-white/70 p-3 text-sm shadow-sm ring-1 ring-amber-100">
										<div className="flex items-center justify-between gap-2">
											<p className="font-semibold text-slate-800">{item.skill || "Unknown Skill"}</p>
											<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
												{item.level || "N/A"}
											</span>
										</div>
										<p className="mt-1 text-slate-600">
											Score: {item.score ?? "N/A"}
											{typeof item.total === "number" ? ` / ${item.total}` : ""}
										</p>
									</div>
								))}
							</div>
						</div>
					) : skillTest?.skill ? (
						<div className="mt-3 space-y-1 text-sm text-slate-700">
							<p className="font-bold text-amber-700">{skillTest.skill}</p>
							<p>Level: {skillTest.level || "N/A"}</p>
							<p>
								Score: {skillTest.score ?? "N/A"}
								{typeof skillTest.total === "number" ? ` / ${skillTest.total}` : ""}
							</p>
						</div>
					) : (
						<p className="mt-3 text-sm text-slate-600">No skill test yet</p>
					)}
				</div>
			</div>

			{/* Recommended Careers Section */}
			<div>
				<h2 className="cc-fade-in text-2xl font-extrabold text-slate-900 mb-6" style={{ animationDelay: "150ms" }}>
					🌟 Career Options
				</h2>

				{errorMessage && (
					<div className="cc-fade-in rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" style={{ animationDelay: "200ms" }}>
						⚠️ {errorMessage}
					</div>
				)}

				<div className="grid gap-6 lg:grid-cols-3">
					{careers.length > 0 ? (
						careers.map((career, index) => (
							<div
								key={`${career.title}-${index}`}
								className="cc-fade-in rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-md ring-1 ring-slate-100 transition hover:-translate-y-2 hover:border-indigo-300 hover:shadow-lg"
								style={{ animationDelay: `${250 + index * 75}ms` }}
							>
								<div className="flex items-start justify-between">
									<h3 className="text-xl font-bold text-slate-900">{career.title}</h3>
									<div className="flex items-center gap-2">
										{savedRoadmapTitles.includes(career.title) && (
											<span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
												Saved
											</span>
										)}
										<span className="text-3xl">{["💼", "🚀", "📊"][index % 3]}</span>
									</div>
								</div>

								<p className="mt-4 text-sm text-slate-600">
									{career.description || "A rewarding career path based on your profile"}
								</p>

								{career.roadmapFocus && (
									<div className="mt-4 rounded-lg bg-slate-50 p-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Roadmap Focus</p>
										<p className="mt-1 text-sm text-slate-700">{career.roadmapFocus}</p>
									</div>
								)}

								{/* Skills */}
								{career.requiredSkills && (
									<div className="mt-4 space-y-2">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Required Skills</p>
										<div className="flex flex-wrap gap-2">
											{(Array.isArray(career.requiredSkills) ? career.requiredSkills : [career.requiredSkills]).map((skill, i) => (
												<span key={i} className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
													{skill}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Salary Range */}
								{career.salaryRange && (
									<div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
										<span className="text-2xl">💰</span>
										<div>
											<p className="text-xs font-semibold text-slate-600">Expected Salary</p>
											<p className="font-bold text-emerald-700">{career.salaryRange}</p>
										</div>
									</div>
								)}

								{/* CTA */}
								<Link
									to={`/roadmap?career=${encodeURIComponent(career.title)}`}
									className="mt-6 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition hover:shadow-lg hover:from-indigo-700 hover:to-purple-700"
								>
									View Roadmap →
								</Link>
							</div>
						))
					) : (
						<div className="cc-fade-in col-span-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 text-center">
							<p className="text-lg font-medium text-amber-900">
								📊 Complete the quick test to get personalized recommendations
							</p>
						</div>
					)}
				</div>
			</div>

			{/* CTA Section */}
			<div className="cc-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white shadow-lg" style={{ animationDelay: "400ms" }}>
				<div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
				<h3 className="relative text-2xl font-extrabold">Ready to explore your path?</h3>
				<p className="relative mt-2 text-indigo-100">
					Chat with our AI career advisor for personalized guidance
				</p>
				<button
					type="button"
					onClick={() => openChatbot("Help me understand which career path fits me best.")}
					className="relative mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50"
				>
					Start Chat
				</button>
			</div>
		</div>
	);
}

export default Recommendations;