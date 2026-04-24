import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import LoadingModal from "../components/LoadingModal";
import EmptyState from "../components/EmptyState";
import AlertDetailsModal from "../components/AlertDetailsModal";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import { getAlerts } from "../services/careerService";
import { getProfile } from "../services/profileService";
import { hasUploadedCV } from "../services/resumeService";
import { getQuickTest } from "../services/testService";

const PAGE_SIZE = 10;

const typeConfig = {
	scholarship: { emoji: "💰", accent: "border-emerald-200 bg-emerald-50 text-emerald-700" },
	internship: { emoji: "🧑‍💻", accent: "border-blue-200 bg-blue-50 text-blue-700" },
	job: { emoji: "💼", accent: "border-indigo-200 bg-indigo-50 text-indigo-700" },
	exam: { emoji: "📝", accent: "border-orange-200 bg-orange-50 text-orange-700" },
	default: { emoji: "📢", accent: "border-slate-200 bg-slate-50 text-slate-700" },
};

function Alerts() {
	const [alerts, setAlerts] = useState([]);
	const [recommended, setRecommended] = useState([]);
	const [totalCount, setTotalCount] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedAlert, setSelectedAlert] = useState(null);
	const [blockedMessage, setBlockedMessage] = useState("");

	useEffect(() => {
		const loadAlerts = async () => {
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
					setBlockedMessage("Upload your CV/marks card or add profile skills to unlock personalized alerts");
					setAlerts([]);
					setRecommended([]);
					setTotalCount(0);
					return;
				}

				const quickTestAttempted = Boolean(quickTestStatus?.attempted);
				if (!quickTestAttempted) {
					setBlockedMessage("Take the quick test to get interest-based alerts");
					setAlerts([]);
					setRecommended([]);
					setTotalCount(0);
					return;
				}

				const data = await getAlerts({ page: currentPage, page_size: PAGE_SIZE }, { useFallback: false });
				setRecommended(data.recommended || []);
				setAlerts(data.alerts || []);
				setTotalCount(Number(data.total_count) || (data.alerts || []).length);
				setTotalPages(Number(data.total_pages) || 1);
			} catch {
				setErrorMessage("Unable to fetch alerts right now.");
			} finally {
				setIsLoading(false);
			}
		};

		loadAlerts();
	}, [currentPage]);

	if (blockedMessage) {
		return (
			<EmptyState
				message={blockedMessage}
				className="border-amber-200 bg-amber-50 text-amber-900"
				icon="🚫"
			/>
		);
	}

	if (isLoading) {
		return <LoadingModal isOpen={true} label="Fetching personalized alerts and opportunities for you..." />;
	}

	const safePage = Math.min(currentPage, Math.max(totalPages, 1));
	const startIndex = (safePage - 1) * PAGE_SIZE;
	const currentAlerts = alerts;

	const goToPage = (page) => {
		const nextPage = Math.min(Math.max(page, 1), totalPages);
		setCurrentPage(nextPage);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleViewDetails = (alert) => {
		setSelectedAlert(alert);
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-pink-500 to-orange-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-orange-100">Stay Updated</p>
					<h1 className="mt-2 text-4xl font-extrabold">Important Alerts 🔔</h1>
					<p className="mt-3 text-lg text-orange-100">
						Track deadlines, scholarships, and entrance exam notifications
					</p>
				</div>
			</div>

			{errorMessage && (
				<div className="cc-fade-in rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" style={{ animationDelay: "100ms" }}>
					⚠️ {errorMessage}
				</div>
			)}

			{isLoading ? (
				<div className="flex h-96 items-center justify-center rounded-2xl bg-white shadow-lg">
					<Loader label="Fetching personalized alerts and opportunities for you..." />
				</div>
			) : totalCount > 0 ? (
				<div>
					{recommended.length > 0 ? (
						<div className="cc-fade-in cc-card mb-6 p-4" style={{ animationDelay: "140ms" }}>
							<h3 className="cc-h3 text-base uppercase tracking-wider text-slate-800">Top Recommended</h3>
							<div className="mt-3 space-y-3">
								{recommended.slice(0, 5).map((item, idx) => (
									<div key={item.id || idx} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
										<p className="text-sm font-semibold text-slate-900 line-clamp-1">{item.title || "Recommended opportunity"}</p>
										<p className="mt-1 text-xs italic text-slate-600 line-clamp-2">
											⭐ Recommended because: {item.reason || "This opportunity is suitable based on your profile."}
										</p>
									</div>
								))}
							</div>
						</div>
					) : (
						<EmptyState
							message="No personalized alerts yet"
							className="cc-fade-in mb-6 border-blue-200 bg-blue-50 text-blue-700"
							icon="🔔"
						/>
					)}

					<h2 className="cc-fade-in cc-h2 mb-6 text-slate-900" style={{ animationDelay: "150ms" }}>
						({totalCount}) alerts for you
					</h2>
					<div className="cc-fade-in cc-card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "175ms" }}>
						<p className="text-sm text-slate-600">
							Showing <span className="font-semibold text-slate-900">{totalCount === 0 ? 0 : startIndex + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(startIndex + currentAlerts.length, totalCount)}</span> of <span className="font-semibold text-slate-900">{totalCount}</span>
						</p>
						<p className="text-sm text-slate-600">
							Page <span className="font-semibold text-slate-900">{safePage}</span> of <span className="font-semibold text-slate-900">{totalPages}</span>
						</p>
					</div>
					<div className="space-y-4">
						{currentAlerts.map((alert, index) => {
							const config = typeConfig[alert.type?.toLowerCase()] || typeConfig.default;

							return (
								<article
									key={alert.id}
									className={`cc-fade-in rounded-2xl border-2 ${config.accent} p-6 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
									style={{ animationDelay: `${200 + index * 50}ms` }}
								>
									<div className="flex flex-col gap-5 sm:flex-row sm:items-start">
										<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
											{config.emoji}
										</div>
										<div className="flex-1 space-y-4">
											<div className="flex flex-wrap items-center gap-2">
												<span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${config.accent}`}>
													{alert.type || "Notification"}
												</span>
												<span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
													Eligibility: {alert.eligibility || alert.level || "To be announced"}
												</span>
												<span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
													Deadline: {alert.deadline_display || alert.deadline || "To be announced"}
												</span>
											</div>
											<h3 className="text-xl font-extrabold text-slate-900">{alert.title}</h3>
											<p className="text-sm leading-6 text-slate-700 line-clamp-3">
												{alert.description || "Open details to read the full opportunity information and apply link."}
											</p>
											<div className="flex flex-wrap gap-3 pt-1">
												<button
													type="button"
													onClick={() => handleViewDetails(alert)}
													className="cc-btn-primary bg-slate-900 px-4 py-2 hover:bg-slate-700"
												>
													View Details
												</button>
												<a
													href={alert.link || "#"}
													target="_blank"
													rel="noopener noreferrer"
													className="cc-btn-secondary px-4 py-2"
												>
													Apply on official site
												</a>
											</div>
										</div>
									</div>
								</article>
							);
						})}
					</div>
					<div className="cc-fade-in cc-card mt-8 flex flex-col gap-4 p-6" style={{ animationDelay: "300ms" }}>
						{/* Previous / Next Controls */}
						<div className="flex items-center justify-between gap-4">
							<button
								type="button"
								disabled={safePage <= 1}
								onClick={() => goToPage(safePage - 1)}
								className="cc-btn-secondary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								← Previous
							</button>
							<p className="text-sm text-slate-600">
								Page <span className="font-semibold text-slate-900">{safePage}</span> of <span className="font-semibold text-slate-900">{totalPages}</span>
							</p>
							<button
								type="button"
								disabled={safePage >= totalPages}
								onClick={() => goToPage(safePage + 1)}
								className="cc-btn-primary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Next →
							</button>
						</div>

						{/* Numbered Page Navigation */}
						{totalPages > 1 && (
							<div className="flex flex-wrap items-center justify-center gap-2">
								<span className="text-xs font-semibold text-slate-600">Go to page:</span>
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
									<button
										key={pageNumber}
										type="button"
										onClick={() => goToPage(pageNumber)}
										className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
											pageNumber === safePage
												? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
												: "border border-slate-300 text-slate-700 hover:bg-slate-100"
										}`}
									>
										{pageNumber}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			) : (
				<EmptyState
					message="No opportunities available right now. Please check later."
					className="cc-fade-in border-emerald-200 bg-emerald-50 text-emerald-900"
					icon="📌"
				/>
			)}

			{/* Tips Section */}
			{totalCount > 0 && (
				<div className="cc-fade-in rounded-2xl bg-white p-8 shadow-lg" style={{ animationDelay: "400ms" }}>
					<h3 className="mb-4 text-lg font-bold text-slate-900">💡 Pro Tips:</h3>
					<div className="space-y-3">
						<div className="flex gap-3">
							<span className="text-2xl">🔔</span>
							<p className="text-sm text-slate-700">
								<strong>Mark your calendars:</strong> Add all deadlines to your phone calendar to never miss an opportunity
							</p>
						</div>
						<div className="flex gap-3">
							<span className="text-2xl">📋</span>
							<p className="text-sm text-slate-700">
								<strong>Read thoroughly:</strong> Check scholarship requirements carefully before applying
							</p>
						</div>
						<div className="flex gap-3">
							<span className="text-2xl">👥</span>
							<p className="text-sm text-slate-700">
								<strong>Ask mentors:</strong> Discuss with seniors or counselors about the best opportunities for you
							</p>
						</div>
					</div>
				</div>
			)}

				<AlertDetailsModal isOpen={Boolean(selectedAlert)} alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
		</div>
	);
}

export default Alerts;
