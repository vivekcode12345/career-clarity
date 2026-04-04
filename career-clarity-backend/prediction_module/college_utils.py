import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")


def build_college_prompt(college, ability, skills, interest):
    return f"""
You are an AI career advisor.

User Profile:
- Ability: {ability}
- Skills: {skills}
- Interest: {interest}

College Details:
- Name: {college['name']}
- Location: {college['location']}
- Courses: {college['courses']}
- Fees: {college['fees']}

Task:
Explain why this college is suitable (or not) for the user.

Rules:
- Keep it short (2–3 lines)
- Be specific to user's profile
- Focus on career growth, affordability, and skill alignment

Return ONLY plain text explanation.
"""
def call_ai(prompt):
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "mistralai/mixtral-8x7b-instruct",
            "messages": [{"role": "user", "content": prompt}]
        }
    )

    data = response.json()
    return data["choices"][0]["message"]["content"]
def generate_college_explanation(college, ability, skills, interest):
    try:
        prompt = build_college_prompt(college, ability, skills, interest)
        return call_ai(prompt)
    except Exception as e:
        print("College AI error:", e)
        return "This college is a good option based on your profile."