import api from "./api";

export const EDUCATION_LEVELS = ["Class 10", "Class 12", "Undergraduate", "Graduate"];

export async function registerUser(payload) {
	const normalizedPayload = {
		...payload,
		username: payload?.username || payload?.email || payload?.name,
	};
	const response = await api.post("/auth/register/", normalizedPayload);
	return response.data;
}

export async function loginUser(payload) {
	const normalizedPayload = {
		password: payload?.password,
		username: payload?.username || payload?.email || payload?.identifier,
	};
	const response = await api.post("/auth/login/", normalizedPayload);
	return response.data;
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
	return Boolean(localStorage.getItem("authToken"));
}

export function isGraduateUser() {
	const user = getCurrentUser();
	return user?.educationLevel === "Graduate";
}

export async function updateUserProfile(payload) {
	const response = await api.put("/auth/profile/", payload);
	if (response.data?.user) {
		const existing = getCurrentUser() || {};
		localStorage.setItem("currentUser", JSON.stringify({ ...existing, ...response.data.user }));
	}
	return response.data;
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
	return response.data;
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
