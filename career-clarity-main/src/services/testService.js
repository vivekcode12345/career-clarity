import api from "./api";

export const getQuickTest = async () => {
  const res = await api.get("/test/quick/");
  return res.data;
};

export const submitQuickTest = async (answers) => {
  const res = await api.post("/test/quick/submit/", {
    answers,
  });
  return res.data;
};

export const getSkillTest = async (skill) => {
  const res = await api.get("/test/skill/", {
    params: { skill }
  });
  return res.data;
};

export const getSkillCooldownStatus = async () => {
  const res = await api.get("/test/skill/cooldown/");
  return res.data;
};

export const getSkillOptions = async () => {
  const res = await api.get("/test/skill/options/");
  return res.data;
};

export const submitSkillTest = async (answers, skill) => {
  const res = await api.post("/test/test/skill/submit/", {
    answers,
    skill,
  });
  return res.data;
};

export const getPredictions = async () => {
  const res = await api.get("/predict/");
  return res.data;
};