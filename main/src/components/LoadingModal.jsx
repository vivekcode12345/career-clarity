import Loader from "./Loader";

function LoadingModal({ isOpen, label = "Loading..." }) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
			<div className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-2xl sm:p-12 animate-slide-in-up">
				{/* Decorative gradient background */}
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-200/20 blur-3xl"></div>

				{/* Modal content */}
				<div className="relative flex flex-col items-center gap-6">
					<Loader label={label} size="lg" />
					<p className="text-center text-sm font-medium text-slate-600 max-w-xs">
						Please wait while we process your request...
					</p>
				</div>
			</div>
		</div>
	);
}

export default LoadingModal;
