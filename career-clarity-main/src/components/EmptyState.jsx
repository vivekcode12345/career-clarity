function EmptyState({ message, className = "" }) {
	return (
		<div className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-600 ${className}`}>
			{message}
		</div>
	);
}

export default EmptyState;
