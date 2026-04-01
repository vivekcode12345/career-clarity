def get_ability_level(score):
    if score >= 4:
        return "high"
    elif score >= 2:
        return "medium"
    else:
        return "low"


CAREER_MAP = {
    "tech": ["Software Developer", "Data Scientist", "AI Engineer"],
    "business": ["Marketing Manager", "Business Analyst"],
    "creative": ["Graphic Designer", "Content Creator"],
    "research": ["Research Analyst", "Scientist"]
}


def get_recommendations(interest, skills, ability):
    careers = CAREER_MAP.get(interest, ["General Career Paths"])

    # optional refinement
    if "python" in skills:
        careers.append("Data Scientist")

    if ability == "low":
        careers = ["Start with basics", "Skill-building courses"]

    return list(set(careers))