function CollegeCard({ college }) {
	return (
		<article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
			<h3 className="text-lg font-semibold text-slate-900">{college.name}</h3>
			<p className="mt-1 text-sm text-slate-600">{college.location}</p>

			<div className="mt-4 space-y-2 text-sm text-slate-700">
				<p>
					<span className="font-semibold">Course: </span>
					{college.course}
				</p>
				<p>
					<span className="font-semibold">Fees: </span>
					{college.fees}
				</p>
			</div>

			<button
				type="button"
				className="cc-cta mt-4 px-4 py-2 text-sm"
			>
				Apply (UI Only)
			</button>
		</article>
	);
}

export default CollegeCard;
