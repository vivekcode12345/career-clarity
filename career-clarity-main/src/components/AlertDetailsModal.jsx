import { useEffect } from "react";

function AlertDetailsModal({ isOpen, alert, onClose }) {
	useEffect(() => {
		if (!isOpen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen || !alert) return null;

	const badgeStyles = {
		scholarship: "bg-emerald-100 text-emerald-700",
		internship: "bg-blue-100 text-blue-700",
		job: "bg-indigo-100 text-indigo-700",
		exam: "bg-orange-100 text-orange-700",
		default: "bg-slate-100 text-slate-700",
	};

	const badgeStyle = badgeStyles[alert.type?.toLowerCase()] || badgeStyles.default;
	const detailPoints = Array.isArray(alert.detail_points) ? alert.detail_points : [];
	const requirements = Array.isArray(alert.requirements) ? alert.requirements : [];
	const applicationSteps = Array.isArray(alert.application_steps) ? alert.application_steps : [];

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="cc-fade-in mx-auto my-4 w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:my-8 sm:max-h-[calc(100vh-4rem)] sm:p-8"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
					<div>
						<p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${badgeStyle}`}>
							{alert.type || "Alert"}
						</p>
						<h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{alert.title || "Opportunity details"}</h2>
						<p className="mt-2 text-sm text-slate-500">Source: {alert.source || "Official website"}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
					>
						Close
					</button>
				</div>

				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					<div className="rounded-2xl bg-slate-50 p-4">
						<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Eligibility</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{alert.eligibility || alert.level || "To be announced"}</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-4">
						<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Deadline</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{alert.deadline_display || alert.deadline || "To be announced"}</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-4">
						<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Category</p>
						<p className="mt-2 text-sm font-semibold text-slate-900 capitalize">{alert.type || "Notification"}</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-4">
						<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Level</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{alert.level || "To be announced"}</p>
					</div>
				</div>

				{alert.description ? (
					<div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
						<p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Details</p>
						<p className="mt-2 text-sm leading-7 text-slate-700">{alert.description}</p>
					</div>
				) : null}

				{detailPoints.length > 0 ? (
					<div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs font-bold uppercase tracking-widest text-slate-700">Opportunity Snapshot</p>
						<ul className="mt-2 space-y-2 text-sm text-slate-700">
							{detailPoints.map((point) => (
								<li key={point} className="flex items-start gap-2">
									<span className="mt-1 text-indigo-600">•</span>
									<span>{point}</span>
								</li>
							))}
						</ul>
					</div>
				) : null}

				{requirements.length > 0 ? (
					<div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
						<p className="text-xs font-bold uppercase tracking-widest text-amber-700">Eligibility Checklist</p>
						<ul className="mt-2 space-y-2 text-sm text-slate-700">
							{requirements.map((requirement) => (
								<li key={requirement} className="flex items-start gap-2">
									<span className="mt-1 text-amber-700">✓</span>
									<span>{requirement}</span>
								</li>
							))}
						</ul>
					</div>
				) : null}

				{applicationSteps.length > 0 ? (
					<div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
						<p className="text-xs font-bold uppercase tracking-widest text-emerald-700">How To Apply</p>
						<ol className="mt-2 space-y-2 text-sm text-slate-700">
							{applicationSteps.map((step, index) => (
								<li key={`${index}-${step}`} className="flex items-start gap-2">
									<span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
										{index + 1}
									</span>
									<span>{step}</span>
								</li>
							))}
						</ol>
					</div>
				) : null}

				{Array.isArray(alert.tags) && alert.tags.length > 0 ? (
					<div className="mt-6 flex flex-wrap gap-2">
						{alert.tags.map((tag) => (
							<span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
								{tag}
							</span>
						))}
					</div>
				) : null}

				<div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-xs text-slate-500">{alert.official_note || "Open the official website to check full eligibility and apply."}</p>
					<div className="flex flex-wrap gap-3">
						<a
							href={alert.link || "#"}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-indigo-700 hover:to-purple-700"
						>
							Apply Now 🚀
						</a>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
						>
							Back
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AlertDetailsModal;
