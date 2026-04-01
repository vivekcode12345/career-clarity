import api from "./api";

export const getProfile = async () => {
  const res = await api.get("/auth/profile/");
  return res.data;
};

export const updateProfileInterests = async (interests, customInterests = []) => {
  const res = await api.post("/cv/update-profile-interests/", {
    interests,
    custom_interests: customInterests,
  });
  return res.data;
};

export const getProfileCompletionStatus = async () => {
  const res = await api.get("/cv/profile-completion-check/");
  return res.data;
};