import { useEffect, useRef } from "react";
import { getGoogleAuthConfig } from "../services/authService";

const GOOGLE_SCRIPT_ID = "google-identity-service";

function ensureGoogleScript() {
	const existing = document.getElementById(GOOGLE_SCRIPT_ID);
	if (existing) {
		return;
	}

	const script = document.createElement("script");
	script.id = GOOGLE_SCRIPT_ID;
	script.src = "https://accounts.google.com/gsi/client";
	script.async = true;
	script.defer = true;
	document.head.appendChild(script);
}

function waitForGoogleIdentity(timeoutMs = 8000) {
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();
		const timer = window.setInterval(() => {
			if (window.google?.accounts?.id) {
				window.clearInterval(timer);
				resolve(window.google.accounts.id);
				return;
			}
			if (Date.now() - startedAt > timeoutMs) {
				window.clearInterval(timer);
				reject(new Error("Google Sign-In script load timeout"));
			}
		}, 100);
	});
}

function GoogleAuthButton({ onCredential, onError, mode = "signin" }) {
	const tokenClientRef = useRef(null);
	const clientIdRef = useRef((import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim());
	const initializedRef = useRef(false);

	useEffect(() => {
		let isDisposed = false;

		const initGoogleAuth = async () => {
			try {
				const config = await getGoogleAuthConfig();
				const serverClientId = String(config?.googleClientId || "").trim();
				if (serverClientId) {
					clientIdRef.current = serverClientId;
				}

				if (!clientIdRef.current) {
					onError?.("Google Sign-In is not configured on server.");
					return;
				}

				ensureGoogleScript();
				const googleIdentity = await waitForGoogleIdentity();
				if (isDisposed) return;

				tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
					client_id: clientIdRef.current,
					scope: "openid email profile",
					prompt: "consent",
					error_callback: (error) => {
						const reason = error?.message || error?.type || "Unknown Google OAuth error";
						onError?.(`Google authorization failed: ${reason}`);
					},
					callback: (response) => {
						if (response?.error) {
							const reason = response.error_description || response.error || "Google authorization failed.";
							onError?.(`Google authorization failed: ${reason}`);
							return;
						}
						if (!response?.access_token) {
							onError?.("Google authentication failed. Please try again.");
							return;
						}
						onCredential?.({ accessToken: response.access_token });
					},
				});

				initializedRef.current = true;
			} catch {
				onError?.("Unable to load Google Sign-In right now. Please retry.");
			}
		};

		initGoogleAuth();

		return () => {
			isDisposed = true;
		};
	}, [mode, onCredential, onError]);

	const handleClick = () => {
		if (!initializedRef.current || !tokenClientRef.current) {
			onError?.("Google Sign-In is still loading. Please try again.");
			return;
		}

		try {
			tokenClientRef.current.requestAccessToken({ prompt: "consent" });
		} catch (error) {
			const reason = error?.message || "Check authorized JavaScript origin and retry.";
			onError?.(`Could not start Google Sign-In: ${reason}`);
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
		>
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				<path fill="#EA4335" d="M9 7.2v3.6h5.07c-.22 1.16-.88 2.14-1.88 2.8l3.04 2.36C17 14.3 18 11.88 18 9.1c0-.64-.06-1.25-.17-1.85H9z"/>
				<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-3.04-2.36c-.84.57-1.92.91-2.92.91-2.25 0-4.16-1.52-4.84-3.57H1.01v2.24A9 9 0 009 18z"/>
				<path fill="#4A90E2" d="M4.16 10.81a5.4 5.4 0 010-3.62V4.95H1A9 9 0 000 9c0 1.45.35 2.82.97 4.05l3.19-2.24z"/>
				<path fill="#FBBC05" d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.57-2.57C13.46.9 11.42 0 9 0A9 9 0 001 4.95l3.16 2.24C4.84 5.1 6.75 3.58 9 3.58z"/>
			</svg>
			<span>{mode === "signup" ? "Sign up with Google" : "Sign in with Google"}</span>
		</button>
	);
}

export default GoogleAuthButton;
