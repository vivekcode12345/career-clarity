import { useEffect } from "react";

function CollegeDetailsModal({ isOpen, loading, error, college, onClose }) {
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="cc-fade-in w-full max-w-2xl scale-100 rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
				onClick={(event) => event.stopPropagation()}
			>
				{loading ? (
					<div className="py-12 text-center">
						<p className="text-base font-semibold text-slate-700">Loading college details...</p>
					</div>
				) : error ? (
					<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
						Unable to load college details
					</div>
				) : (
					<div className="space-y-6">
						<div className="space-y-3 rounded-2xl bg-slate-50 p-4">
							<h2 className="text-2xl font-extrabold text-slate-900">🎓 {college?.name || "N/A"}</h2>
							<p className="text-sm text-slate-700">📍 {college?.location || "N/A"}</p>
							<p className="text-sm text-slate-700">📘 {college?.courses || "N/A"}</p>
							<p className="text-sm text-slate-700">💰 {college?.fees || "N/A"}</p>
						</div>

						<div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
							<p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">🤖 Why this suits you</p>
							<p className="mt-2 text-sm leading-relaxed text-slate-700">{college?.explanation || "N/A"}</p>
						</div>

						{college?.decision_feedback && (
							<div className={`rounded-2xl p-5 ${college.decision_feedback.should_choose ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"}`}>
								<p className={`text-sm font-semibold uppercase tracking-wide ${college.decision_feedback.should_choose ? "text-emerald-700" : "text-amber-700"}`}>
									{college.decision_feedback.should_choose ? "✅ Why you should choose it" : "⚠️ Why you should think twice"}
								</p>
								<p className="mt-2 text-sm leading-relaxed text-slate-700">{college.decision_feedback.message || ""}</p>
								{college.decision_feedback.why_not ? (
									<p className="mt-2 text-sm leading-relaxed text-slate-600">{college.decision_feedback.why_not}</p>
								) : null}
								<p className="mt-3 text-xs font-semibold text-slate-500">Relevance score: {college.decision_feedback.match_score ?? 0}/100</p>
							</div>
						)}

						<div className="rounded-2xl bg-slate-50 p-4">
							<p className="text-sm font-semibold uppercase tracking-wide text-slate-700">⚡ Actions</p>
							<div className="mt-3 flex flex-wrap gap-3">
								<a
									href={college?.apply_link || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-indigo-700 hover:to-purple-700"
								>
									Apply Now 🚀
								</a>
								<button
									type="button"
									onClick={onClose}
									className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
								>
									Close
								</button>
							</div>
							<p className="mt-2 text-xs text-slate-500">You will be redirected to official website</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default CollegeDetailsModal;
