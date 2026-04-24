import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ClassLevelSetup from "./pages/ClassLevelSetup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import QuickTestPage from "./pages/QuickTest";
import TestPage from "./pages/TestPage";
import Recommendations from "./pages/Recommendations";
import Roadmap from "./pages/Roadmap";
import CollegeFinder from "./pages/CollegeFinder";
import Alerts from "./pages/Alerts";
import CVUpload from "./pages/CVUpload";
import CVAnalysis from "./pages/CVAnalysis";
import Chatbot from "./components/Chatbot";
import { isAuthenticated, isGraduateUser, syncCurrentUser } from "./services/authService";
import { playClickSound } from "./utils/sound";
import { AUTO_SCROLL_SETTINGS_EVENT, getAutoScrollEnabled } from "./utils/autoScroll";

const AUTO_SCROLL_SPEED_PX_PER_SECOND = 22;
const AUTO_SCROLL_RESUME_DELAY_MS = 1500;
const AUTO_SCROLL_TICK_MS = 50;
const AUTO_SCROLL_WHEEL_THRESHOLD = 4;

function AppLayout({ children }) {
  const location = useLocation();
  const [isFullscreenActive, setIsFullscreenActive] = useState(Boolean(document.fullscreenElement));
	const [autoScrollEnabled, setAutoScrollEnabled] = useState(getAutoScrollEnabled());

	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "auto" });
	}, [location.pathname, location.search]);

	useEffect(() => {
		const syncAutoScroll = () => {
			setAutoScrollEnabled(getAutoScrollEnabled());
		};

		window.addEventListener(AUTO_SCROLL_SETTINGS_EVENT, syncAutoScroll);
		window.addEventListener("storage", syncAutoScroll);
		return () => {
			window.removeEventListener(AUTO_SCROLL_SETTINGS_EVENT, syncAutoScroll);
			window.removeEventListener("storage", syncAutoScroll);
		};
	}, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenActive(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

	useEffect(() => {
		const clickSelector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';

		const handleGlobalClick = (event) => {
			const target = event.target instanceof Element ? event.target : null;
			if (!target) return;

			if (target.closest(clickSelector)) {
				playClickSound();
			}
		};

		const handleFormSubmit = () => {
			playClickSound();
		};

		document.addEventListener("click", handleGlobalClick, true);
		document.addEventListener("submit", handleFormSubmit, true);

		return () => {
			document.removeEventListener("click", handleGlobalClick, true);
			document.removeEventListener("submit", handleFormSubmit, true);
		};
	}, []);

  const isTestRoute = location.pathname === "/quick-test" || location.pathname === "/test";
	const shouldHideChrome = isTestRoute;

	useEffect(() => {
		if (!autoScrollEnabled || shouldHideChrome) {
			return;
		}

		const scroller = document.scrollingElement || document.documentElement;
		let pauseUntil = Date.now() + AUTO_SCROLL_RESUME_DELAY_MS;
		const stepPerTick = (AUTO_SCROLL_SPEED_PX_PER_SECOND * AUTO_SCROLL_TICK_MS) / 1000;

		const pauseAutoScroll = () => {
			pauseUntil = Date.now() + AUTO_SCROLL_RESUME_DELAY_MS;
		};

		const onWheel = (event) => {
			if (Math.abs(event.deltaY) < AUTO_SCROLL_WHEEL_THRESHOLD && Math.abs(event.deltaX) < AUTO_SCROLL_WHEEL_THRESHOLD) {
				return;
			}
			pauseAutoScroll();
		};

		const onKeyDown = () => {
			pauseAutoScroll();
		};

		const onPointerOrMouseDown = () => {
			pauseAutoScroll();
		};

		const onTouchStart = () => {
			pauseAutoScroll();
		};

		window.addEventListener("wheel", onWheel, { passive: true });
		window.addEventListener("keydown", onKeyDown, { passive: true });
		window.addEventListener("pointerdown", onPointerOrMouseDown, { passive: true });
		window.addEventListener("mousedown", onPointerOrMouseDown, { passive: true });
		window.addEventListener("touchstart", onTouchStart, { passive: true });

		const intervalId = window.setInterval(() => {
			if (document.hidden) {
				return;
			}

			if (Date.now() < pauseUntil) {
				return;
			}

			const maxScrollTop = Math.max(0, scroller.scrollHeight - window.innerHeight);
			if (maxScrollTop <= 1) {
				return;
			}

			const currentTop = scroller.scrollTop;
			if (currentTop >= maxScrollTop - 1) {
				scroller.scrollTop = 0;
				pauseUntil = Date.now() + AUTO_SCROLL_RESUME_DELAY_MS;
				return;
			}

			scroller.scrollTop = Math.min(maxScrollTop, currentTop + stepPerTick);
		}, AUTO_SCROLL_TICK_MS);

		return () => {
			window.clearInterval(intervalId);
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("pointerdown", onPointerOrMouseDown);
			window.removeEventListener("mousedown", onPointerOrMouseDown);
			window.removeEventListener("touchstart", onTouchStart);
		};
	}, [autoScrollEnabled, shouldHideChrome, location.pathname, location.search]);

  return (
		<div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
			<div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
			<div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
			<div className="pointer-events-none absolute bottom-16 left-1/3 h-52 w-52 rounded-full bg-fuchsia-200/20 blur-3xl" />
			{!shouldHideChrome ? <Navbar /> : null}
			<main
				className={`relative z-10 mx-auto w-full ${
					shouldHideChrome ? "max-w-none px-0 py-0" : "max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8"
				}`}
			>
				{children}
			</main>
			{!shouldHideChrome ? <Footer /> : null}
			{!shouldHideChrome ? <Chatbot /> : null}
    </div>
  );
}

function PrivateRoute({ children }) {
	return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
	return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

function GraduateRoute({ children }) {
	if (!isAuthenticated()) {
		return <Navigate to="/login" replace />;
	}

	return isGraduateUser() ? children : <Navigate to="/dashboard" replace />;
}

function App() {
	const [isSessionReady, setIsSessionReady] = useState(false);

	useEffect(() => {
		const bootstrapSession = async () => {
			if (isAuthenticated()) {
				await syncCurrentUser();
			}
			setIsSessionReady(true);
		};

		bootstrapSession();
	}, []);

	if (!isSessionReady) {
		return (
			<AppLayout>
				<div className="cc-surface mx-auto max-w-xl p-8 text-center">
					<p className="cc-heading text-sm font-semibold text-indigo-600">Session Sync</p>
					<p className="mt-2 text-sm font-medium text-slate-600">Loading your session...</p>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/about" element={<About />} />
				<Route path="/contact" element={<Contact />} />
				<Route
					path="/login"
					element={
						<GuestRoute>
							<Login />
						</GuestRoute>
					}
				/>
				<Route
					path="/register"
					element={
						<GuestRoute>
							<Register />
						</GuestRoute>
					}
				/>
				<Route
					path="/dashboard"
					element={
						<PrivateRoute>
							<Dashboard />
						</PrivateRoute>
					}
				/>
				<Route
					path="/class-setup"
					element={
						<PrivateRoute>
							<ClassLevelSetup />
						</PrivateRoute>
					}
				/>
				<Route
					path="/profile"
					element={
						<PrivateRoute>
							<Profile />
						</PrivateRoute>
					}
				/>
				<Route
					path="/settings"
					element={
						<PrivateRoute>
							<Settings />
						</PrivateRoute>
					}
				/>
				<Route
					path="/quick-test"
					element={
						<PrivateRoute>
							<TestPage />
						</PrivateRoute>
					}
				/>
				<Route
					path="/test"
					element={
						<PrivateRoute>
							<TestPage />
						</PrivateRoute>
					}
				/>
				<Route
					path="/recommendations"
					element={
						<PrivateRoute>
							<Recommendations />
						</PrivateRoute>
					}
				/>
				<Route
					path="/roadmap"
					element={
						<PrivateRoute>
							<Roadmap />
						</PrivateRoute>
					}
				/>
				<Route
					path="/college-finder"
					element={
						<PrivateRoute>
							<CollegeFinder />
						</PrivateRoute>
					}
				/>
				<Route
					path="/alerts"
					element={
						<PrivateRoute>
							<Alerts />
						</PrivateRoute>
					}
				/>
				<Route
					path="/cv-upload"
					element={
						<PrivateRoute>
							<CVUpload />
						</PrivateRoute>
					}
				/>
				<Route
					path="/cv-analysis"
					element={
						<PrivateRoute>
							<CVAnalysis />
						</PrivateRoute>
					}
				/>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AppLayout>
	);
}

export default App;
