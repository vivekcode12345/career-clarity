function EmptyState({ message, className = "", icon = "📭" }) {
	return (
		<div className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-600 ${className}`}>
			<div className="mb-2 text-2xl" aria-hidden="true">{icon}</div>
			{message}
		</div>
	);
}

export default EmptyState;
