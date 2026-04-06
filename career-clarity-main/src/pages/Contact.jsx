import { Link } from "react-router-dom";

function Contact() {
	return (
		<div className="space-y-10 pb-6">
			<section className="cc-fade-in">
				<div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl sm:p-10">
					<p className="inline-flex items-center rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ring-white/30">
						Contact CareerClarity
					</p>
					<h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
						Let’s connect with clarity.
					</h1>
					<p className="mt-4 max-w-3xl text-sm leading-7 text-indigo-100 sm:text-base">
						We’re always happy to hear feedback, collaboration ideas, and project-related queries. Reach out to our team and we’ll get back to you as soon as possible.
					</p>
				</div>
			</section>

			<section className="cc-fade-in" style={{ animationDelay: "80ms" }}>
				<div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
					<article className="cc-card p-7">
						<h2 className="cc-h2 text-slate-900">Official Email</h2>
						<p className="mt-3 text-sm text-slate-600">For support and communication, contact us at:</p>
						<a
							href="mailto:careerclarity.support@gmail.com"
							className="mt-4 inline-flex items-center rounded-xl bg-indigo-50 px-4 py-3 text-base font-semibold text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
						>
							careerclarity.support@gmail.com
						</a>
						<p className="mt-4 text-sm leading-7 text-slate-600">
							We usually respond with guidance, troubleshooting help, or next steps based on your request.
						</p>
					</article>

					<article className="cc-card p-7">
						<h2 className="cc-h2 text-slate-900">Team Note</h2>
						<p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
							CareerClarity is built by SRMAP University B.Tech (2nd year) students as a Python course project, designed with care to make career decisions easier for students.
						</p>
						<div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
							<p className="text-sm text-slate-700">
								Your suggestions help us improve the platform experience and features.
							</p>
						</div>
					</article>
				</div>
			</section>

			<section className="cc-fade-in" style={{ animationDelay: "120ms" }}>
				<div className="mx-auto max-w-6xl rounded-3xl bg-slate-900 p-8 text-center text-white shadow-xl sm:p-10">
					<h2 className="text-3xl font-extrabold sm:text-4xl">Thank you for supporting our journey</h2>
					<p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
						We’re continuously improving CareerClarity to deliver a premium and meaningful student experience.
					</p>
					<div className="mt-7 flex flex-wrap items-center justify-center gap-3">
						<Link to="/about" className="cc-btn-secondary px-6 py-3">About Us</Link>
						<Link to="/register" className="cc-btn-primary px-6 py-3">Get Started</Link>
					</div>
				</div>
			</section>
		</div>
	);
}

export default Contact;
