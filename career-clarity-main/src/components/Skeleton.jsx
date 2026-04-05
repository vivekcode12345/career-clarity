function Skeleton({ className = "" }) {
	return <div className={`cc-skeleton ${className}`} aria-hidden="true" />;
}

function SkeletonCard({ lines = 3, className = "" }) {
	return (
		<div className={`cc-card ${className}`} role="status" aria-label="Loading content">
			<Skeleton className="h-6 w-2/3" />
			<div className="mt-4 space-y-2">
				{Array.from({ length: lines }).map((_, index) => (
					<Skeleton key={index} className={`h-4 ${index === lines - 1 ? "w-4/6" : "w-full"}`} />
				))}
			</div>
		</div>
	);
}

export { Skeleton, SkeletonCard };
export default Skeleton;
