import api, { getApiData } from "./api";

export const getQuickTest = async () => {
  const res = await api.get("/test/quick/");
  return getApiData(res);
};

export const submitQuickTest = async (answers) => {
  const res = await api.post("/test/quick/submit/", {
    answers,
  });
  return getApiData(res);
};

export const getSkillTest = async (skill) => {
  const res = await api.get("/test/skill/", {
    params: { skill }
  });
  return getApiData(res);
};

export const getSkillCooldownStatus = async () => {
  const res = await api.get("/test/skill/cooldown/");
  return getApiData(res);
};

export const getSkillOptions = async () => {
  const res = await api.get("/test/skill/options/");
  return getApiData(res);
};

export const submitSkillTest = async (answers, skill) => {
  const res = await api.post("/test/test/skill/submit/", {
    answers,
    skill,
  });
  return getApiData(res);
};

export const getPredictions = async () => {
  const res = await api.get("/predict/");
  return getApiData(res);
};