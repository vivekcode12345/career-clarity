import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Loader from "../components/Loader";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { getPostAuthRedirectPath, loginUser, loginWithGoogle, saveAuthSession } from "../services/authService";

const initialFormData = {
	identifier: "",
	password: "",
};

function Login() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState(initialFormData);
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const onChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		setIsLoading(true);

		try {
			const response = await loginUser(formData);
			saveAuthSession(response);
			setSuccessMessage("Login successful. Redirecting to dashboard...");
			setFormData(initialFormData);

			setTimeout(() => {
				navigate(getPostAuthRedirectPath(response));
			}, 800);
		} catch (error) {
			const apiError = error.response?.data?.error || error.response?.data?.message;
			setErrorMessage(apiError || "Unable to connect to server. Check backend/CORS and try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleCredential = async (credential) => {
		setErrorMessage("");
		setSuccessMessage("");
		setIsGoogleLoading(true);

		try {
			const response = await loginWithGoogle(credential);
			saveAuthSession(response);
			setSuccessMessage("Google login successful. Redirecting...");
			setTimeout(() => {
				navigate(getPostAuthRedirectPath(response));
			}, 400);
		} catch (error) {
			const apiError = error.response?.data?.error || error.response?.data?.message;
			setErrorMessage(apiError || "Google login failed. Please try again.");
		} finally {
			setIsGoogleLoading(false);
		}
	};

	const handleGoogleError = (message) => {
		setErrorMessage(message || "Google login is currently unavailable.");
	};

	return (
		<div className="grid min-h-screen gap-6 lg:grid-cols-2">
			{/* Left: Gradient showcase (hidden on mobile) */}
			<div className="hidden bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-400 p-8 lg:flex lg:flex-col lg:justify-center lg:items-center">
				<div className="space-y-6 text-white">
					<h1 className="cc-heading text-4xl font-extrabold leading-tight">Welcome back to your career journey</h1>
					<p className="text-lg text-indigo-100">Access personalized guidance, test results, and recommendations instantly.</p>
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								✓
							</div>
							<p className="font-medium">Quick career assessments</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								✓
							</div>
							<p className="font-medium">Personalized recommendations</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								✓
							</div>
							<p className="font-medium">AI-powered insights</p>
						</div>
					</div>
				</div>
			</div>

			{/* Right: Login form */}
			<div className="flex flex-col justify-center p-6 sm:p-8">
				<div className="mx-auto w-full max-w-sm space-y-6">
					<div className="cc-fade-in space-y-2">
						<h1 className="cc-heading text-3xl font-extrabold text-slate-900">Welcome back</h1>
						<p className="text-sm text-slate-600">Login to continue your personalized career guidance journey.</p>
					</div>

					<form onSubmit={onSubmit} className="cc-fade-in space-y-4">
						<div>
							<label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-slate-700">
								📧 Username or Email
							</label>
							<input
								id="identifier"
								name="identifier"
								type="text"
								value={formData.identifier}
								onChange={onChange}
								required
								placeholder="Enter username or email"
								className="cc-input"
							/>
						</div>

						<div>
							<label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
								🔐 Password
							</label>
							<div className="relative">
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									value={formData.password}
									onChange={onChange}
									required
									placeholder="••••••"
									className="cc-input pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((prev) => !prev)}
									className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-indigo-600"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? "🙈" : "👁️"}
								</button>
							</div>
							<div className="mt-2 flex justify-end">
								<a
									href="mailto:careerclarity.support@gmail.com?subject=Password%20Reset%20Request"
									className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline"
								>
									Forgot password?
								</a>
							</div>
						</div>

						{errorMessage && (
							<div className="cc-fade-in rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
								⚠️ {errorMessage}
							</div>
						)}
						{successMessage && (
							<div className="cc-fade-in rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
								✓ {successMessage}
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading}
							className="cc-cta w-full flex items-center justify-center py-3 shadow-lg"
						>
							{isLoading ? <Loader label="" size="sm" /> : "Sign In"}
						</button>
					</form>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-slate-200"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-white px-2 text-slate-600">Or continue with</span>
						</div>
					</div>

					<div className="space-y-3">
						<GoogleAuthButton onCredential={handleGoogleCredential} onError={handleGoogleError} mode="signin" />
						{isGoogleLoading && <p className="text-center text-xs font-medium text-slate-500">Completing Google sign-in...</p>}
					</div>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-slate-200"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-white px-2 text-slate-600">New here?</span>
						</div>
					</div>

					<Link
						to="/register"
						className="flex w-full items-center justify-center rounded-lg border-2 border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-100 hover:border-indigo-300"
					>
						Create account
					</Link>
				</div>
			</div>
		</div>
	);
}

export default Login;
