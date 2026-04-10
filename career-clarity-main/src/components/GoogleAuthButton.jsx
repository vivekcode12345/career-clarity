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
	const clientIdRef = useRef((import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim());
	const initializedRef = useRef(false);
	const onCredentialRef = useRef(onCredential);
	const onErrorRef = useRef(onError);
	const buttonContainerRef = useRef(null);

	useEffect(() => {
		onCredentialRef.current = onCredential;
		onErrorRef.current = onError;
	}, [onCredential, onError]);

	useEffect(() => {
		let isDisposed = false;

		const initGoogleAuth = async () => {
			try {
				try {
					const config = await getGoogleAuthConfig();
					const serverClientId = String(config?.googleClientId || "").trim();
					if (serverClientId) {
						clientIdRef.current = serverClientId;
					}
				} catch {
					if (!clientIdRef.current) {
						onErrorRef.current?.("Google Sign-In config API is unreachable and no local Google client ID is set.");
						return;
					}
				}

				if (!clientIdRef.current) {
					onErrorRef.current?.("Google Sign-In is not configured on server.");
					return;
				}

				ensureGoogleScript();
				const googleIdentity = await waitForGoogleIdentity();
				if (isDisposed) return;

				googleIdentity.initialize({
					client_id: clientIdRef.current,
					callback: (response) => {
						if (!response?.credential) {
							onErrorRef.current?.("Google authentication failed. Please try again.");
							return;
						}
						onCredentialRef.current?.({ credential: response.credential });
					},
				});

				if (buttonContainerRef.current) {
					buttonContainerRef.current.innerHTML = "";
					googleIdentity.renderButton(buttonContainerRef.current, {
						type: "standard",
						theme: "outline",
						size: "large",
						text: mode === "signup" ? "signup_with" : "signin_with",
						shape: "rectangular",
						logo_alignment: "left",
						width: 320,
					});
				}

				initializedRef.current = true;
			} catch (error) {
				const reason = error?.message || "Unknown error";
				onErrorRef.current?.(`Unable to load Google Sign-In right now: ${reason}`);
			}
		};

		initGoogleAuth();

		return () => {
			isDisposed = true;
		};
	}, [mode]);

	return (
		<div className="w-full flex flex-col items-center gap-2">
			<div ref={buttonContainerRef} className="w-full flex justify-center" />
			{!initializedRef.current ? <p className="text-xs text-slate-500">Loading Google Sign-In…</p> : null}
		</div>
	);
}

export default GoogleAuthButton;
