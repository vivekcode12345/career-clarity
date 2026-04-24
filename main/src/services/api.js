import axios from "axios";

const normalizedBaseUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const baseURL = normalizedBaseUrl;

const api = axios.create({
	baseURL,
	headers: {
		"Content-Type": "application/json",
	},
});

const authApi = axios.create({
	baseURL,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("authToken");

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		const status = error.response?.status;

		if (status !== 401 || originalRequest?._retry) {
			return Promise.reject(error);
		}

		const refreshToken = localStorage.getItem("refreshToken");
		if (!refreshToken) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;

		try {
			const refreshResponse = await authApi.post("/token/refresh/", { refresh: refreshToken });
			const newAccessToken = refreshResponse.data?.access;
			const newRefreshToken = refreshResponse.data?.refresh || refreshToken;

			if (!newAccessToken || !newRefreshToken) {
				throw new Error("Refresh token response invalid");
			}

			localStorage.setItem("authToken", newAccessToken);
			localStorage.setItem("refreshToken", newRefreshToken);

			originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
			return api(originalRequest);
		} catch (refreshError) {
			localStorage.removeItem("authToken");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("currentUser");
			return Promise.reject(refreshError);
		}
	}
);

export function getApiData(response) {
	if (!response) return {};
	const payload = response.data;
	if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
		const data = payload.data || {};
		if (payload.message && typeof data === "object" && data !== null && !Array.isArray(data) && !data.message) {
			return { ...data, message: payload.message };
		}
		return data;
	}
	return payload || {};
}

export function getApiMessage(response) {
	const payload = response?.data;
	if (payload && typeof payload === "object" && typeof payload.message === "string") {
		return payload.message;
	}
	return "";
}

export function getApiErrorMessage(error, fallback = "Request failed") {
	const payload = error?.response?.data;
	if (payload && typeof payload === "object") {
		if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
		if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
		if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
	}
	return fallback;
}

export default api;
