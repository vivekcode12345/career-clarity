import { Link } from "react-router-dom";

function About() {
	return (
		<div className="space-y-10 pb-6">
			<section className="cc-fade-in">
				<div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl sm:p-10">
					<p className="inline-flex items-center rounded-full bg-white/20 px-4 py-1 text-xs font-semibold tracking-[0.2em] uppercase ring-1 ring-white/30">
						About CareerClarity
					</p>
					<h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
						Built with purpose, guided by passion.
					</h1>
					<p className="mt-4 max-w-3xl text-sm leading-7 text-indigo-100 sm:text-base">
						CareerClarity is a student-focused platform that helps learners understand career paths, identify skill gaps,
						and discover meaningful opportunities with confidence.
					</p>
				</div>
			</section>

			<section className="cc-fade-in" style={{ animationDelay: "80ms" }}>
				<div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
					<article className="cc-card p-7">
						<h2 className="cc-h2 text-slate-900">Who We Are</h2>
						<p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
							We are SRMAP University B.Tech students (2nd year). We created CareerClarity as part of our Python course,
							and built this project with sincere effort from our hearts to support students who need clear career guidance.
						</p>
						<div className="mt-5 inline-flex rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">
							SRMAP University • B.Tech • 2nd Year
						</div>
					</article>

					<article className="cc-card p-7">
						<h2 className="cc-h2 text-slate-900">Why We Built It</h2>
						<p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
							Many students feel unsure while choosing careers, colleges, and next learning steps. We wanted to build a
							single platform that turns confusion into clarity using practical insights, personalized recommendations,
							and actionable roadmaps.
						</p>
						<ul className="mt-4 space-y-2 text-sm text-slate-700">
							<li>• Personalized recommendations based on profile and tests</li>
							<li>• Skill-gap visibility to guide learning priorities</li>
							<li>• Opportunity alerts for internships, jobs, scholarships, and exams</li>
						</ul>
					</article>
				</div>
			</section>

			<section className="cc-fade-in" style={{ animationDelay: "120ms" }}>
				<div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-7 shadow-md sm:p-8">
					<h2 className="cc-h2 text-slate-900">Project Journey</h2>
					<div className="mt-6 grid gap-4 sm:grid-cols-3">
						<div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 p-5">
							<p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Step 1</p>
							<h3 className="mt-2 text-lg font-bold text-slate-900">Research</h3>
							<p className="mt-2 text-sm text-slate-600">Studied student pain points in choosing careers and opportunities.</p>
						</div>
						<div className="rounded-2xl bg-gradient-to-br from-slate-50 to-violet-50 p-5">
							<p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Step 2</p>
							<h3 className="mt-2 text-lg font-bold text-slate-900">Build</h3>
							<p className="mt-2 text-sm text-slate-600">Developed backend and frontend flows through our Python course project work.</p>
						</div>
						<div className="rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50 p-5">
							<p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Step 3</p>
							<h3 className="mt-2 text-lg font-bold text-slate-900">Refine</h3>
							<p className="mt-2 text-sm text-slate-600">Polished UI into a premium experience for clarity, trust, and ease of use.</p>
						</div>
					</div>
				</div>
			</section>

			<section className="cc-fade-in" style={{ animationDelay: "160ms" }}>
				<div className="mx-auto max-w-6xl rounded-3xl bg-slate-900 p-8 text-center text-white shadow-xl sm:p-10">
					<h2 className="text-3xl font-extrabold sm:text-4xl">Thank you for being part of our journey</h2>
					<p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
						CareerClarity is more than a project for us. It reflects our learning, teamwork, and commitment to helping
						students make better academic and career decisions.
					</p>
					<div className="mt-7 flex flex-wrap items-center justify-center gap-3">
						<Link to="/register" className="cc-btn-primary px-6 py-3">Get Started</Link>
						<Link to="/login" className="cc-btn-secondary px-6 py-3">Login</Link>
					</div>
				</div>
			</section>
		</div>
	);
}

export default About;
