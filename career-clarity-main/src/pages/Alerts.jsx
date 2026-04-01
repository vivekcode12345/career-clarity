import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import { getAlerts } from "../services/careerService";

function Alerts() {
	const [alerts, setAlerts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		const loadAlerts = async () => {
			setIsLoading(true);
			setErrorMessage("");

			try {
				const data = await getAlerts();
				setAlerts(data.alerts || []);
			} catch {
				setErrorMessage("Unable to fetch alerts right now.");
			} finally {
				setIsLoading(false);
			}
		};

		loadAlerts();
	}, []);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-pink-500 to-orange-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-orange-100">Stay Updated</p>
					<h1 className="mt-2 text-4xl font-extrabold">Important Alerts 🔔</h1>
					<p className="mt-3 text-lg text-orange-100">
						Track deadlines, scholarships, and entrance exam notifications
					</p>
				</div>
			</div>

			{errorMessage && (
				<div className="cc-fade-in rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" style={{ animationDelay: "100ms" }}>
					⚠️ {errorMessage}
				</div>
			)}

			{isLoading ? (
				<div className="cc-fade-in flex h-64 items-center justify-center rounded-2xl bg-white shadow-lg">
					<Loader label="Loading alerts..." />
				</div>
			) : alerts.length > 0 ? (
				<div>
					<h2 className="cc-fade-in mb-6 text-2xl font-extrabold text-slate-900" style={{ animationDelay: "150ms" }}>
						({alerts.length}) alerts for you
					</h2>
					<div className="space-y-4">
						{alerts.map((alert, index) => {
							// Type-based emoji and color mapping
							const typeConfig = {
								scholarship: { emoji: "💰", color: "emerald" },
								deadline: { emoji: "⏰", color: "orange" },
								exam: { emoji: "📝", color: "blue" },
								admission: { emoji: "🎓", color: "purple" },
								default: { emoji: "📢", color: "indigo" },
							};

							const config = typeConfig[alert.type?.toLowerCase()] || typeConfig.default;

							return (
								<article
									key={alert.id}
									className={`cc-fade-in rounded-2xl border-2 border-${config.color}-200 bg-gradient-to-br from-${config.color}-50 to-${config.color}-50/50 p-6 shadow-md transition hover:shadow-lg hover:border-${config.color}-300`}
									style={{ animationDelay: `${200 + index * 50}ms` }}
								>
									<div className="flex items-start gap-4">
										<div className={`text-3xl`}>{config.emoji}</div>
										<div className="flex-1">
											<p className={`text-xs font-bold uppercase tracking-wider text-${config.color}-600`}>
												{alert.type || "Notification"}
											</p>
											<h3 className="mt-2 text-lg font-bold text-slate-900">{alert.title}</h3>
											<p className="mt-2 text-sm text-slate-600">
												📅 <span className="font-semibold">{alert.date}</span>
											</p>
											{alert.description && (
												<p className="mt-2 text-sm text-slate-700">{alert.description}</p>
											)}
										</div>
									</div>
								</article>
							);
						})}
					</div>
				</div>
			) : (
				<div className="cc-fade-in rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center" style={{ animationDelay: "150ms" }}>
					<div className="text-5xl mb-3">✓</div>
					<p className="text-lg font-semibold text-emerald-900">You're all caught up!</p>
					<p className="mt-2 text-sm text-emerald-800">No pending alerts right now. Check back soon for updates.</p>
				</div>
			)}

			{/* Tips Section */}
			{alerts.length > 0 && (
				<div className="cc-fade-in rounded-2xl bg-white p-8 shadow-lg" style={{ animationDelay: "400ms" }}>
					<h3 className="mb-4 text-lg font-bold text-slate-900">💡 Pro Tips:</h3>
					<div className="space-y-3">
						<div className="flex gap-3">
							<span className="text-2xl">🔔</span>
							<p className="text-sm text-slate-700">
								<strong>Mark your calendars:</strong> Add all deadlines to your phone calendar to never miss an opportunity
							</p>
						</div>
						<div className="flex gap-3">
							<span className="text-2xl">📋</span>
							<p className="text-sm text-slate-700">
								<strong>Read thoroughly:</strong> Check scholarship requirements carefully before applying
							</p>
						</div>
						<div className="flex gap-3">
							<span className="text-2xl">👥</span>
							<p className="text-sm text-slate-700">
								<strong>Ask mentors:</strong> Discuss with seniors or counselors about the best opportunities for you
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Alerts;
