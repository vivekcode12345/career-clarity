import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isAuthenticated } from "../services/authService";
import slide1 from "../assets/landing/slide1.jpeg";
import slide2 from "../assets/landing/slide2.jpeg";
import slide3 from "../assets/landing/slide3.jpeg";
import slide4 from "../assets/landing/slide4.jpeg";

const heroSlides = [
	{
		title: "Discover Your Perfect Career Path",
		subtitle: "AI-powered guidance tailored to your skills and interests",
		cta: "Get Started",
		to: "/register",
		image: slide1,
		alt: "Students reviewing personalized AI career guidance",
	},
	{
		title: "Identify Your Skill Gaps",
		subtitle: "Understand what you need to learn to reach your goals",
		cta: "Upload CV",
		to: "/register",
		image: slide2,
		alt: "Career readiness dashboard showing skill gap analysis",
	},
	{
		title: "Never Miss Opportunities",
		subtitle: "Internships, scholarships, and jobs personalized for you",
		cta: "Explore Alerts",
		to: "/register",
		image: slide3,
		alt: "Student tracking scholarship, internship, and job opportunities",
	},
	{
		title: "Build Confidence With Guided Next Steps",
		subtitle: "From profile setup to roadmaps, every action is clear and measurable",
		cta: "Start Now",
		to: "/register",
		image: slide4,
		alt: "Learner exploring guided career action steps in a modern dashboard",
	},
];

function Home() {
	const isLoggedIn = isAuthenticated();

	// Redirect logged-in users to Dashboard
	if (isLoggedIn) {
		return <Navigate to="/dashboard" replace />;
	}

	const [activeSlide, setActiveSlide] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const [isTabVisible, setIsTabVisible] = useState(!document.hidden);

	useEffect(() => {
		const handleVisibility = () => {
			setIsTabVisible(!document.hidden);
		};

		document.addEventListener("visibilitychange", handleVisibility);
		return () => document.removeEventListener("visibilitychange", handleVisibility);
	}, []);

	useEffect(() => {
		if (isPaused || !isTabVisible) {
			return undefined;
		}

		const timer = window.setTimeout(() => {
			setActiveSlide((prev) => (prev + 1) % heroSlides.length);
		}, 3000);

		return () => window.clearTimeout(timer);
	}, [activeSlide, isPaused, isTabVisible]);

	const goToPrevious = () => {
		setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
	};

	const goToNext = () => {
		setActiveSlide((prev) => (prev + 1) % heroSlides.length);
	};

	return (
		<div className="space-y-16 pb-6">
			<header className="-mx-4 -mt-10 sm:-mx-6 lg:-mx-8">
				<section className="relative min-h-[80vh] overflow-hidden">
					{heroSlides.map((slide, index) => (
						<div
							key={slide.title}
							className={`absolute inset-0 transition-all duration-1000 ease-out ${
								index === activeSlide
									? "z-10 translate-x-0 opacity-100"
									: "z-0 translate-x-3 opacity-0"
							}`}
							aria-hidden={index !== activeSlide}
						>
							<img
								src={slide.image}
								alt={slide.alt}
								className={`h-full w-full object-cover transition-transform duration-[3000ms] ease-out ${
									index === activeSlide ? "scale-105" : "scale-100 blur-[1px]"
								}`}
								loading={index === 0 ? "eager" : "lazy"}
							/>
							<div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-slate-900/65" />

							<div className="absolute inset-0 z-20 flex items-center justify-center px-6 py-20">
								<div
									className={`max-w-4xl rounded-3xl border border-white/30 bg-black/10 px-6 py-8 text-center text-white shadow-2xl backdrop-blur-sm transition-all duration-700 sm:px-10 ${
										index === activeSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
									}`}
								>
									<p className="animate-[heroBadgeIn_700ms_ease-out] rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ring-white/35">
										CareerClarity Platform
									</p>
									<h1 className="animate-[heroTitleIn_900ms_ease-out] mt-6 text-4xl font-extrabold leading-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
										{slide.title}
									</h1>
									<p className="animate-[heroSubIn_1000ms_ease-out] mx-auto mt-4 max-w-2xl text-base text-slate-100 sm:text-lg">
										{slide.subtitle}
									</p>
									<div className="animate-[heroActionsIn_1100ms_ease-out] mt-8 flex flex-wrap items-center justify-center gap-4">
										<Link
											to={slide.to}
											className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:from-indigo-400 hover:to-violet-400 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
										>
											{slide.cta}
										</Link>
										<Link
											to="/login"
											className="rounded-xl border border-white/70 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/25 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
										>
											Login
										</Link>
									</div>
								</div>
							</div>
						</div>
					))}

					<div className="absolute bottom-20 left-1/2 z-30 h-1.5 w-56 -translate-x-1/2 overflow-hidden rounded-full bg-white/30" aria-hidden="true">
						<div
							key={`progress-${activeSlide}`}
							className="h-full w-full origin-left animate-[grow_3000ms_linear] bg-white"
						/>
					</div>

					<button
						type="button"
						onClick={goToPrevious}
						onMouseEnter={() => setIsPaused(true)}
						onMouseLeave={() => setIsPaused(false)}
						className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-black/35 p-3 text-white transition duration-300 hover:-translate-y-1/2 hover:scale-110 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
						aria-label="Previous slide"
					>
						←
					</button>
					<button
						type="button"
						onClick={goToNext}
						onMouseEnter={() => setIsPaused(true)}
						onMouseLeave={() => setIsPaused(false)}
						className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-black/35 p-3 text-white transition duration-300 hover:-translate-y-1/2 hover:scale-110 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
						aria-label="Next slide"
					>
						→
					</button>

					<div
						className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2"
						onMouseEnter={() => setIsPaused(true)}
						onMouseLeave={() => setIsPaused(false)}
					>
						{heroSlides.map((slide, index) => (
							<button
								key={slide.title}
								type="button"
								onClick={() => setActiveSlide(index)}
								className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
									index === activeSlide ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"
								}`}
								aria-label={`Go to ${slide.title}`}
							/>
						))}
					</div>
				</section>
			</header>

			<section id="features" className="cc-fade-in scroll-mt-28" style={{ animationDelay: "80ms" }}>
				<div className="mx-auto max-w-6xl">
					<h2 className="text-center text-3xl font-extrabold text-slate-900 sm:text-4xl">Why Choose CareerClarity?</h2>
					<p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
						A complete guidance platform designed to move you from confusion to confident decisions.
					</p>
					<div className="mt-10 grid gap-6 md:grid-cols-3">
						<article className="group rounded-2xl bg-gradient-to-br from-white to-indigo-50 p-7 shadow-md ring-1 ring-slate-200 transition duration-300 hover:-translate-y-2 hover:shadow-xl">
							<p className="text-3xl" aria-hidden="true">🎯</p>
							<h3 className="mt-4 text-xl font-bold text-slate-900 transition duration-300 group-hover:text-indigo-600">Smart Career Recommendations</h3>
							<p className="mt-2 text-sm leading-6 text-slate-600">
								Get AI-backed recommendations aligned to your interests, performance, and skills.
							</p>
						</article>
						<article className="group rounded-2xl bg-gradient-to-br from-white to-violet-50 p-7 shadow-md ring-1 ring-slate-200 transition duration-300 hover:-translate-y-2 hover:shadow-xl">
							<p className="text-3xl" aria-hidden="true">🧠</p>
							<h3 className="mt-4 text-xl font-bold text-slate-900 transition duration-300 group-hover:text-indigo-600">Skill Gap Analysis</h3>
							<p className="mt-2 text-sm leading-6 text-slate-600">
								Know exactly what to learn next with focused skill insights from your profile and CV.
							</p>
						</article>
						<article className="group rounded-2xl bg-gradient-to-br from-white to-cyan-50 p-7 shadow-md ring-1 ring-slate-200 transition duration-300 hover:-translate-y-2 hover:shadow-xl">
							<p className="text-3xl" aria-hidden="true">🔔</p>
							<h3 className="mt-4 text-xl font-bold text-slate-900 transition duration-300 group-hover:text-indigo-600">Real-time Opportunities</h3>
							<p className="mt-2 text-sm leading-6 text-slate-600">
								Track internships, scholarships, and jobs personalized to your education level and goals.
							</p>
						</article>
					</div>
				</div>
			</section>

			<section id="how-it-works" className="cc-fade-in scroll-mt-28" style={{ animationDelay: "120ms" }}>
				<div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
					<h2 className="text-center text-3xl font-extrabold text-slate-900 sm:text-4xl">How It Works</h2>
					<div className="mt-10 grid gap-5 md:grid-cols-3">
						<div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 p-6 text-center transition duration-300 hover:-translate-y-1 hover:shadow-md">
							<p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">1</p>
							<h3 className="mt-4 text-lg font-bold text-slate-900">Complete Profile</h3>
							<p className="mt-2 text-sm text-slate-600">Add interests, skills, and education details.</p>
						</div>
						<div className="rounded-2xl bg-gradient-to-br from-slate-50 to-violet-50 p-6 text-center transition duration-300 hover:-translate-y-1 hover:shadow-md">
							<p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">2</p>
							<h3 className="mt-4 text-lg font-bold text-slate-900">Take Tests / Upload CV</h3>
							<p className="mt-2 text-sm text-slate-600">Share your strengths so recommendations stay precise.</p>
						</div>
						<div className="rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50 p-6 text-center transition duration-300 hover:-translate-y-1 hover:shadow-md">
							<p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">3</p>
							<h3 className="mt-4 text-lg font-bold text-slate-900">Get Recommendations & Alerts</h3>
							<p className="mt-2 text-sm text-slate-600">Receive roadmaps, colleges, and opportunities to act on.</p>
						</div>
					</div>
				</div>
			</section>

			<section className="cc-fade-in" style={{ animationDelay: "160ms" }}>
				<div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-10 text-center text-white shadow-xl">
					<h2 className="text-3xl font-extrabold sm:text-4xl">Start Your Career Journey Today</h2>
					<p className="mx-auto mt-3 max-w-2xl text-indigo-100">
						Join CareerClarity and unlock personalized guidance built around your goals.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
						<Link
							to="/register"
							className="rounded-xl bg-white px-8 py-3 font-semibold text-indigo-700 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
						>
							Get Started
						</Link>
						<Link
							to="/login"
							className="rounded-xl border border-white/70 px-8 py-3 font-semibold text-white transition duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
						>
							Login
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}

export default Home;