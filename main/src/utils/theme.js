export const THEME_STORAGE_KEY = "careerclarity:theme";
export const THEME_SETTINGS_EVENT = "careerclarity:theme-changed";

const DARK_THEME = "dark";
const LIGHT_THEME = "light";

const normalizeTheme = (value) => (value === DARK_THEME ? DARK_THEME : LIGHT_THEME);

const applyThemeClass = (theme) => {
	if (typeof document === "undefined") return;
	document.documentElement.classList.toggle(DARK_THEME, theme === DARK_THEME);
	document.documentElement.setAttribute("data-theme", theme);
};

export function getStoredTheme() {
	if (typeof window === "undefined") return LIGHT_THEME;
	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
	return normalizeTheme(storedTheme);
}

export function isDarkModeEnabled() {
	return getStoredTheme() === DARK_THEME;
}

export function setTheme(theme) {
	if (typeof window === "undefined") return LIGHT_THEME;
	const normalizedTheme = normalizeTheme(theme);
	window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
	applyThemeClass(normalizedTheme);
	window.dispatchEvent(
		new CustomEvent(THEME_SETTINGS_EVENT, {
			detail: { theme: normalizedTheme },
		})
	);
	return normalizedTheme;
}

export function setDarkModeEnabled(enabled) {
	return setTheme(enabled ? DARK_THEME : LIGHT_THEME) === DARK_THEME;
}

export function syncThemeFromStorage() {
	const theme = getStoredTheme();
	applyThemeClass(theme);
	return theme;
}
