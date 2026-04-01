import { Link, useLocation } from "react-router-dom";
import { getLastCVAnalysis } from "../services/resumeService";

function CVAnalysis() {
	const location = useLocation();
	const analysis = location.state?.analysis || getLastCVAnalysis();

	if (!analysis) {
		return (
			<div className="cc-fade-in space-y-8">
				<div className="rounded-3xl bg-gradient-to-br from-slate-600 to-slate-700 p-8 text-white shadow-xl sm:p-10">
					<div className="text-5xl mb-4">📄</div>
					<h1 className="text-3xl font-extrabold">No Analysis Found</h1>
					<p className="mt-3 text-lg text-slate-200">
						Upload your CV to get personalized skill insights and career recommendations
					</p>
				</div>

				<Link
					to="/cv-upload"
					className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
				>
					📤 Upload CV Now
				</Link>
			</div>
		);
	}

	const score = Number(analysis.resumeScore || 0);
	const scoreLevel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work";
	const scoreColor = score >= 80 ? "emerald" : score >= 60 ? "blue" : score >= 40 ? "orange" : "red";

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-emerald-100">AI Analysis</p>
					<h1 className="mt-2 text-4xl font-extrabold">Your CV Analysis Report 📊</h1>
					<p className="mt-3 text-lg text-emerald-100">
						Comprehensive insights on your resume and career fit
					</p>
				</div>
			</div>

			{/* Resume Score Card */}
			<div className="cc-fade-in rounded-3xl bg-white p-8 shadow-lg" style={{ animationDelay: "100ms" }}>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{/* Score Display */}
					<div className={`rounded-2xl bg-gradient-to-br from-${scoreColor}-50 to-${scoreColor}-100 p-6 text-center ring-1 ring-${scoreColor}-200`}>
						<p className="text-sm font-semibold text-slate-600 uppercase">Resume Score</p>
						<div className="mt-4 text-5xl font-extrabold text-slate-900">{score}</div>
						<p className={`mt-2 text-lg font-semibold text-${scoreColor}-700`}>{scoreLevel}</p>
						<div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden">
							<div
								className={`h-full bg-gradient-to-r from-${scoreColor}-500 to-${scoreColor}-600 transition-all duration-500`}
								style={{ width: `${score}%` }}
							/>
						</div>
					</div>

					{/* Skills Stats */}
					<div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 ring-1 ring-blue-200">
						<div className="text-3xl mb-3">💪</div>
						<p className="text-sm font-semibold text-slate-600 uppercase">Skills Found</p>
						<p className="mt-3 text-3xl font-bold text-blue-600">
							{analysis.extractedSkills?.length || 0}
						</p>
					</div>

					{/* Gap Analysis */}
					<div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 p-6 ring-1 ring-orange-200">
						<div className="text-3xl mb-3">🎯</div>
						<p className="text-sm font-semibold text-slate-600 uppercase">Skills Gap</p>
						<p className="mt-3 text-3xl font-bold text-orange-600">
							{analysis.missingSkills?.length || 0}
						</p>
					</div>
				</div>
			</div>

			{/* Skills Breakdown */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Extracted Skills */}
				<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "150ms" }}>
					<div className="mb-4 flex items-center gap-2">
						<div className="text-3xl">✓</div>
						<h2 className="text-lg font-bold text-slate-900">Your Skills</h2>
					</div>
					<div className="flex flex-wrap gap-2">
						{analysis.extractedSkills?.length > 0 ? (
							analysis.extractedSkills.map((skill) => (
								<span key={skill} className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
									{skill}
								</span>
							))
						) : (
							<p className="text-sm text-slate-600">No skills detected</p>
						)}
					</div>
				</div>

				{/* Missing Skills */}
				<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "200ms" }}>
					<div className="mb-4 flex items-center gap-2">
						<div className="text-3xl">⚠️</div>
						<h2 className="text-lg font-bold text-slate-900">Skills to Develop</h2>
					</div>
					<div className="flex flex-wrap gap-2">
						{analysis.missingSkills?.length > 0 ? (
							analysis.missingSkills.map((skill) => (
								<span key={skill} className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
									{skill}
								</span>
							))
						) : (
							<p className="text-sm text-slate-600">No gaps detected</p>
						)}
					</div>
				</div>
			</div>

			{/* Career Suggestions */}
			{analysis.suggestedCareers?.length > 0 && (
				<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "250ms" }}>
					<div className="mb-4 flex items-center gap-2">
						<div className="text-3xl">🎯</div>
						<h2 className="text-lg font-bold text-slate-900">Suggested Careers</h2>
					</div>
					<div className="space-y-2">
						{analysis.suggestedCareers.map((career, index) => (
							<div key={career} className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
									{index + 1}
								</span>
								<p className="font-medium text-slate-900">{career}</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Improvement Suggestions */}
			{analysis.improvementSuggestions?.length > 0 && (
				<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "300ms" }}>
					<div className="mb-4 flex items-center gap-2">
						<div className="text-3xl">💡</div>
						<h2 className="text-lg font-bold text-slate-900">Improvement Tips</h2>
					</div>
					<ul className="space-y-3">
						{analysis.improvementSuggestions.map((item, index) => (
							<li key={index} className="flex gap-3">
								<span className="text-lg">→</span>
								<span className="text-sm text-slate-700">{item}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* CTA Section */}
			<div className="cc-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white shadow-lg" style={{ animationDelay: "400ms" }}>
				<div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
				<h3 className="relative text-2xl font-extrabold">Ready for next steps?</h3>
				<p className="relative mt-2 text-indigo-100">
					Chat with our AI advisor to discuss your career path in detail
				</p>
				<Link
					to="/cv-upload"
					className="relative mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50"
				>
					Start Chat
				</Link>
			</div>
		</div>
	);
}

export default CVAnalysis;
