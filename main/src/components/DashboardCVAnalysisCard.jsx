import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Loader from "./Loader";
import { getLastCVAnalysis, uploadCV } from "../services/resumeService";

function DashboardCVAnalysisCard() {
	const fileInputRef = useRef(null);
	const [selectedFile, setSelectedFile] = useState(null);
	const [analysis, setAnalysis] = useState(() => getLastCVAnalysis());
	const [isUploading, setIsUploading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const score = Number(analysis?.resumeScore || 0);
	const scoreStatus = useMemo(() => {
		if (score >= 80) return { label: "Excellent", bar: "from-emerald-500 to-teal-500" };
		if (score >= 60) return { label: "Good", bar: "from-blue-500 to-indigo-500" };
		if (score >= 40) return { label: "Fair", bar: "from-amber-500 to-orange-500" };
		return { label: "Needs Work", bar: "from-rose-500 to-red-500" };
	}, [score]);

	const validateAndSetFile = (file) => {
		if (!file) {
			return;
		}

		const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
		const lowerName = file.name?.toLowerCase() || "";
		const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
		const hasAllowedExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));

		if (!allowedMimeTypes.includes(file.type) && !hasAllowedExtension) {
			setErrorMessage("Only PDF, JPG, JPEG, and PNG files are allowed.");
			setSelectedFile(null);
			return;
		}

		setErrorMessage("");
		setSuccessMessage("");
		setSelectedFile(file);
	};

	const onFileChange = (event) => {
		validateAndSetFile(event.target.files?.[0]);
	};

	const onDropFile = (event) => {
		event.preventDefault();
		validateAndSetFile(event.dataTransfer.files?.[0]);
	};

	const onAnalyze = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		if (!selectedFile) {
			setErrorMessage("Please select a file before analyzing.");
			return;
		}

		setIsUploading(true);
		try {
			const result = await uploadCV(selectedFile);
			setAnalysis(result);
			setSuccessMessage("CV analyzed successfully.");
			setSelectedFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (error) {
			setErrorMessage(error?.message || "Unable to analyze CV. Please try again.");
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<section className="cc-card p-6">
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">CV Analysis</p>
					<h3 className="mt-1 text-lg font-bold text-slate-900">Upload CV and get a score</h3>
					<p className="mt-1 text-sm text-slate-600">Get a detailed overview with skills, gaps, and CV score out of 100.</p>
				</div>
				{analysis ? (
					<Link to="/cv-analysis" state={{ analysis }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
						View Full Report →
					</Link>
				) : null}
			</div>

			{analysis ? (
				<div className="mb-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
					<div className="flex items-center justify-between">
						<p className="text-sm font-semibold text-slate-700">Latest CV Score</p>
						<p className="text-lg font-extrabold text-slate-900">{Math.max(0, Math.min(100, score))}/100</p>
					</div>
					<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
						<div
							className={`h-full bg-gradient-to-r ${scoreStatus.bar}`}
							style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
						/>
					</div>
					<p className="mt-2 text-xs font-medium text-slate-600">Status: {scoreStatus.label}</p>
					<div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
						<div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
							<p className="font-semibold text-slate-900">Skills Found</p>
							<p>{analysis.extractedSkills?.length || 0}</p>
						</div>
						<div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
							<p className="font-semibold text-slate-900">Skill Gaps</p>
							<p>{analysis.missingSkills?.length || 0}</p>
						</div>
						<div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
							<p className="font-semibold text-slate-900">Suggested Careers</p>
							<p>{analysis.suggestedCareers?.length || 0}</p>
						</div>
					</div>
				</div>
			) : null}

			<form onSubmit={onAnalyze} className="space-y-3">
				<div
					onDragOver={(event) => event.preventDefault()}
					onDrop={onDropFile}
					onClick={() => fileInputRef.current?.click()}
					role="button"
					tabIndex={0}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							fileInputRef.current?.click();
						}
					}}
					className={`rounded-xl border-2 border-dashed p-4 text-center transition ${
						selectedFile
							? "border-emerald-400 bg-emerald-50"
							: "border-indigo-200 bg-indigo-50/50 hover:border-indigo-400"
					}`}
				>
					<p className="text-sm font-semibold text-slate-800">{selectedFile ? selectedFile.name : "Drop CV here or click to choose"}</p>
					<p className="mt-1 text-xs text-slate-600">Accepted: PDF, JPG, JPEG, PNG</p>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
					className="hidden"
					onChange={onFileChange}
				/>

				{errorMessage ? (
					<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{errorMessage}</div>
				) : null}
				{successMessage ? (
					<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{successMessage}</div>
				) : null}

				<button type="submit" disabled={isUploading || !selectedFile} className="cc-btn-primary w-full justify-center disabled:opacity-70">
					{isUploading ? <Loader label="Analyzing CV..." size="sm" /> : "Analyze CV"}
				</button>
			</form>
		</section>
	);
}

export default DashboardCVAnalysisCard;
