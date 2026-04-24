function CollegeCard({ college, onViewDetails }) {
	const courseLabel = Array.isArray(college.courses)
		? college.courses.join(", ")
		: college.course || college.courses || "N/A";

	return (
		<article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
			<h3 className="text-lg font-semibold text-slate-900">{college.name}</h3>
			<p className="mt-1 text-sm text-slate-600">{college.location}</p>

			<div className="mt-4 space-y-2 text-sm text-slate-700">
				<p>
					<span className="font-semibold">Course: </span>
					{courseLabel}
				</p>
				<p>
					<span className="font-semibold">Fees: </span>
					{typeof college.fees === "number" ? `₹${college.fees.toLocaleString("en-IN")}` : college.fees}
				</p>
				{typeof college.rating === "number" && (
					<p>
						<span className="font-semibold">Rating: </span>
						{college.rating.toFixed(1)} / 5
					</p>
				)}
			</div>

			<button
				type="button"
				onClick={() => onViewDetails?.(college)}
				className="cc-cta mt-4 px-4 py-2 text-sm"
			>
				View Details →
			</button>
		</article>
	);
}

export default CollegeCard;
