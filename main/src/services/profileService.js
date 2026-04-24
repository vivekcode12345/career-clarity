import api, { getApiData } from "./api";

export const getProfile = async () => {
  const res = await api.get("/auth/profile/");
  return getApiData(res);
};

export const updateProfileInterests = async (interests, customInterests = []) => {
  const res = await api.post("/cv/update-profile-interests/", {
    interests,
    custom_interests: customInterests,
  });
  return getApiData(res);
};

export const getProfileCompletionStatus = async () => {
  const res = await api.get("/cv/profile-completion-check/");
  return getApiData(res);
};

export const getPreferences = async () => {
  const res = await api.get("/preferences/");
  return getApiData(res);
};

export const updatePreferences = async (preferences) => {
  const res = await api.put("/preferences/", preferences);
  return getApiData(res);
};

export const changePassword = async ({ current_password, new_password, otp }) => {
  const res = await api.post("/change-password/", { current_password, new_password, otp });
  return getApiData(res);
};

export const resetTests = async () => {
  const res = await api.post("/reset-tests/");
  return getApiData(res);
};

export const resetRecommendations = async () => {
  const res = await api.post("/reset-recommendations/");
  return getApiData(res);
};