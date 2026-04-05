import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logoFull from "../assets/logo-full.svg";
import { logoutUser } from "../services/authService";

const guestNavLinks = [
	{ label: "Home", to: "/" },
	{ label: "Login", to: "/login" },
	{ label: "Register", to: "/register" },
];

const authNavLinks = [
	{ label: "Dashboard", to: "/dashboard" },
	{ label: "Profile", to: "/profile" },
];

function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const navigate = useNavigate();
	const isLoggedIn = Boolean(localStorage.getItem("authToken"));
	const navLinks = isLoggedIn ? authNavLinks : guestNavLinks;

	const handleLogout = async () => {
		if (isLoggingOut) {
			return;
		}

		setIsLoggingOut(true);
		try {
			await logoutUser();
			navigate("/");
			setIsOpen(false);
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<header className="sticky top-0 z-40 border-b border-indigo-100/50 bg-white/40 backdrop-blur-2xl">
			<nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
				<NavLink to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
					<img src={logoFull} alt="CareerClarity" className="h-10 w-auto drop-shadow-sm transition hover:scale-105" />
				</NavLink>

				<ul className="hidden items-center gap-2 md:flex">
					{navLinks.map((link, index) => (
						<li key={link.label} style={{ animationDelay: `${index * 50}ms` }} className="cc-fade-in">
							<NavLink
								to={link.to}
								className={({ isActive }) =>
									`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
										isActive
											? "bg-indigo-100/80 text-indigo-700 shadow-sm"
											: "text-slate-600 hover:bg-indigo-50/60 hover:text-indigo-600"
									}`
								}
							>
								{link.label}
							</NavLink>
						</li>
					))}
					{isLoggedIn && (
						<li className="ml-2 border-l border-indigo-200/50 pl-2 cc-fade-in">
							<button
								type="button"
								onClick={handleLogout}
								disabled={isLoggingOut}
								className="rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-200 hover:shadow-sm hover:from-rose-100 hover:to-pink-100 disabled:opacity-60"
							>
								{isLoggingOut ? "Logging out..." : "Logout"}
							</button>
						</li>
					)}
				</ul>

				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					className="rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-2 text-slate-600 transition-all duration-200 hover:border-indigo-200 hover:shadow-sm md:hidden"
					aria-label="Toggle menu"
				>
					<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</nav>

			{isOpen && (
				<div className="animate-in fade-in slide-in-from-top-2 border-t border-indigo-100/50 bg-white/95 backdrop-blur-xl px-4 py-3 md:hidden">
					<ul className="space-y-2">
						{navLinks.map((link) => (
							<li key={link.label}>
								<NavLink
									to={link.to}
									onClick={() => setIsOpen(false)}
									className={({ isActive }) =>
										`block rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
											isActive
												? "bg-indigo-100/80 text-indigo-700"
												: "text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600"
										}`
									}
								>
									{link.label}
								</NavLink>
							</li>
						))}
						{isLoggedIn && (
							<li>
								<button
									type="button"
									onClick={handleLogout}
									disabled={isLoggingOut}
									className="block w-full rounded-lg bg-rose-50 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-100 disabled:opacity-60"
								>
									{isLoggingOut ? "Logging out..." : "Logout"}
								</button>
							</li>
						)}
					</ul>
				</div>
			)}
		</header>
	);
}

export default Navbar;
