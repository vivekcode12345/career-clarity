import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Loader from "../components/Loader";
import { getCareerRoadmap } from "../services/careerService";

function Roadmap() {
	const [searchParams] = useSearchParams();
	const careerParam = searchParams.get("career") || "Software Developer";
	const [roadmap, setRoadmap] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		const loadRoadmap = async () => {
			setIsLoading(true);
			setErrorMessage("");

			try {
				const data = await getCareerRoadmap(careerParam);
				setRoadmap(data);
			} catch {
				setErrorMessage("Unable to load roadmap currently.");
			} finally {
				setIsLoading(false);
			}
		};

		loadRoadmap();
	}, [careerParam]);

	if (isLoading) {
		return (
			<div className="cc-fade-in flex h-64 items-center justify-center rounded-2xl bg-white shadow-lg">
				<Loader label="Building your personalized roadmap..." />
			</div>
		);
	}

	if (!roadmap) {
		return (
			<div className="cc-fade-in rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center">
				<div className="text-4xl mb-3">⚠️</div>
				<p className="text-lg font-semibold text-red-900">{errorMessage || "No roadmap available"}</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-purple-100">Your Personalized Path</p>
					<h1 className="mt-2 text-4xl font-extrabold">Career Roadmap: {roadmap.career} 🎯</h1>
					<p className="mt-3 text-lg text-purple-100">
						Follow this step-by-step guide to achieve your career goal
					</p>
					{roadmap.saved && (
						<div className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
							Saved to your account
						</div>
					)}
				</div>
			</div>

			{/* Timeline Section */}
			<div className="cc-fade-in rounded-3xl bg-white p-8 shadow-lg" style={{ animationDelay: "100ms" }}>
				<h2 className="mb-8 text-2xl font-bold text-slate-900">📅 Career Timeline</h2>
			{!roadmap.steps || roadmap.steps.length === 0 ? (
				<div className="rounded-lg bg-amber-50 p-6 text-center text-amber-900">
					<p>📊 No steps available. Please try again or select another career.</p>
				</div>
			) : (
				<div className="space-y-4">
					{roadmap.steps?.map((step, index) => {
						const stepTitle = typeof step === "string" ? step : step?.title || "Step";
						const stepDesc = typeof step === "object" ? step?.description : "";
						const stepTimeline = typeof step === "object" ? step?.timeline : "";
						const resources = typeof step === "object" ? step?.resources || [] : [];

						return (
							<div
								key={stepTitle + index}
								className="cc-fade-in flex gap-6 pb-8 last:pb-0"
								style={{ animationDelay: `${150 + index * 50}ms` }}
							>
								{/* Timeline Connector */}
								<div className="flex flex-col items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white shadow-lg">
										{index + 1}
									</div>
									{index < (roadmap.steps?.length || 0) - 1 && (
										<div className="h-16 w-1 bg-gradient-to-b from-indigo-400 to-transparent"></div>
									)}
								</div>

								{/* Step Content */}
								<div className="flex-1 space-y-3">
									<div className="rounded-lg border-l-4 border-indigo-500 bg-gradient-to-r from-indigo-50 to-transparent p-4">
										<p className="font-bold text-lg text-slate-900">{stepTitle}</p>
										{stepTimeline && (
											<span className="mt-2 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
												{stepTimeline}
											</span>
										)}
										{stepDesc && <p className="mt-2 text-sm text-slate-700">{stepDesc}</p>}
										<p className="mt-2 text-xs font-medium text-indigo-600">
											Phase {index + 1} of {roadmap.steps?.length || 0}
										</p>
									</div>

									{/* Resources */}
									{resources.length > 0 && (
										<div className="ml-0 space-y-2 rounded-lg bg-slate-50 p-4">
											<p className="text-xs font-semibold uppercase text-slate-600">Learning Resources</p>
											{resources.map((resource, rIdx) => (
												<a
													key={rIdx}
													href={resource.link}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm hover:border-indigo-300 hover:bg-indigo-50 transition"
												>
													<div>
														<p className="font-medium text-slate-900">{resource.title}</p>
														<p className="text-xs text-slate-500 capitalize">{resource.type}</p>
													</div>
													<span className="text-lg">🔗</span>
												</a>
											))}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>

		{/* Requirements Grid */}
		<div className="grid gap-6 lg:grid-cols-3">
				{/* Exams */}
				{roadmap.exams && roadmap.exams.length > 0 && (
					<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "250ms" }}>
						<div className="mb-4 flex items-center gap-2">
							<div className="text-3xl">📝</div>
							<h3 className="text-lg font-bold text-slate-900">Required Exams</h3>
						</div>
						<ul className="space-y-2">
							{roadmap.exams.map((exam, index) => (
								<li key={exam} className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
									<span className="font-bold text-blue-600">{index + 1}.</span>
									<span>{exam}</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Certifications */}
				{roadmap.certifications && roadmap.certifications.length > 0 && (
					<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "300ms" }}>
						<div className="mb-4 flex items-center gap-2">
							<div className="text-3xl">🏆</div>
							<h3 className="text-lg font-bold text-slate-900">Certifications</h3>
						</div>
						<ul className="space-y-2">
							{roadmap.certifications.map((certificate, index) => (
								<li key={certificate} className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-slate-700">
									<span className="font-bold text-emerald-600">✓</span>
									<span>{certificate}</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Skills Roadmap */}
				{roadmap.skillRoadmap && roadmap.skillRoadmap.length > 0 && (
					<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "350ms" }}>
						<div className="mb-4 flex items-center gap-2">
							<div className="text-3xl">⚡</div>
							<h3 className="text-lg font-bold text-slate-900">Skills to Learn</h3>
						</div>
						<div className="flex flex-wrap gap-2">
							{roadmap.skillRoadmap.map((skill) => (
								<span
									key={skill}
									className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-2 text-xs font-semibold text-purple-700"
								>
									{skill}
								</span>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Implementation Tips */}
			<div className="cc-fade-in rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-8 shadow-lg" style={{ animationDelay: "400ms" }}>
				<h3 className="mb-4 text-lg font-bold text-slate-900">💡 Implementation Tips:</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex gap-3">
						<span className="text-2xl">✅</span>
						<div>
							<p className="font-semibold text-slate-900">Start with fundamentals</p>
							<p className="mt-1 text-sm text-slate-600">Build a strong foundation in core skills before advancing</p>
						</div>
					</div>
					<div className="flex gap-3">
						<span className="text-2xl">⏰</span>
						<div>
							<p className="font-semibold text-slate-900">Follow the timeline</p>
							<p className="mt-1 text-sm text-slate-600">Complete phases in order for optimal learning progression</p>
						</div>
					</div>
					<div className="flex gap-3">
						<span className="text-2xl">📚</span>
						<div>
							<p className="font-semibold text-slate-900">Continuous learning</p>
							<p className="mt-1 text-sm text-slate-600">Stay updated with industry trends and new technologies</p>
						</div>
					</div>
					<div className="flex gap-3">
						<span className="text-2xl">🤝</span>
						<div>
							<p className="font-semibold text-slate-900">Network & mentor</p>
							<p className="mt-1 text-sm text-slate-600">Connect with professionals in your target career field</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Roadmap;
