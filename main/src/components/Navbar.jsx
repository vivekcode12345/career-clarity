import { useState } from "react";
import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import logoFull from "../assets/logo-full.svg";
import { logoutUser } from "../services/authService";
import { THEME_SETTINGS_EVENT, getStoredTheme } from "../utils/theme";
import logoFullDark from "../assets/logo-full-dark.svg";

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
	const [theme, setTheme] = useState(getStoredTheme());
	const navigate = useNavigate();
	const location = useLocation();
	const isLoggedIn = Boolean(localStorage.getItem("authToken"));
	const navLinks = isLoggedIn ? authNavLinks : guestNavLinks;
	const isGuestHome = !isLoggedIn && location.pathname === "/";
	const isDarkTheme = theme === "dark";
	const logoSrc = isDarkTheme ? logoFullDark : logoFull;

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

	useEffect(() => {
		const syncTheme = () => setTheme(getStoredTheme());
		window.addEventListener(THEME_SETTINGS_EVENT, syncTheme);
		window.addEventListener("storage", syncTheme);
		return () => {
			window.removeEventListener(THEME_SETTINGS_EVENT, syncTheme);
			window.removeEventListener("storage", syncTheme);
		};
	}, []);

	const headerClass = isGuestHome
		? isScrolled
			? "fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 shadow-lg backdrop-blur-2xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-950/92 dark:text-slate-100 dark:shadow-black/20"
			: "fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/88 text-slate-900 shadow-md backdrop-blur-xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-950/88 dark:text-slate-100 dark:shadow-black/20"
		: "fixed inset-x-0 top-0 z-40 border-b border-indigo-100/50 bg-white/78 shadow-sm backdrop-blur-2xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100 dark:shadow-black/20";

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
				<NavLink
					to={isLoggedIn ? "/dashboard" : "/"}
					className="flex items-center gap-3 rounded-2xl border border-transparent px-2 py-1 transition-colors duration-200 hover:border-indigo-200/70 hover:bg-white/70 dark:hover:bg-slate-900/70"
					onClick={() => setIsOpen(false)}
				>
					<img
						src={logoSrc}
						alt="CareerClarity"
						className="h-11 w-auto drop-shadow-[0_6px_18px_rgba(15,23,42,0.15)] transition hover:scale-[1.02]"
					/>
				</NavLink>

				<ul className="hidden items-center gap-2 md:flex">
					{navLinks.map((link, index) => (
						<li key={link.label} style={{ animationDelay: `${index * 50}ms` }} className="cc-fade-in">
							{link.type === "hash" ? (
								<button
									type="button"
									onClick={() => handleHashClick(link.to)}
									className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-200 dark:hover:text-black"
								>
									{link.label}
								</button>
							) : (
								<NavLink
									to={link.to}
									className={({ isActive }) =>
										!isLoggedIn && link.label === "Register"
											? "rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:from-indigo-500 dark:to-violet-500"
											: !isLoggedIn && link.label === "Login"
												? "rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-200 dark:hover:text-black"
												: `rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
														isActive
															? "bg-indigo-100/90 text-indigo-700 shadow-sm dark:bg-slate-200 dark:text-black dark:ring-1 dark:ring-slate-400/40"
															: "text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-200 dark:hover:text-black"
												  }`
									}
								>
									{link.label}
								</NavLink>
							)}
						</li>
					))}
					{isLoggedIn && (
							<li className="ml-2 border-l border-indigo-200/50 pl-2 cc-fade-in dark:border-slate-700/80">
							<button
								type="button"
								onClick={handleLogout}
								disabled={isLoggingOut}
									className="rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-200 hover:shadow-sm hover:from-rose-100 hover:to-pink-100 disabled:opacity-60 dark:from-rose-500/10 dark:to-pink-500/10 dark:text-rose-200 dark:hover:from-rose-500/15 dark:hover:to-pink-500/15"
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
							? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
							: "border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 text-slate-600 hover:border-indigo-200 hover:shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800 dark:text-slate-100"
					}`}
					aria-label="Toggle menu"
				>
					<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</nav>

			{isOpen && (
				<div className="animate-in fade-in slide-in-from-top-2 border-t border-indigo-100/50 bg-white/95 backdrop-blur-xl px-4 py-3 md:hidden dark:border-slate-700 dark:bg-slate-950/95">
					<ul className="space-y-2">
						{navLinks.map((link) => (
							<li key={link.label}>
								{link.type === "hash" ? (
									<button
										type="button"
										onClick={() => handleHashClick(link.to, true)}
										className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-indigo-50/60 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-200 dark:hover:text-black"
									>
										{link.label}
									</button>
								) : (
									<NavLink
										to={link.to}
										onClick={() => setIsOpen(false)}
										className={({ isActive }) =>
											!isLoggedIn && link.label === "Register"
												? "block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm dark:from-indigo-500 dark:to-violet-500"
												: !isLoggedIn && link.label === "Login"
														? "block rounded-xl border border-indigo-200 bg-white px-4 py-2 text-center text-sm font-semibold text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-200 dark:hover:text-black"
													: `block rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
															isActive
																? "bg-indigo-100/80 text-indigo-700 dark:bg-slate-200 dark:text-black"
																: "text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-200 dark:hover:text-black"
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
									className="block w-full rounded-lg bg-rose-50 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-100 disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
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
