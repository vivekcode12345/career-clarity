import { useState } from "react";
import Loader from "../components/Loader";
import { getCurrentUser, updateUserProfile } from "../services/authService";
import { getProfile } from "../services/profileService";
import { useEffect } from "react";

const interestOptions = ["Technology", "Design", "Business", "Science", "Healthcare", "Government Exams", "Arts", "Commerce"];

function Profile() {
	const currentUser = getCurrentUser();
	const [formData, setFormData] = useState({
		name: currentUser?.name || "",
		educationLevel: currentUser?.educationLevel || "Class 12",
		interests: currentUser?.interests || [],
		customInterest: "",
		skills: Array.isArray(currentUser?.skills) ? currentUser.skills.join(", ") : currentUser?.skills || "",
		preferredLocation: currentUser?.preferredLocation || "",
		careerGoal: currentUser?.careerGoal || "",
	});
	useEffect(() => {
	const fetchProfile = async () => {
		try {
			const data = await getProfile();

			setFormData((prev) => ({
				...prev,
				name: data.name || prev.name,
				skills: data.skills?.join(", ") || prev.skills, 
			}));
		} catch (err) {
			console.error(err);
		}
	};

	fetchProfile();
}, []);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [status, setStatus] = useState({ type: "", message: "" });
	

	const onChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const onToggleInterest = (interest) => {
		setFormData((prev) => {
			const hasInterest = prev.interests.includes(interest);
			const updated = hasInterest ? prev.interests.filter((item) => item !== interest) : [...prev.interests, interest];
			return { ...prev, interests: updated };
		});
	};

	const addCustomInterest = () => {
		const customInterest = formData.customInterest.trim();
		if (customInterest && !formData.interests.includes(customInterest)) {
			setFormData((prev) => ({
				...prev,
				interests: [...prev.interests, customInterest],
				customInterest: "",
			}));
		}
	};

	const removeInterest = (interest) => {
		setFormData((prev) => ({
			...prev,
			interests: prev.interests.filter((item) => item !== interest),
		}));
	};

	const onSave = async () => {
		setIsSaving(true);
		setStatus({ type: "", message: "" });

		try {
			await updateUserProfile(formData);
			setStatus({ type: "success", message: "Profile updated successfully." });
			setIsEditMode(false);
		} catch {
			setStatus({ type: "error", message: "Unable to update profile. Please retry." });
		} finally {
			setIsSaving(false);
		}
	};

	const isDisabled = !isEditMode || isSaving;

	return (
		<div className="space-y-8">
			{/* Header Card */}
			<div className="cc-fade-in">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-extrabold text-slate-900">Profile Settings</h1>
						<p className="mt-2 text-sm text-slate-600">Manage your profile information and career preferences</p>
					</div>
					<button
						type="button"
						onClick={() => setIsEditMode((prev) => !prev)}
						className={`rounded-xl px-6 py-3 font-semibold transition duration-200 ${isEditMode ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
					>
						{isEditMode ? "✕ Cancel" : "✏️ Edit Profile"}
					</button>
				</div>
			</div>

			{/* Personal Information Card */}
			<div className="cc-fade-in rounded-3xl bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg ring-1 ring-slate-200 sm:p-8" style={{ animationDelay: "100ms" }}>
				<div className="mb-6 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
						👤
					</div>
					<h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
				</div>

				<div className="grid gap-6 sm:grid-cols-2">
					<div>
						<label className="mb-2 block text-sm font-semibold text-slate-700">📧 Full Name</label>
						<input
							name="name"
							value={formData.name}
							onChange={onChange}
							disabled={isDisabled}
							className="cc-input disabled:bg-slate-100"
						/>
					</div>
					<div>
						<label className="mb-2 block text-sm font-semibold text-slate-700">🎓 Education Level</label>
						<input
							name="educationLevel"
							value={formData.educationLevel}
							onChange={onChange}
							disabled={isDisabled}
							className="cc-input disabled:bg-slate-100"
						/>
					</div>
				</div>
			</div>

			{/* Professional Profile Card */}
			<div className="cc-fade-in rounded-3xl bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg ring-1 ring-slate-200 sm:p-8" style={{ animationDelay: "150ms" }}>
				<div className="mb-6 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
						💼
					</div>
					<h2 className="text-xl font-bold text-slate-900">Professional Profile</h2>
				</div>

				<div className="grid gap-6 sm:grid-cols-2">
					<div>
						<label className="mb-2 block text-sm font-semibold text-slate-700">🔧 Skills</label>
						<input
							name="skills"
							value={formData.skills}
							onChange={onChange}
							disabled={isDisabled}
							placeholder="Ex: Python, UI Design, Leadership"
							className="cc-input disabled:bg-slate-100"
						/>
						<p className="mt-1 text-xs text-slate-500">Separate skills with commas</p>
					</div>
					<div>
						<label className="mb-2 block text-sm font-semibold text-slate-700">📍 Preferred Location</label>
						<input
							name="preferredLocation"
							value={formData.preferredLocation}
							onChange={onChange}
							disabled={isDisabled}
							placeholder="Ex: Bengaluru, Remote"
							className="cc-input disabled:bg-slate-100"
						/>
					</div>
				</div>

				<div className="mt-6">
					<label className="mb-2 block text-sm font-semibold text-slate-700">🎯 Career Goal</label>
					<textarea
						name="careerGoal"
						value={formData.careerGoal}
						onChange={onChange}
						disabled={isDisabled}
						rows={4}
						placeholder="Describe your career aspirations and goals..."
						className="cc-input disabled:bg-slate-100"
					/>
					<p className="mt-1 text-xs text-slate-500">Share your vision for your career journey</p>
				</div>
			</div>

			{/* Interests Card */}
			<div className="cc-fade-in rounded-3xl bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg ring-1 ring-slate-200 sm:p-8" style={{ animationDelay: "200ms" }}>
				<div className="mb-6 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
						⚡
					</div>
					<h2 className="text-xl font-bold text-slate-900">Career Interests</h2>
				</div>

				<div>
					<label className="mb-4 block text-sm font-semibold text-slate-700">Choose your interests</label>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{interestOptions.map((interest) => (
							<label
								key={interest}
								className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
									formData.interests.includes(interest)
										? "border-indigo-600 bg-indigo-50"
										: "border-slate-200 bg-white hover:border-indigo-300"
								} ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								<input
									type="checkbox"
									checked={formData.interests.includes(interest)}
									onChange={() => onToggleInterest(interest)}
									disabled={isDisabled}
									className="h-5 w-5 cursor-pointer accent-indigo-600"
								/>
								<span className="text-sm font-medium text-slate-700">{interest}</span>
							</label>
						))}
					</div>
				</div>

				{/* Custom Interests Section */}
				<div className="mt-6 border-t-2 border-slate-200 pt-6">
					<label className="mb-3 block text-sm font-semibold text-slate-700">➕ Add Custom Interest</label>
					<div className="flex gap-3">
						<input
							type="text"
							name="customInterest"
							value={formData.customInterest}
							onChange={onChange}
							disabled={isDisabled}
							placeholder="Enter custom interest..."
							className="cc-input flex-1 disabled:bg-slate-100"
						/>
						<button
							type="button"
							onClick={addCustomInterest}
							disabled={isDisabled || !formData.customInterest.trim()}
							className="rounded-xl bg-indigo-600 px-6 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Add
						</button>
					</div>
				</div>

				{/* Display selected interests including custom ones */}
				{formData.interests.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-2">
						{formData.interests.map((interest) => (
							<div
								key={interest}
								className="flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
							>
								<span>{interest}</span>
								<button
									type="button"
									onClick={() => removeInterest(interest)}
									disabled={isDisabled}
									className="ml-1 cursor-pointer text-lg font-bold hover:text-indigo-900 disabled:opacity-50"
								>
									×
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Status Messages and Save Button */}
			<div className="cc-fade-in" style={{ animationDelay: "250ms" }}>
				{status.message && (
					<div
						className={`rounded-xl border px-4 py-3 text-sm font-medium ${
							status.type === "success"
								? "border-emerald-200 bg-emerald-50 text-emerald-700"
								: "border-red-200 bg-red-50 text-red-700"
						}`}
					>
						{status.type === "success" ? "✓" : "⚠️"} {status.message}
					</div>
				)}

				{isEditMode && (
					<button
						type="button"
						onClick={onSave}
						disabled={isSaving}
						className="cc-cta mt-6 w-full flex items-center justify-center disabled:opacity-70"
					>
						{isSaving ? <Loader label="Saving..." size="sm" /> : "💾 Save Profile"}
					</button>
				)}
			</div>
		</div>
	);
}

export default Profile;
