import { Link, Navigate } from "react-router-dom";
import logoMark from "../assets/logo-mark.svg";
import { useEffect, useState } from "react";
import { isAuthenticated } from "../services/authService";

const showcaseSlides = [
	{
		title: "Personalized guidance for every learner",
		description:
			"From Class 10 to graduate level, get curated paths and decisions tailored to your goals.",
		points: ["Profile-aware suggestions", "Education-level specific routes", "Progressive learning journey"],
	},
	{
		title: "AI-powered career exploration",
		description:
			"Use smart recommendations, quick assessment insights, and chatbot support to make confident choices.",
		points: ["Quick test insights", "Career recommendation engine", "Always-available assistant"],
	},
	{
		title: "Actionable next steps, not generic advice",
		description:
			"Move from confusion to clarity with roadmaps, colleges, alerts, and skill-based direction.",
		points: ["Roadmap guidance", "College finder + alerts", "Real-world decision support"],
	},
];

function Home() {
	const isLoggedIn = isAuthenticated();

	// Redirect logged-in users to Dashboard
	if (isLoggedIn) {
		return <Navigate to="/dashboard" replace />;
	}

	// Guest view only
	const [activeSlide, setActiveSlide] = useState(0);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setActiveSlide((prev) => (prev + 1) % showcaseSlides.length);
		}, 3500);

		return () => window.clearInterval(interval);
	}, []);

	return (
		<div className="space-y-8">
			{/* Hero Section with Gradient */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-500 to-blue-600 p-8 text-white shadow-2xl sm:p-12">
				<div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/20 blur-3xl"></div>

				<div className="relative">
					<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 ring-1 ring-white/30">
						<img src={logoMark} alt="CareerClarity" className="h-5 w-5" />
						<p className="text-xs font-semibold uppercase tracking-wide">SIH Project • 25094</p>
					</div>

					<h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
						Your Future, Mapped Out for You 🎯
					</h1>

					<p className="mt-6 max-w-2xl text-lg leading-relaxed text-purple-100">
						Get AI-powered personalized guidance from Class 10 to graduation. Discover your perfect career path, top colleges, and actionable roadmaps—all in one place.
					</p>

					<div className="mt-8 flex flex-wrap gap-4">
						<Link
							to="/register"
							className="cc-cta inline-flex items-center gap-2 px-8 py-4 text-lg shadow-xl hover:shadow-2xl"
						>
							🚀 Get Started for Free
						</Link>
						<Link
							to="/login"
							className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-8 py-4 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/30 hover:ring-white/50"
						>
							🔑 Sign In
						</Link>
					</div>

					{/* Quick Stats */}
					<div className="mt-10 grid gap-4 sm:grid-cols-3">
						<div className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 ring-1 ring-white/20">
							<p className="text-2xl font-bold">50+</p>
							<p className="text-sm text-purple-100">Career Paths</p>
						</div>
						<div className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 ring-1 ring-white/20">
							<p className="text-2xl font-bold">1000+</p>
							<p className="text-sm text-purple-100">Colleges Tracked</p>
						</div>
						<div className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 ring-1 ring-white/20">
							<p className="text-2xl font-bold">AI-Ready</p>
							<p className="text-sm text-purple-100">24/7 Chatbot Support</p>
						</div>
					</div>
				</div>
			</div>

			{/* Features Section */}
			<div className="cc-fade-in space-y-4" style={{ animationDelay: "100ms" }}>
				<h2 className="text-3xl font-extrabold text-slate-900">Why 1000+ students trust us</h2>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-md ring-1 ring-blue-200">
						<div className="text-4xl mb-3">📊</div>
						<h3 className="font-bold text-slate-900">Smart Tests</h3>
						<p className="mt-2 text-sm text-slate-700">Quick assessments to discover your strengths and career fit</p>
					</div>
					<div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-md ring-1 ring-purple-200">
						<div className="text-4xl mb-3">🎯</div>
						<h3 className="font-bold text-slate-900">AI Recommendations</h3>
						<p className="mt-2 text-sm text-slate-700">Get personalized career suggestions tailored to your profile</p>
					</div>
					<div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-md ring-1 ring-emerald-200">
						<div className="text-4xl mb-3">🏫</div>
						<h3 className="font-bold text-slate-900">College Finder</h3>
						<p className="mt-2 text-sm text-slate-700">Explore 1000+ colleges by location, course, and fees</p>
					</div>
					<div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-md ring-1 ring-orange-200">
						<div className="text-4xl mb-3">🤖</div>
						<h3 className="font-bold text-slate-900">AI Chatbot</h3>
						<p className="mt-2 text-sm text-slate-700">Chat anytime with our AI advisor for instant guidance</p>
					</div>
				</div>
			</div>

			{/* Showcase Carousel */}
			<div className="cc-fade-in space-y-4" style={{ animationDelay: "150ms" }}>
				<h2 className="text-3xl font-extrabold text-slate-900">Platform Highlights</h2>

				<div className="rounded-3xl bg-white p-8 shadow-xl sm:p-10 ring-1 ring-slate-200">
					<div className="relative rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-8">
						<div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
							{activeSlide + 1}
						</div>

						<h3 className="cc-heading mt-4 text-2xl font-extrabold text-slate-900">
							{showcaseSlides[activeSlide].title}
						</h3>

						<p className="mt-4 text-slate-700 leading-relaxed">{showcaseSlides[activeSlide].description}</p>

						<div className="mt-6 grid gap-3 sm:grid-cols-3">
							{showcaseSlides[activeSlide].points.map((point, idx) => (
								<div
									key={point}
									className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3"
								>
									<span className="text-xl font-bold text-indigo-600">✓</span>
									<span className="font-medium text-slate-800">{point}</span>
								</div>
							))}
						</div>
					</div>

					{/* Carousel Controls */}
					<div className="mt-8 flex items-center justify-between">
						<div className="flex items-center gap-2">
							{showcaseSlides.map((_, index) => (
								<button
									key={index}
									type="button"
									onClick={() => setActiveSlide(index)}
									className={`transition-all ${
										index === activeSlide
											? "h-3 w-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600"
											: "h-3 w-3 rounded-full bg-slate-300 hover:bg-slate-400"
									}`}
									aria-label={`Go to slide ${index + 1}`}
								/>
							))}
						</div>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setActiveSlide((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length)}
								className="flex items-center gap-2 rounded-lg bg-indigo-100 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-200"
							>
								← Prev
							</button>
							<button
								type="button"
								onClick={() => setActiveSlide((prev) => (prev + 1) % showcaseSlides.length)}
								className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
							>
								Next →
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Key Features Cards */}
			<div className="cc-fade-in space-y-4" style={{ animationDelay: "200ms" }}>
				<h2 className="text-3xl font-extrabold text-slate-900">Everything You Need</h2>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
						<div className="text-4xl mb-3">🎓</div>
						<h3 className="font-bold text-slate-900">Education-Level Tailored</h3>
						<p className="mt-2 text-sm text-slate-600">
							Personalized guidance from Class 10 through graduation with education-specific recommendations
						</p>
					</div>
					<div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
						<div className="text-4xl mb-3">🛣️</div>
						<h3 className="font-bold text-slate-900">Roadmap Guidance</h3>
						<p className="mt-2 text-sm text-slate-600">
							Step-by-step career roadmaps with timelines, exams, certifications, and required skills
						</p>
					</div>
					<div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
						<div className="text-4xl mb-3">💼</div>
						<h3 className="font-bold text-slate-900">CV Analysis</h3>
						<p className="mt-2 text-sm text-slate-600">
							Upload your resume for AI-powered skill gap analysis and career suggestions
						</p>
					</div>
					<div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
						<div className="text-4xl mb-3">📅</div>
						<h3 className="font-bold text-slate-900">Smart Alerts</h3>
						<p className="mt-2 text-sm text-slate-600">
							Never miss deadlines with notifications for admissions, scholarships, and exams
						</p>
					</div>
					<div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
						<div className="text-4xl mb-3">🔒</div>
						<h3 className="font-bold text-slate-900">Your Privacy Matters</h3>
						<p className="mt-2 text-sm text-slate-600">
							Your data is secure with enterprise-grade encryption and zero tracking
						</p>
					</div>
					<div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
						<div className="text-4xl mb-3">⚡</div>
						<h3 className="font-bold text-slate-900">Always Available</h3>
						<p className="mt-2 text-sm text-slate-600">
							24/7 AI chatbot support to answer your questions anytime, anywhere
						</p>
					</div>
				</div>
			</div>

			{/* CTA Section */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white shadow-xl sm:p-12" style={{ animationDelay: "250ms" }}>
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<h2 className="text-3xl font-extrabold sm:text-4xl">Ready to shape your future? 🚀</h2>
					<p className="mt-4 text-lg text-purple-100">
						Join thousands of students getting clarity on their career path with AI-powered guidance
					</p>

					<div className="mt-8 flex flex-wrap justify-center gap-4">
						<Link
							to="/register"
							className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 font-bold text-indigo-600 transition hover:bg-purple-50"
						>
							Create Free Account →
						</Link>
						<Link
							to="/login"
							className="inline-flex items-center gap-2 rounded-lg border-2 border-white bg-transparent px-8 py-4 font-bold text-white transition hover:bg-white/10"
						>
							Already a member? Sign in →
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Home;