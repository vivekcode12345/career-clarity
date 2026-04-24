import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import LoadingModal from "../components/LoadingModal";
import EmptyState from "../components/EmptyState";
import CollegeCard from "../components/CollegeCard";
import CollegeDetailsModal from "../components/CollegeDetailsModal";
import { getCollegeDetails, searchColleges } from "../services/collegeService";
import { getProfile } from "../services/profileService";
import { hasUploadedCV } from "../services/resumeService";
import { getQuickTest } from "../services/testService";

function CollegeFinder() {
	const [filters, setFilters] = useState({ search: "", location: "", course: "", fees: "" });
	const [colleges, setColleges] = useState([]);
	const [recommendedColleges, setRecommendedColleges] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, page_size: 15, total_count: 0, total_pages: 1, has_next: false, has_previous: false });
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [selectedCollege, setSelectedCollege] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [detailsError, setDetailsError] = useState("");
	const [blockedMessage, setBlockedMessage] = useState("");

	const loadColleges = async (activeFilters, requestedPage = 1) => {
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
				setBlockedMessage("Upload your CV/marks card or add profile skills before using College Finder");
				setColleges([]);
				setRecommendedColleges([]);
				setPagination({ page: 1, page_size: 15, total_count: 0, total_pages: 1, has_next: false, has_previous: false });
				return;
			}

			const quickTestAttempted = Boolean(quickTestStatus?.attempted);
			if (!quickTestAttempted) {
				setBlockedMessage("Take the quick test to get interest-based college matches");
				setColleges([]);
				setRecommendedColleges([]);
				setPagination({ page: 1, page_size: 15, total_count: 0, total_pages: 1, has_next: false, has_previous: false });
				return;
			}

			const data = await searchColleges({ ...activeFilters, page: requestedPage, page_size: 15 }, { useFallback: false });
			setColleges(Array.isArray(data.colleges) ? data.colleges : []);
			setRecommendedColleges(Array.isArray(data.recommended) ? data.recommended : []);
			setPagination(data.pagination || { page: requestedPage, page_size: 15, total_count: 0, total_pages: 1, has_next: false, has_previous: false });

			const recommendedCourses = Array.isArray(data.recommended_courses) ? data.recommended_courses.filter(Boolean) : [];
			if (!activeFilters.course && recommendedCourses.length === 1) {
				setFilters((prev) => ({ ...prev, course: recommendedCourses[0] }));
			}
		} catch {
			setErrorMessage("Unable to fetch colleges currently.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadColleges(filters, 1);
	}, []);

	const onChange = (event) => {
		const { name, value } = event.target;
		setFilters((prev) => ({ ...prev, [name]: value }));
	};

	const onSubmit = (event) => {
		event.preventDefault();
		loadColleges(filters, 1);
	};

	const goToPage = (nextPage) => {
		loadColleges(filters, nextPage);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
	};

	const handleViewDetails = async (college) => {
		setIsModalOpen(true);
		setLoading(true);
		setDetailsError("");

		try {
			const details = await getCollegeDetails(college?.name || "");
			setSelectedCollege(details);
		} catch {
			setSelectedCollege(null);
			setDetailsError("Unable to load college details");
		} finally {
			setLoading(false);
		}
	};

	if (blockedMessage) {
		return (
			<EmptyState
				message={blockedMessage}
				className="border-amber-200 bg-amber-50 text-amber-900"
			/>
		);
	}

	if (isLoading) {
		return <LoadingModal isOpen={true} label="Finding colleges that match your profile..." />;
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-blue-100">Explore Educational</p>
					<h1 className="mt-2 text-4xl font-extrabold">College Finder 🏫</h1>
					<p className="mt-3 text-lg text-blue-100">
						Discover colleges that match your location, course, and budget preferences
					</p>
				</div>
			</div>

			{/* Search Filters */}
			<div className="cc-fade-in rounded-3xl bg-white p-6 shadow-lg sm:p-8" style={{ animationDelay: "100ms" }}>
				<h2 className="mb-6 text-xl font-bold text-slate-900">🔍 Filter Colleges</h2>
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">College Name</label>
							<input
								name="search"
								value={filters.search}
								onChange={onChange}
								placeholder="Search by college name..."
								className="cc-input"
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
							<input
								name="location"
								value={filters.location}
								onChange={onChange}
								placeholder="e.g., Bengaluru, Delhi"
								className="cc-input"
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Course</label>
							<input
								name="course"
								value={filters.course}
								onChange={onChange}
								placeholder="e.g., B.Tech, B.Sc"
								className="cc-input"
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Fees Range</label>
							<input
								name="fees"
								value={filters.fees}
								onChange={onChange}
								placeholder="e.g., Low, Medium, High"
								className="cc-input"
							/>
						</div>
					</div>

					<button
						type="submit"
						className="cc-cta w-full flex items-center justify-center py-3 shadow-lg"
					>
						🔍 Search Colleges
					</button>
				</form>
			</div>

			{errorMessage && (
				<div className="cc-fade-in rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" style={{ animationDelay: "150ms" }}>
					⚠️ {errorMessage}
				</div>
			)}

			{isLoading ? (
				<div className="cc-fade-in flex h-64 items-center justify-center rounded-2xl bg-white shadow-lg">
					<Loader label="Finding colleges for you..." />
				</div>
			) : colleges.length > 0 ? (
				<div>
					{recommendedColleges.length > 0 && (
						<div className="cc-fade-in mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm" style={{ animationDelay: "140ms" }}>
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">AI Highlighted Colleges</p>
									<p className="text-sm text-emerald-900">Top matches from the database with relevance scores</p>
								</div>
								<p className="text-sm font-semibold text-emerald-700">Top {recommendedColleges.length}</p>
							</div>
							<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{recommendedColleges.map((college) => (
									<div key={`${college.name}-recommended`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
										<div className="flex items-start justify-between gap-3">
											<div>
												<h3 className="font-bold text-slate-900">{college.name}</h3>
												<p className="text-sm text-slate-600">{college.location}</p>
											</div>
											<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
												{college.relevance_score ?? 0}/100
											</span>
										</div>
										<p className="mt-2 text-sm text-slate-700">{college.reason}</p>
									</div>
								))}
							</div>
						</div>
					)}

					<h2 className="cc-fade-in mb-6 text-2xl font-extrabold text-slate-900" style={{ animationDelay: "150ms" }}>
						📚 {pagination.total_count || colleges.length} colleges found
					</h2>
					<div className="grid gap-6 lg:grid-cols-3">
						{colleges.map((college, index) => (
							<div
								key={college.id}
								className="cc-fade-in rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-2 hover:shadow-lg"
								style={{ animationDelay: `${200 + index * 75}ms` }}
							>
								<CollegeCard college={college} onViewDetails={handleViewDetails} />
							</div>
						))}
					</div>

						<div className="cc-fade-in mt-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ animationDelay: "300ms" }}>
							<p className="text-sm text-slate-600">
								Showing page <span className="font-semibold text-slate-900">{pagination.page}</span> of <span className="font-semibold text-slate-900">{pagination.total_pages}</span> • {pagination.page_size} per page
							</p>
							<div className="flex items-center gap-3">
								<button
									type="button"
									disabled={!pagination.has_previous || isLoading}
									onClick={() => goToPage(Math.max(1, pagination.page - 1))}
									className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100"
								>
									← Previous
								</button>
								<button
									type="button"
									disabled={!pagination.has_next || isLoading}
									onClick={() => goToPage(pagination.page + 1)}
									className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:from-indigo-700 hover:to-purple-700"
								>
									Next →
								</button>
							</div>
						</div>
				</div>
			) : (
				<EmptyState
					message="No colleges found. Try adjusting filters."
					className="cc-fade-in border-amber-200 bg-amber-50 text-amber-900"
				/>
			)}

			<CollegeDetailsModal
				isOpen={isModalOpen}
				loading={loading}
				error={detailsError}
				college={selectedCollege}
				onClose={handleCloseModal}
			/>
		</div>
	);
}

export default CollegeFinder;
