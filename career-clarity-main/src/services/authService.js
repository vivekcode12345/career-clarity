import api, { getApiData } from "./api";

export const EDUCATION_LEVELS = ["Class 10", "Class 12", "Undergraduate", "Graduate"];

function parseJwtPayload(token) {
	if (!token) return null;
	try {
		const base64Url = token.split(".")[1];
		if (!base64Url) return null;
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
				.join("")
		);
		return JSON.parse(jsonPayload);
	} catch {
		return null;
	}
}

function isJwtExpired(token) {
	const payload = parseJwtPayload(token);
	if (!payload?.exp) return true;
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return payload.exp <= nowInSeconds;
}

export async function registerUser(payload) {
	const normalizedPayload = {
		...payload,
		username: payload?.username || payload?.email || payload?.name,
	};
	const response = await api.post("/auth/register/", normalizedPayload);
	return getApiData(response);
}

export async function loginUser(payload) {
	const normalizedPayload = {
		password: payload?.password,
		username: payload?.username || payload?.email || payload?.identifier,
	};
	const response = await api.post("/auth/login/", normalizedPayload);
	return getApiData(response);
}

export function saveAuthSession(data) {
	if (data?.token) {
		localStorage.setItem("authToken", data.token);
	}

	if (data?.refreshToken) {
		localStorage.setItem("refreshToken", data.refreshToken);
	}

	if (data?.user) {
		localStorage.setItem("currentUser", JSON.stringify(data.user));
	}
}

export function clearAuthSession() {
	localStorage.removeItem("authToken");
	localStorage.removeItem("refreshToken");
	localStorage.removeItem("currentUser");
}

export function getCurrentUser() {
	try {
		const rawUser = localStorage.getItem("currentUser");
		return rawUser ? JSON.parse(rawUser) : null;
	} catch {
		return null;
	}
}

export function isAuthenticated() {
	const accessToken = localStorage.getItem("authToken");
	const refreshToken = localStorage.getItem("refreshToken");

	if (!accessToken || !refreshToken) {
		return false;
	}

	if (isJwtExpired(refreshToken)) {
		clearAuthSession();
		return false;
	}

	return true;
}

export function isGraduateUser() {
	const user = getCurrentUser();
	return user?.educationLevel === "Graduate";
}

export async function updateUserProfile(payload) {
	const response = await api.put("/auth/profile/", payload);
	const responseData = getApiData(response);
	if (responseData?.user) {
		const existing = getCurrentUser() || {};
		localStorage.setItem("currentUser", JSON.stringify({ ...existing, ...responseData.user }));
	}
	return responseData;
}

export async function logoutUser() {
	const refreshToken = localStorage.getItem("refreshToken");

	try {
		if (refreshToken) {
			await api.post("/auth/logout/", { refreshToken });
		}
	} finally {
		clearAuthSession();
	}
}

export async function getMyProfile() {
	const response = await api.get("/auth/profile/");
	return getApiData(response);
}

export async function syncCurrentUser() {
	if (!isAuthenticated()) {
		return null;
	}

	try {
		const data = await getMyProfile();
		const existing = getCurrentUser() || {};
		const normalizedUser = data?.user || data;
		if (normalizedUser) {
			localStorage.setItem("currentUser", JSON.stringify({ ...existing, ...normalizedUser }));
		}
		return normalizedUser || null;
	} catch (error) {
		if (error.response?.status === 401) {
			clearAuthSession();
		}
		return null;
	}
}
