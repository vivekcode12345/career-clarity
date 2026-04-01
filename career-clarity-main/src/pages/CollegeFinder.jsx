import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import CollegeCard from "../components/CollegeCard";
import { searchColleges } from "../services/collegeService";

function CollegeFinder() {
	const [filters, setFilters] = useState({ search: "", location: "", course: "", fees: "" });
	const [colleges, setColleges] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	const loadColleges = async (activeFilters) => {
		setIsLoading(true);
		setErrorMessage("");

		try {
			const data = await searchColleges(activeFilters);
			const result = (data.colleges || []).filter((college) =>
				activeFilters.fees ? college.fees.toLowerCase().includes(activeFilters.fees.toLowerCase()) : true
			);
			setColleges(result);
		} catch {
			setErrorMessage("Unable to fetch colleges currently.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadColleges(filters);
	}, []);

	const onChange = (event) => {
		const { name, value } = event.target;
		setFilters((prev) => ({ ...prev, [name]: value }));
	};

	const onSubmit = (event) => {
		event.preventDefault();
		loadColleges(filters);
	};

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
					<h2 className="cc-fade-in mb-6 text-2xl font-extrabold text-slate-900" style={{ animationDelay: "150ms" }}>
						📚 {colleges.length} colleges found
					</h2>
					<div className="grid gap-6 lg:grid-cols-3">
						{colleges.map((college, index) => (
							<div
								key={college.id}
								className="cc-fade-in rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-2 hover:shadow-lg"
								style={{ animationDelay: `${200 + index * 75}ms` }}
							>
								<CollegeCard college={college} />
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="cc-fade-in rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 text-center" style={{ animationDelay: "200ms" }}>
					<div className="text-4xl mb-3">🔍</div>
					<p className="text-lg font-semibold text-amber-900">No colleges found</p>
					<p className="mt-2 text-sm text-amber-800">Try adjusting your filters or search terms</p>
				</div>
			)}
		</div>
	);
}

export default CollegeFinder;
