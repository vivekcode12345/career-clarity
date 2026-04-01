import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { getCurrentUser } from "../services/authService";
import { uploadCV } from "../services/resumeService";

function CVUpload() {
	const inputRef = useRef(null);
	const navigate = useNavigate();
	const user = getCurrentUser();
	const isGraduate = user?.educationLevel === "Graduate";

	const [selectedFile, setSelectedFile] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const validateAndSetFile = (file) => {
		if (!file) {
			return;
		}

		const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
		const lowerName = file.name?.toLowerCase() || "";
		const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
		const hasAllowedExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));

		if (!allowedMimeTypes.includes(file.type) && !hasAllowedExtension) {
			setErrorMessage("Only PDF, JPG, JPEG, and PNG files are allowed.");
			setSelectedFile(null);
			return;
		}

		setErrorMessage("");
		setSelectedFile(file);
	};

	const onFileChange = (event) => {
		validateAndSetFile(event.target.files?.[0]);
	};

	const onDropFile = (event) => {
		event.preventDefault();
		validateAndSetFile(event.dataTransfer.files?.[0]);
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		if (!selectedFile) {
			setErrorMessage("Please select a PDF/JPG/JPEG/PNG file before uploading.");
			return;
		}

		setIsUploading(true);
		try {
			const analysis = await uploadCV(selectedFile);
			const uploadMessage = analysis?.uploadMessage || "Document uploaded successfully.";
			setSuccessMessage(`${uploadMessage} Processing your document, few seconds to go...`);

			setTimeout(() => {
				navigate("/cv-analysis", { state: { analysis } });
			}, 1400);
		} catch (error) {
			setErrorMessage(error.message || "CV upload failed. Please try again.");
		} finally {
			setIsUploading(false);
		}
	};

	if (!isGraduate) {
		return (
			<div className="cc-fade-in space-y-8">
				<div className="rounded-3xl bg-gradient-to-br from-amber-600 to-red-600 p-8 text-white shadow-xl sm:p-10">
					<div className="text-5xl mb-4">🔒</div>
					<h1 className="text-3xl font-extrabold">Access Restricted</h1>
					<p className="mt-3 text-lg text-amber-100">
						This feature is exclusively for graduates. Complete your profile education level update to access CV analysis.
					</p>
				</div>

				<Link
					to="/dashboard"
					className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
				>
					← Back to Dashboard
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header Card */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-orange-100">AI-Powered Analysis</p>
					<h1 className="mt-2 text-4xl font-extrabold">CV Analysis 📄</h1>
					<p className="mt-3 text-lg text-orange-100">
						Upload your resume and get personalized skill insights and career guidance
					</p>
				</div>
			</div>

			{/* Guidelines Cards */}
			<div className="cc-fade-in grid gap-4 sm:grid-cols-3" style={{ animationDelay: "100ms" }}>
				<div className="rounded-2xl bg-blue-50 p-4 text-center ring-1 ring-blue-200">
					<div className="text-3xl mb-2">✓</div>
					<p className="text-sm font-semibold text-slate-600">Supported Formats</p>
					<p className="mt-1 text-xs text-slate-600">PDF, JPG, JPEG, PNG</p>
				</div>
				<div className="rounded-2xl bg-purple-50 p-4 text-center ring-1 ring-purple-200">
					<div className="text-3xl mb-2">🔒</div>
					<p className="text-sm font-semibold text-slate-600">Secure Upload</p>
					<p className="mt-1 text-xs text-slate-600">Your data is protected</p>
				</div>
				<div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
					<div className="text-3xl mb-2">⚡</div>
					<p className="text-sm font-semibold text-slate-600">Instant Analysis</p>
					<p className="mt-1 text-xs text-slate-600">Results within seconds</p>
				</div>
			</div>

			{/* Upload Section */}
			<div className="cc-fade-in rounded-3xl bg-white shadow-lg" style={{ animationDelay: "150ms" }}>
				<form onSubmit={onSubmit} className="space-y-6 p-8">
					{/* Drag & Drop Area */}
					<div>
						<h2 className="mb-4 text-lg font-bold text-slate-900">Upload Your Document</h2>
						<div
							onDragOver={(event) => event.preventDefault()}
							onDrop={onDropFile}
							onClick={() => inputRef.current?.click()}
							role="button"
							tabIndex={0}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									inputRef.current?.click();
								}
							}}
							className={`cursor-pointer rounded-2xl border-3 border-dashed p-8 text-center transition ${
								selectedFile
									? "border-emerald-400 bg-emerald-50"
									: "border-indigo-300 bg-gradient-to-br from-white to-indigo-50 hover:border-indigo-500 hover:from-indigo-50 hover:to-indigo-100"
							}`}
						>
							<div className="text-5xl mb-3">{selectedFile ? "✓" : "📤"}</div>
							<p className="text-xl font-bold text-slate-900">
								{selectedFile ? "Ready to analyze!" : "Drag & drop your file"}
							</p>
							<p className="mt-2 text-sm text-slate-600">
								{selectedFile ? selectedFile.name : "PDF, JPG, JPEG, or PNG (Max 10MB)"}
							</p>
							{selectedFile && (
								<p className="mt-3 text-xs font-medium text-emerald-700">
									✓ File selected successfully
								</p>
							)}
						</div>
					</div>

					<input
						ref={inputRef}
						type="file"
						accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
						className="hidden"
						onChange={onFileChange}
					/>

					{/* Messages */}
					{errorMessage && (
						<div className="cc-fade-in rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
							⚠️ {errorMessage}
						</div>
					)}
					{successMessage && (
						<div className="cc-fade-in rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
							✓ {successMessage}
						</div>
					)}

					{/* Submit Button */}
					<button
						type="submit"
						disabled={isUploading || !selectedFile}
						className="cc-cta w-full flex items-center justify-center disabled:opacity-70"
					>
						{isUploading ? (
							<Loader label="Analyzing your CV..." size="sm" />
						) : (
							"🚀 Analyze CV"
						)}
					</button>
				</form>
			</div>

			{/* Info Card */}
			<div className="cc-fade-in rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6" style={{ animationDelay: "200ms" }}>
				<h3 className="font-bold text-slate-900">💡 What we analyze:</h3>
				<ul className="mt-3 space-y-2 text-sm text-slate-700">
					<li className="flex items-center gap-2">
						<span className="text-blue-600">✓</span> Your technical and soft skills
					</li>
					<li className="flex items-center gap-2">
						<span className="text-blue-600">✓</span> Experience and expertise areas
					</li>
					<li className="flex items-center gap-2">
						<span className="text-blue-600">✓</span> Skill gaps and improvements needed
					</li>
					<li className="flex items-center gap-2">
						<span className="text-blue-600">✓</span> Recommended career paths based on your profile
					</li>
				</ul>
			</div>
		</div>
	);
}

export default CVUpload;
