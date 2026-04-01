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