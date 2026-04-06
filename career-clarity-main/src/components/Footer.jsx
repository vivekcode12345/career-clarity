import { Link } from "react-router-dom";
import logoMark from "../assets/logo-mark.svg";

function Footer() {
	const isLoggedIn = Boolean(localStorage.getItem("authToken"));

	return (
		<footer className="border-t border-indigo-100/70 bg-white/70 backdrop-blur">
			<div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
				<div>
					<div className="flex items-center gap-3">
						<img src={logoMark} alt="CareerClarity logo" className="h-10 w-10" />
						<h3 className="cc-heading text-lg font-bold text-slate-900">CareerClarity</h3>
					</div>
					<p className="mt-2 text-sm text-slate-600">
						One-Stop Personalized Career & Education Advisor for students and graduates.
					</p>
				</div>

				<div>
					<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Quick Links</h4>
					{isLoggedIn ? (
						<ul className="mt-3 space-y-2 text-sm text-slate-600">
							<li>
								<Link to="/dashboard" className="transition hover:text-indigo-600">Dashboard</Link>
							</li>
							<li>
								<Link to="/recommendations" className="transition hover:text-indigo-600">Recommendations</Link>
							</li>
							<li>
								<Link to="/college-finder" className="transition hover:text-indigo-600">College Finder</Link>
							</li>
							<li>
								<Link to="/alerts" className="transition hover:text-indigo-600">Alerts</Link>
							</li>
						</ul>
					) : (
						<ul className="mt-3 space-y-2 text-sm text-slate-600">
							<li>
								<Link to="/about" className="transition hover:text-indigo-600">About</Link>
							</li>
							<li>
								<Link to="/contact" className="transition hover:text-indigo-600">Contact</Link>
							</li>
							<li>
								<Link to="/login" className="transition hover:text-indigo-600">Login</Link>
							</li>
							<li>
								<Link to="/register" className="transition hover:text-indigo-600">Register</Link>
							</li>
						</ul>
					)}
				</div>

				<div>
					<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Hackathon</h4>
					<p className="mt-3 text-sm text-slate-600">Smart India Hackathon (Problem ID: 25094)</p>
				</div>
			</div>

			<div className="border-t border-indigo-100 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
				© {new Date().getFullYear()} CareerClarity. All rights reserved.
			</div>
		</footer>
	);
}

export default Footer;
