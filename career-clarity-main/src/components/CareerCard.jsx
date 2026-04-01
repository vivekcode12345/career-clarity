import { Link } from "react-router-dom";

function CareerCard({ career }) {
	return (
		<article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
			<h3 className="text-lg font-semibold text-slate-900">{career.title}</h3>
			<p className="mt-2 text-sm text-slate-600">{career.description}</p>

			<div className="mt-4 space-y-2">
				<p className="text-sm text-slate-700">
					<span className="font-semibold">Required Skills: </span>
					{career.requiredSkills?.join(", ") || "N/A"}
				</p>
				<p className="text-sm text-slate-700">
					<span className="font-semibold">Salary Range: </span>
					{career.salaryRange || "N/A"}
				</p>
			</div>

			<Link
				to={`/roadmap?career=${encodeURIComponent(career.title)}`}
				className="cc-cta mt-4 inline-flex px-4 py-2 text-sm"
			>
				View Roadmap
			</Link>
		</article>
	);
}

export default CareerCard;
