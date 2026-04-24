import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loader from "../components/Loader";
import LoadingModal from "../components/LoadingModal";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import { getCareerRecommendations } from "../services/careerService";
import { getCurrentUser } from "../services/authService";
import { openChatbot } from "../services/chatbotService";
import { getProfile } from "../services/profileService";
import { hasUploadedCV } from "../services/resumeService";
import { getQuickTest } from "../services/testService";

function Recommendations() {
	const getShortText = (value, max = 110) => {
		const text = String(value || "").trim();
		if (!text) return "";
		if (text.length <= max) return text;
		return `${text.slice(0, max).trim()}...`;
	};

	const [careers, setCareers] = useState([]);
	const [ability, setAbility] = useState("");
	const [interest, setInterest] = useState("");
	const [skills, setSkills] = useState([]);
	const [skillTest, setSkillTest] = useState(null);
	const [skillHistory, setSkillHistory] = useState([]);
	const [savedRoadmapTitles, setSavedRoadmapTitles] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [blockedMessage, setBlockedMessage] = useState("");
	const [showCvHint, setShowCvHint] = useState(false);
	const hasUserSkillData = skills.length > 0 || skillHistory.length > 0 || Boolean(skillTest?.skill);

	useEffect(() => {
		const loadRecommendations = async () => {
			setIsLoading(true);
			setErrorMessage("");
			setBlockedMessage("");

			try {
				const [profileData, quickTestStatus, cvUploaded] = await Promise.all([
					getProfile(),
					getQuickTest(),
					hasUploadedCV().catch(() => false),
				]);

				const profileSkills = Array.isArray(profileData?.skills) ? profileData.skills : [];
				const hasSkillSignal = cvUploaded || profileSkills.length > 0;
				if (!hasSkillSignal) {
					setBlockedMessage("Upload your CV/marks card or add profile skills to unlock recommendations");
					setCareers([]);
					return;
				}

				const quickTestAttempted = Boolean(quickTestStatus?.attempted);
				if (!quickTestAttempted) {
					setBlockedMessage("Take the quick test to discover your career path");
					setCareers([]);
					return;
				}

				setShowCvHint(!cvUploaded);

				const data = await getCareerRecommendations({ useFallback: false });
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
								description: item.description || item.reason || "Recommended based on your quick test profile and learning direction.",
								nextStep: item.nextStep || item.next_step || "",
								requiredSkills: item.requiredSkills || item.skills || [],
								salaryRange: item.salaryRange || item.salary || "",
								timeline: item.timeline && typeof item.timeline === "object" ? item.timeline : null,
								skillGap:
									item.skill_gap && typeof item.skill_gap === "object"
										? {
											haveSkills: Array.isArray(item.skill_gap.have_skills) ? item.skill_gap.have_skills : [],
											missingSkills: Array.isArray(item.skill_gap.missing_skills) ? item.skill_gap.missing_skills : [],
									  }
									: null,
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
		return <LoadingModal isOpen={true} label="Analyzing your profile and fetching career recommendations..." />;
	}

	if (blockedMessage) {
		return (
			<EmptyState
				message={blockedMessage}
				className="border-amber-200 bg-amber-50 text-amber-900"
				icon="🚫"
			/>
		);
	}

	return (
		<div className="space-y-8">
			{showCvHint && (
				<EmptyState
					message="Upload your CV to improve skill-based recommendations"
					className="cc-fade-in border-indigo-200 bg-indigo-50 text-indigo-700"
					icon="📄"
				/>
			)}

			<div className="cc-fade-in cc-card border-indigo-200 bg-indigo-50 p-5" style={{ animationDelay: "80ms" }}>
				<p className="text-sm font-semibold text-indigo-700">Advanced Prediction</p>
					<p className="mt-1 text-slate-700">Take a skill test to unlock deeper and more accurate career options.</p>
				<Link
					to="/quick-test"
					className="cc-btn-primary mt-3 px-4 py-2"
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
					<h1 className="cc-h1 mt-2">Your Career Path 🎯</h1>
					<p className="mt-3 text-lg text-emerald-100">
						Discover career opportunities tailored to your profile and abilities
					</p>
				</div>
			</div>

			{/* Insights Cards */}
			<div className="cc-fade-in grid gap-4 lg:grid-cols-4 sm:grid-cols-2" style={{ animationDelay: "100ms" }}>
				{/* Ability Card */}
				<div className="cc-card bg-gradient-to-br from-blue-50 to-cyan-50 p-6 ring-blue-200">
					<div className="text-3xl mb-2">💪</div>
					<p className="text-sm font-semibold text-slate-600 uppercase">Your Ability</p>
					<p className="mt-3 text-xl font-bold text-blue-600">{ability || "N/A"}</p>
				</div>

				{/* Interest Card */}
				<div className="cc-card bg-gradient-to-br from-purple-50 to-pink-50 p-6 ring-purple-200">
					<div className="text-3xl mb-2">⚡</div>
					<p className="text-sm font-semibold text-slate-600 uppercase">Your Interest</p>
					<p className="mt-3 text-xl font-bold text-purple-600">{interest || "N/A"}</p>
				</div>

				{/* Skills Card */}
				<div className="cc-card bg-gradient-to-br from-emerald-50 to-teal-50 p-6 ring-emerald-200">
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
				<div className="cc-card bg-gradient-to-br from-amber-50 to-orange-50 p-6 ring-amber-200">
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
				<h2 className="cc-fade-in cc-h2 mb-6 text-slate-900" style={{ animationDelay: "150ms" }}>
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
								className="cc-fade-in cc-card border-2 border-slate-200"
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
									{getShortText(career.description || "A rewarding career path based on your profile", 95)}
								</p>

								{career.nextStep && (
									<div className="mt-3 rounded-lg bg-blue-50 p-2.5">
										<p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next Step</p>
										<p className="mt-1 text-xs text-slate-700">{getShortText(career.nextStep, 75)}</p>
									</div>
								)}

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

								{career.skillGap && (() => {
									const haveSkills = Array.isArray(career.skillGap.haveSkills) ? career.skillGap.haveSkills : [];
									const missingSkills = Array.isArray(career.skillGap.missingSkills) ? career.skillGap.missingSkills : [];
									const hasGapData = haveSkills.length > 0 || missingSkills.length > 0;

									if (!hasUserSkillData) {
										return (
											<div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
												<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">🎯 Skill Gap</p>
												<p className="mt-2 text-xs text-slate-600">No skill data available. Upload CV or take skill test.</p>
											</div>
										);
									}

									if (!hasGapData) {
										return null;
									}

									return (
									<div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">🎯 Skill Gap</p>
											<div className="mt-2 space-y-2 text-xs text-slate-700">
												{haveSkills.length > 0 && (
													<div>
														<p className="font-semibold text-emerald-700">✅ You have:</p>
														<p className="mt-0.5">{haveSkills.slice(0, 4).join(", ")}</p>
													</div>
												)}
												{missingSkills.length > 0 && (
													<div>
														<p className="font-semibold text-rose-700">❌ You need:</p>
														<p className="mt-0.5">{missingSkills.slice(0, 4).join(", ")}</p>
													</div>
												)}
											</div>
									</div>
									);
								})()}

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

								{career.timeline?.duration && (
									<div className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-50 p-3">
										<span className="text-xl">📅</span>
										<div>
											<p className="text-xs font-semibold text-slate-600">Estimated Timeline</p>
											<p className="font-bold text-indigo-700">{career.timeline.duration}</p>
											<p className="text-[11px] text-indigo-600">{career.timeline.stage}</p>
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
						<EmptyState
							message="No career recommendations found. Try updating your profile or retaking the test."
							className="cc-fade-in col-span-full border-amber-200 bg-amber-50 text-amber-900"
							icon="🧭"
						/>
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
					className="cc-btn-secondary relative mt-6 border-white bg-white px-8 py-3 text-indigo-600 hover:bg-indigo-50"
				>
					Start Chat
				</button>
			</div>
		</div>
	);
}

export default Recommendations;