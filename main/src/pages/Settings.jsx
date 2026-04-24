import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { EDUCATION_LEVELS, updateUserProfile } from "../services/authService";
import { openChatbot } from "../services/chatbotService";
import {
	getProfile,
	getPreferences,
	updatePreferences,
	changePassword,
	resetTests,
	resetRecommendations,
} from "../services/profileService";
import {
	getSoundEnabled,
	setSoundEnabled,
	playClickSound,
	playSuccessSound,
	playErrorSound,
} from "../utils/sound";
import { getAutoScrollEnabled, setAutoScrollEnabled } from "../utils/autoScroll";
import { isDarkModeEnabled, setDarkModeEnabled } from "../utils/theme";

function Settings() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(true);

	const [profileForm, setProfileForm] = useState({
		name: "",
		educationLevel: "Class 12",
		interestsInput: "",
	});

	const [preferences, setPreferences] = useState({
		internship: true,
		job: true,
		scholarship: true,
		exam: true,
	});
	const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled());
	const [autoScrollEnabled, setAutoScrollEnabledState] = useState(getAutoScrollEnabled());
	const [darkModeEnabled, setDarkModeEnabledState] = useState(isDarkModeEnabled());

	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [sendingPasswordOtp, setSendingPasswordOtp] = useState(false);
	const [passwordOtpStep, setPasswordOtpStep] = useState(false);
	const [passwordOtp, setPasswordOtp] = useState("");

	const [savingProfile, setSavingProfile] = useState(false);
	const [savingPreferences, setSavingPreferences] = useState(false);
	const [changingPassword, setChangingPassword] = useState(false);
	const [runningReset, setRunningReset] = useState("");

	const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
	const [preferenceMessage, setPreferenceMessage] = useState({ type: "", text: "" });
	const [securityMessage, setSecurityMessage] = useState({ type: "", text: "" });
	const [dataMessage, setDataMessage] = useState({ type: "", text: "" });

	useEffect(() => {
		const loadData = async () => {
			setIsLoading(true);
			try {
				const [profileData, preferenceData] = await Promise.all([getProfile(), getPreferences()]);

				setProfileForm({
					name: profileData?.name || "",
					educationLevel: profileData?.educationLevel || "Class 12",
					interestsInput: Array.isArray(profileData?.interests) ? profileData.interests.join(", ") : "",
				});

				setPreferences({
					internship: Boolean(preferenceData?.internship),
					job: Boolean(preferenceData?.job),
					scholarship: Boolean(preferenceData?.scholarship),
					exam: Boolean(preferenceData?.exam),
				});
			} catch {
				playErrorSound();
				setDataMessage({ type: "error", text: "Unable to load settings. Please refresh." });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, []);

	const parseInterests = (raw) => {
		return String(raw || "")
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	};

	const handleSaveProfile = async () => {
		setSavingProfile(true);
		setProfileMessage({ type: "", text: "" });
		try {
			await updateUserProfile({
				name: profileForm.name,
				educationLevel: profileForm.educationLevel,
				interests: parseInterests(profileForm.interestsInput),
			});
			playSuccessSound();
			setProfileMessage({ type: "success", text: "Profile settings saved successfully." });
		} catch {
			playErrorSound();
			setProfileMessage({ type: "error", text: "Failed to save profile settings." });
		} finally {
			setSavingProfile(false);
		}
	};

	const handleSavePreferences = async () => {
		setSavingPreferences(true);
		setPreferenceMessage({ type: "", text: "" });
		try {
			await updatePreferences(preferences);
			playSuccessSound();
			setPreferenceMessage({ type: "success", text: "Preferences saved." });
		} catch {
			playErrorSound();
			setPreferenceMessage({ type: "error", text: "Failed to save preferences." });
		} finally {
			setSavingPreferences(false);
		}
	};

	const handleChangePassword = async (event) => {
		event.preventDefault();
		setSecurityMessage({ type: "", text: "" });

		if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
			playErrorSound();
			setSecurityMessage({ type: "error", text: "All password fields are required." });
			return;
		}
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			playErrorSound();
			setSecurityMessage({ type: "error", text: "New password and confirm password must match." });
			return;
		}

		if (passwordOtpStep && !passwordOtp.trim()) {
			playErrorSound();
			setSecurityMessage({ type: "error", text: "Please enter the OTP sent to your email." });
			return;
		}

		setChangingPassword(true);
		try {
			await changePassword({
				current_password: passwordForm.currentPassword,
				new_password: passwordForm.newPassword,
				otp: passwordOtpStep ? passwordOtp : undefined,
			});

			if (!passwordOtpStep) {
				setPasswordOtpStep(true);
				playSuccessSound();
				setSecurityMessage({ type: "success", text: "OTP sent to your email. Enter it to confirm password change." });
				return;
			}

			setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
			setPasswordOtp("");
			setPasswordOtpStep(false);
			playSuccessSound();
			setSecurityMessage({ type: "success", text: "Password changed successfully." });
		} catch (error) {
			const backendError = error?.response?.data?.error || error?.response?.data?.message;
			playErrorSound();
			setSecurityMessage({ type: "error", text: backendError || "Unable to change password." });
		} finally {
			setChangingPassword(false);
		}
	};

	const handleResendPasswordOtp = async () => {
		setSecurityMessage({ type: "", text: "" });
		if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
			playErrorSound();
			setSecurityMessage({ type: "error", text: "Please fill password fields before requesting OTP." });
			return;
		}

		setSendingPasswordOtp(true);
		try {
			await changePassword({
				current_password: passwordForm.currentPassword,
				new_password: passwordForm.newPassword,
			});
			playSuccessSound();
			setSecurityMessage({ type: "success", text: "A new OTP has been sent to your email." });
		} catch (error) {
			const backendError = error?.response?.data?.error || error?.response?.data?.message;
			playErrorSound();
			setSecurityMessage({ type: "error", text: backendError || "Unable to resend OTP." });
		} finally {
			setSendingPasswordOtp(false);
		}
	};

	const handleResetTests = async () => {
		if (!window.confirm("Are you sure you want to reset all your test history?")) return;
		setRunningReset("tests");
		setDataMessage({ type: "", text: "" });
		try {
			await resetTests();
			playSuccessSound();
			setDataMessage({ type: "success", text: "Test data reset successfully." });
		} catch {
			playErrorSound();
			setDataMessage({ type: "error", text: "Failed to reset test data." });
		} finally {
			setRunningReset("");
		}
	};

	const handleResetRecommendations = async () => {
		if (!window.confirm("Are you sure you want to reset recommendations and saved roadmaps?")) return;
		setRunningReset("recommendations");
		setDataMessage({ type: "", text: "" });
		try {
			await resetRecommendations();
			playSuccessSound();
			setDataMessage({ type: "success", text: "Recommendation data reset successfully." });
		} catch {
			playErrorSound();
			setDataMessage({ type: "error", text: "Failed to reset recommendation data." });
		} finally {
			setRunningReset("");
		}
	};

	const handleReuploadCVInChatbot = () => {
		playClickSound();
		openChatbot("__UPLOAD_CV__");
		setDataMessage({
			type: "success",
			text: "Chatbot opened. Upload your renewed CV there to refresh skills, recommendations, and skill tests.",
		});
	};

	const handleToggleSound = (enabled) => {
		setSoundEnabled(enabled);
		setSoundEnabledState(enabled);
		if (enabled) {
			playClickSound();
		}
	};

	const handleToggleAutoScroll = (enabled) => {
		const value = setAutoScrollEnabled(enabled);
		setAutoScrollEnabledState(value);
		if (soundEnabled) {
			playClickSound();
		}
	};

	const handleToggleDarkMode = (enabled) => {
		const value = setDarkModeEnabled(enabled);
		setDarkModeEnabledState(value);
		if (soundEnabled) {
			playClickSound();
		}
	};

	const messageClass = (status) =>
		status?.type === "success"
			? "border-emerald-200 bg-emerald-50 text-emerald-700"
			: "border-red-200 bg-red-50 text-red-700";

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-lg">
				<Loader label="Loading settings..." />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="cc-fade-in rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-8 text-white shadow-xl">
				<p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Account Controls</p>
				<h1 className="mt-2 text-4xl font-extrabold">⚙️ Settings</h1>
				<p className="mt-2 text-indigo-100">Manage your profile, preferences, security, and data controls in one place.</p>
			</div>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "100ms" }}>
				<h2 className="text-xl font-bold text-slate-900">👤 Profile Settings</h2>
				<div className="mt-4 grid gap-4 sm:grid-cols-2">
					<div>
						<label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
						<input
							className="cc-input"
							value={profileForm.name}
							onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
						/>
					</div>
					<div>
						<label className="mb-2 block text-sm font-semibold text-slate-700">Education Level</label>
						<select
							className="cc-input"
							value={profileForm.educationLevel}
							onChange={(event) => setProfileForm((prev) => ({ ...prev, educationLevel: event.target.value }))}
						>
							{EDUCATION_LEVELS.map((level) => (
								<option key={level} value={level}>
									{level}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="mt-4">
					<label className="mb-2 block text-sm font-semibold text-slate-700">Interests</label>
					<input
						className="cc-input"
						placeholder="Technology, Design, Business"
						value={profileForm.interestsInput}
						onChange={(event) => setProfileForm((prev) => ({ ...prev, interestsInput: event.target.value }))}
					/>
					<p className="mt-1 text-xs text-slate-500">Separate interests with commas</p>
				</div>
				<button
					type="button"
					onClick={handleSaveProfile}
					disabled={savingProfile}
					className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
				>
					{savingProfile ? "Saving..." : "Save Changes"}
				</button>
				{profileMessage.text && <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${messageClass(profileMessage)}`}>{profileMessage.text}</p>}
			</section>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "150ms" }}>
				<h2 className="text-xl font-bold text-slate-900">🎯 Preferences</h2>
				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					{[
						{ key: "internship", label: "Internships" },
						{ key: "job", label: "Jobs" },
						{ key: "scholarship", label: "Scholarships" },
						{ key: "exam", label: "Exams" },
					].map((item) => (
						<label key={item.key} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
							<input
								type="checkbox"
								checked={Boolean(preferences[item.key])}
								onChange={(event) =>
									setPreferences((prev) => ({
										...prev,
										[item.key]: event.target.checked,
									}))
								}
								className="h-4 w-4 accent-indigo-600"
							/>
							<span className="text-sm font-medium text-slate-700">{item.label}</span>
						</label>
					))}
				</div>
				<button
					type="button"
					onClick={handleSavePreferences}
					disabled={savingPreferences}
					className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
				>
					{savingPreferences ? "Saving..." : "Save Preferences"}
				</button>
				{preferenceMessage.text && <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${messageClass(preferenceMessage)}`}>{preferenceMessage.text}</p>}
			</section>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "200ms" }}>
				<h2 className="text-xl font-bold text-slate-900">🔊 Sound Settings</h2>
				<div className="mt-4">
					<label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
						<div>
							<p className="text-sm font-semibold text-slate-800">Enable UI Sound Effects</p>
							<p className="text-xs text-slate-500">Subtle click, success, and error feedback</p>
						</div>
						<input
							type="checkbox"
							checked={soundEnabled}
							onChange={(event) => handleToggleSound(event.target.checked)}
							className="h-4 w-4 accent-indigo-600"
						/>
					</label>
				</div>
			</section>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "210ms" }}>
				<h2 className="text-xl font-bold text-slate-900">🖱️ Auto Scroll</h2>
				<div className="mt-4">
					<label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
						<div>
							<p className="text-sm font-semibold text-slate-800">Enable Slow Auto Scroll</p>
							<p className="text-xs text-slate-500">Automatically scrolls pages slowly; pauses when you touch mouse/touchpad/keyboard and resumes after idle.</p>
						</div>
						<input
							type="checkbox"
							checked={autoScrollEnabled}
							onChange={(event) => handleToggleAutoScroll(event.target.checked)}
							className="h-4 w-4 accent-indigo-600"
						/>
					</label>
				</div>
			</section>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "220ms" }}>
				<h2 className="text-xl font-bold text-slate-900">🌙 Appearance</h2>
				<div className="mt-4">
					<label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
						<div>
							<p className="text-sm font-semibold text-slate-800">Enable Premium Dark Mode</p>
							<p className="text-xs text-slate-500">Applies a global premium dark theme across all pages</p>
						</div>
						<input
							type="checkbox"
							checked={darkModeEnabled}
							onChange={(event) => handleToggleDarkMode(event.target.checked)}
							className="h-4 w-4 accent-indigo-600"
						/>
					</label>
				</div>
			</section>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "225ms" }}>
				<h2 className="text-xl font-bold text-slate-900">🔐 Security</h2>
				<form className="mt-4 space-y-3" onSubmit={handleChangePassword}>
					<input
						type="password"
						placeholder="Current Password"
						className="cc-input"
						value={passwordForm.currentPassword}
						onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
					/>
					<input
						type="password"
						placeholder="New Password"
						className="cc-input"
						value={passwordForm.newPassword}
						onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
					/>
					<input
						type="password"
						placeholder="Confirm Password"
						className="cc-input"
						value={passwordForm.confirmPassword}
						onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
					/>
					{passwordOtpStep && (
						<>
							<input
								type="text"
								placeholder="Enter 6-digit OTP"
								className="cc-input text-center tracking-[0.3em]"
								value={passwordOtp}
								onChange={(event) => setPasswordOtp(event.target.value)}
								maxLength={6}
							/>
							<button
								type="button"
								onClick={handleResendPasswordOtp}
								disabled={sendingPasswordOtp || changingPassword}
								className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
							>
								{sendingPasswordOtp ? "Sending OTP..." : "Resend OTP"}
							</button>
						</>
					)}
					<button
						type="submit"
						disabled={changingPassword || sendingPasswordOtp}
						className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
					>
						{changingPassword ? "Updating..." : passwordOtpStep ? "Verify OTP & Change" : "Send OTP"}
					</button>
				</form>
				{securityMessage.text && <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${messageClass(securityMessage)}`}>{securityMessage.text}</p>}
			</section>

			<section className="cc-fade-in rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200" style={{ animationDelay: "250ms" }}>
				<h2 className="text-xl font-bold text-slate-900">🧹 Data Controls</h2>
				<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<button
						type="button"
						onClick={handleResetTests}
						disabled={runningReset === "tests"}
						className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
					>
						{runningReset === "tests" ? "Resetting..." : "Reset Tests"}
					</button>
					<button
						type="button"
						onClick={handleResetRecommendations}
						disabled={runningReset === "recommendations"}
						className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
					>
						{runningReset === "recommendations" ? "Resetting..." : "Reset Recommendations"}
					</button>
					<button
						type="button"
						onClick={handleReuploadCVInChatbot}
						className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
					>
						Re-upload CV (Chatbot)
					</button>
				</div>
				{dataMessage.text && <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${messageClass(dataMessage)}`}>{dataMessage.text}</p>}
			</section>
		</div>
	);
}

export default Settings;
