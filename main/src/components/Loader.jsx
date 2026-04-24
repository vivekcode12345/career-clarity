function Loader({ label = "Loading...", size = "md" }) {
	const spinnerSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
	const hasLabel = Boolean(label);

	return (
		<div className={`inline-flex items-center ${hasLabel ? "gap-2" : ""} text-indigo-600`} role="status" aria-live="polite">
			<span className={`${spinnerSize} animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600`} />
			{hasLabel ? <span className="text-sm font-medium">{label}</span> : null}
		</div>
	);
}

export default Loader;
