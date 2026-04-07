const AUTO_SCROLL_KEY = "cc.autoScrollEnabled";
export const AUTO_SCROLL_SETTINGS_EVENT = "cc:auto-scroll-changed";

export function getAutoScrollEnabled() {
	const stored = localStorage.getItem(AUTO_SCROLL_KEY);
	if (stored === null) {
		return true;
	}
	return stored === "true";
}

export function setAutoScrollEnabled(enabled) {
	const value = Boolean(enabled);
	localStorage.setItem(AUTO_SCROLL_KEY, String(value));
	window.dispatchEvent(
		new CustomEvent(AUTO_SCROLL_SETTINGS_EVENT, {
			detail: { enabled: value },
		})
	);
	return value;
}
