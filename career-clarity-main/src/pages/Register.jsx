import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Loader from "../components/Loader";
import { EDUCATION_LEVELS, registerUser, saveAuthSession } from "../services/authService";

const initialFormData = {
	name: "",
	email: "",
	password: "",
	educationLevel: "Class 12",
};

function Register() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState(initialFormData);
	const [isLoading, setIsLoading] = useState(false);
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
			const response = await registerUser(formData);
			saveAuthSession(response);
			setSuccessMessage("Registration successful. Redirecting to dashboard...");
			setFormData(initialFormData);

			setTimeout(() => {
				navigate("/dashboard");
			}, 800);
		} catch (error) {
			const apiError = error.response?.data?.error || error.response?.data?.message;
			setErrorMessage(apiError || "Unable to register. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="grid min-h-screen gap-6 lg:grid-cols-2">
			{/* Left: Gradient showcase (hidden on mobile) */}
			<div className="hidden bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-400 p-8 lg:flex lg:flex-col lg:justify-center lg:items-center">
				<div className="space-y-6 text-white">
					<h1 className="cc-heading text-4xl font-extrabold leading-tight">Start your career transformation today</h1>
					<p className="text-lg text-purple-100">Join thousands of students getting personalized guidance toward their dream careers.</p>
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								🎯
							</div>
							<p className="font-medium">Tailored career paths</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								📊
							</div>
							<p className="font-medium">Smart assessments & insights</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								🚀
							</div>
							<p className="font-medium">Get ahead of the curve</p>
						</div>
					</div>
				</div>
			</div>

			{/* Right: Register form */}
			<div className="flex flex-col justify-center p-6 sm:p-8">
				<div className="mx-auto w-full max-w-sm space-y-6">
					<div className="cc-fade-in space-y-2">
						<h1 className="cc-heading text-3xl font-extrabold text-slate-900">Create your account</h1>
						<p className="text-sm text-slate-600">Start your personalized education and career guidance journey.</p>
					</div>

					<form onSubmit={onSubmit} className="cc-fade-in space-y-4">
						<div>
							<label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
								👤 Full Name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								value={formData.name}
								onChange={onChange}
								required
								placeholder="John Doe"
								className="cc-input"
							/>
						</div>

						<div>
							<label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
								📧 Email
							</label>
							<input
								id="email"
								name="email"
								type="email"
								value={formData.email}
								onChange={onChange}
								required
								placeholder="your@email.com"
								className="cc-input"
							/>
						</div>

						<div>
							<label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
								🔐 Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								value={formData.password}
								onChange={onChange}
								required
								minLength={6}
								placeholder="••••••"
								className="cc-input"
							/>
						</div>

						<div>
							<label htmlFor="educationLevel" className="mb-2 block text-sm font-semibold text-slate-700">
								🎓 Education Level
							</label>
							<select
								id="educationLevel"
								name="educationLevel"
								value={formData.educationLevel}
								onChange={onChange}
								required
								className="cc-input bg-white"
							>
								{EDUCATION_LEVELS.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
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
							className="cc-cta w-full flex items-center justify-center gap-2 py-3 shadow-lg"
						>
							{isLoading ? <Loader label="Creating account..." size="sm" /> : "Get Started"}
						</button>
					</form>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-slate-200"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-white px-2 text-slate-600">Already have an account?</span>
						</div>
					</div>

					<Link
						to="/login"
						className="flex w-full items-center justify-center rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300"
					>
						Sign In
					</Link>
				</div>
			</div>
		</div>
	);
}

export default Register;
