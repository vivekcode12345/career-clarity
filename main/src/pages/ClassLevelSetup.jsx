import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { EDUCATION_LEVELS, updateUserProfile } from "../services/authService";

function ClassLevelSetup() {
	const navigate = useNavigate();
	const [educationLevel, setEducationLevel] = useState("Class 12");
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setIsSaving(true);

		try {
			await updateUserProfile({ educationLevel });
			navigate("/dashboard", { replace: true });
		} catch (error) {
			const apiError = error?.response?.data?.error || error?.response?.data?.message;
			setErrorMessage(apiError || "Unable to save class level. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl space-y-6">
			<div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-white shadow-xl">
				<p className="text-sm font-semibold uppercase tracking-widest text-indigo-100">One quick step</p>
				<h1 className="mt-2 text-3xl font-extrabold">Select your class level</h1>
				<p className="mt-2 text-indigo-100">We use this to personalize your tests and recommendations.</p>
			</div>

			<form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200">
				<label htmlFor="educationLevel" className="mb-2 block text-sm font-semibold text-slate-700">
					Education / Class Level
				</label>
				<select
					id="educationLevel"
					value={educationLevel}
					onChange={(event) => setEducationLevel(event.target.value)}
					className="cc-input bg-white"
				>
					{EDUCATION_LEVELS.map((level) => (
						<option key={level} value={level}>
							{level}
						</option>
					))}
				</select>

				{errorMessage && (
					<p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
						⚠️ {errorMessage}
					</p>
				)}

				<button type="submit" disabled={isSaving} className="cc-cta mt-5 w-full flex items-center justify-center">
					{isSaving ? <Loader label="Saving..." size="sm" /> : "Continue"}
				</button>
			</form>
		</div>
	);
}

export default ClassLevelSetup;
