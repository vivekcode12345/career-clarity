import { useState } from "react";
import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import logoFull from "../assets/logo-full.svg";
import { logoutUser } from "../services/authService";

const guestNavLinks = [
	{ label: "About", to: "/about" },
	{ label: "Contact", to: "/contact" },
	{ label: "Features", to: "#features", type: "hash" },
	{ label: "How it Works", to: "#how-it-works", type: "hash" },
	{ label: "Login", to: "/login" },
	{ label: "Register", to: "/register" },
];

const authNavLinks = [
	{ label: "Dashboard", to: "/dashboard" },
	{ label: "Profile", to: "/profile" },
	{ label: "⚙️ Settings", to: "/settings" },
];

function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const isLoggedIn = Boolean(localStorage.getItem("authToken"));
	const navLinks = isLoggedIn ? authNavLinks : guestNavLinks;
	const isGuestHome = !isLoggedIn && location.pathname === "/";

	useEffect(() => {
		if (!isGuestHome) {
			setIsScrolled(true);
			return;
		}

		const onScroll = () => {
			setIsScrolled(window.scrollY > 24);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [isGuestHome]);

	const headerClass = isGuestHome
		? isScrolled
			? "sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 shadow-lg backdrop-blur-2xl"
			: "sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 text-slate-900 shadow-md backdrop-blur-xl"
		: "sticky top-0 z-40 border-b border-indigo-100/50 bg-white/40 backdrop-blur-2xl";

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

	const handleHashClick = (hash, closeMenu = false) => {
		if (location.pathname !== "/") {
			navigate(`/${hash}`);
		} else {
			const section = document.querySelector(hash);
			if (section) {
				section.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}
		if (closeMenu) {
			setIsOpen(false);
		}
	};

	return (
		<header className={headerClass}>
			<nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
				<NavLink to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
					<img src={logoFull} alt="CareerClarity" className="h-10 w-auto drop-shadow-sm transition hover:scale-105" />
				</NavLink>

				<ul className="hidden items-center gap-2 md:flex">
					{navLinks.map((link, index) => (
						<li key={link.label} style={{ animationDelay: `${index * 50}ms` }} className="cc-fade-in">
							{link.type === "hash" ? (
								<button
									type="button"
									onClick={() => handleHashClick(link.to)}
									className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700"
								>
									{link.label}
								</button>
							) : (
								<NavLink
									to={link.to}
									className={({ isActive }) =>
										!isLoggedIn && link.label === "Register"
											? "rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
											: !isLoggedIn && link.label === "Login"
												? "rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-50"
												: `rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
														isActive
															? "bg-indigo-100/90 text-indigo-700 shadow-sm"
															: "text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700"
												  }`
									}
								>
									{link.label}
								</NavLink>
							)}
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
					className={`rounded-lg border p-2 transition-all duration-200 md:hidden ${
						isGuestHome && !isScrolled
							? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
							: "border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 text-slate-600 hover:border-indigo-200 hover:shadow-sm"
					}`}
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
								{link.type === "hash" ? (
									<button
										type="button"
										onClick={() => handleHashClick(link.to, true)}
										className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-indigo-50/60 hover:text-indigo-600"
									>
										{link.label}
									</button>
								) : (
									<NavLink
										to={link.to}
										onClick={() => setIsOpen(false)}
										className={({ isActive }) =>
											!isLoggedIn && link.label === "Register"
												? "block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm"
												: !isLoggedIn && link.label === "Login"
													? "block rounded-xl border border-indigo-200 bg-white px-4 py-2 text-center text-sm font-semibold text-indigo-700"
													: `block rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
															isActive
																? "bg-indigo-100/80 text-indigo-700"
																: "text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600"
													  }`
										}
									>
										{link.label}
									</NavLink>
								)}
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
