import requests
import json
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_ability_level(score):
    if score >= 4:
        return "high"
    elif score >= 2:
        return "medium"
    else:
        return "low"


def build_recommendations_prompt(ability, interest, skills, skill_name, skill_level, skill_score, skill_history=None):
    """
    Build a personalized prompt for AI to generate top 3-4 career recommendations.
    """
    skills_str = ", ".join(skills) if skills else "General skills"
    history_str = "No previous skill tests available."
    if skill_history:
        history_lines = []
        for item in skill_history:
            history_lines.append(
                f"- {item.get('skill', 'Unknown')} | level: {item.get('level', '')} | score: {item.get('score', '')}/{item.get('total', '')}"
            )
        history_str = "\n".join(history_lines)

    prompt = f"""You are a career advisor helping a user find the best career paths for them.

Based on the following user profile, recommend the TOP 3-4 most suitable careers. Be specific and personalized.

**User Profile:**
- Overall Ability Level: {ability.upper()} (scale: low/medium/high)
- Career Interest: {interest}
- Known Skills: {skills_str}
- Strongest Skill: {skill_name} (Level: {skill_level}, Score: {skill_score}/10)
- Skill Test History:
{history_str}

**Important Guidelines:**
1. Generate EXACTLY 3-4 career recommendations (not more, not less)
2. Each career should be highly personalized to THIS user's profile
3. Do NOT recommend generic careers - focus on paths that match their skills and interests
4. Include WHY this career is perfect for them based on their skills
5. Suggest the next immediate step they should take to pursue this career
6. Format as JSON array with this structure:
{{
  "recommendations": [
    {{
      "title": "Career Title",
      "reason": "Why this is perfect for this user based on their skills",
      "nextStep": "Immediate action to take",
      "salaryRange": "Expected salary range",
      "requiredSkills": ["skill1", "skill2", "skill3"]
    }},
    ...
  ]
}}

Generate only the JSON, no additional text."""

    return prompt


def call_ai_for_recommendations(prompt):
    """
    Call OpenRouter AI API to generate personalized recommendations.
    Returns parsed JSON or empty list on error.
    """
    import os

    api_key = os.getenv("OPENROUTER_API_KEY") or getattr(settings, "OPENROUTER_API_KEY", None)
    if not api_key:
        logger.error("OPENROUTER_API_KEY not configured")
        return []

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "mistralai/mixtral-8x7b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 1200,
            },
            timeout=30,
        )

        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]

                try:
                    data = json.loads(content)
                    if "recommendations" in data and isinstance(data["recommendations"], list):
                        return data["recommendations"][:4]  # Max 4
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse AI response: {content}")
                    return []
        else:
            logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
            return []

    except Exception as e:
        logger.error(f"AI recommendation generation error: {str(e)}")
        return []


def generate_ai_recommendations(ability, interest, skills, skill_name, skill_level, skill_score, skill_history=None):
    """
    Generate personalized career recommendations using AI.
    Returns list of 3-4 recommendations or fallback careers.
    """
    prompt = build_recommendations_prompt(ability, interest, skills, skill_name, skill_level, skill_score, skill_history=skill_history)
    recommendations = call_ai_for_recommendations(prompt)

    if recommendations:
        return recommendations

    # Fallback to predefined careers if AI fails
    logger.warning("AI recommendation failed, using fallback careers")
    fallback = CAREER_OPTIONS.get(interest, CAREER_OPTIONS["tech"])
    return fallback[:3]


CAREER_OPTIONS = {
    "tech": [
        {
            "title": "Software Developer",
            "description": "Build web, mobile, or backend products for real users.",
            "requiredSkills": ["Python", "JavaScript", "Git", "Problem Solving"],
            "salaryRange": "₹5 LPA - ₹18 LPA",
            "roadmapFocus": "coding, projects, internships, system design basics",
        },
        {
            "title": "Data Scientist",
            "description": "Use data, statistics, and machine learning to solve business problems.",
            "requiredSkills": ["Python", "Statistics", "SQL", "Machine Learning"],
            "salaryRange": "₹6 LPA - ₹22 LPA",
            "roadmapFocus": "analysis, models, dashboards, case studies",
        },
        {
            "title": "AI Engineer",
            "description": "Create intelligent systems, automation, and AI-powered products.",
            "requiredSkills": ["Python", "ML", "APIs", "Prompting"],
            "salaryRange": "₹7 LPA - ₹25 LPA",
            "roadmapFocus": "ML foundations, deployment, AI projects, model evaluation",
        },
    ],
    "business": [
        {
            "title": "Business Analyst",
            "description": "Turn business data into clear decisions and process improvements.",
            "requiredSkills": ["Excel", "Communication", "SQL", "Presentation"],
            "salaryRange": "₹4 LPA - ₹14 LPA",
            "roadmapFocus": "requirements, reporting, stakeholder communication, analytics",
        },
        {
            "title": "Marketing Strategist",
            "description": "Plan campaigns and growth strategies for brands and products.",
            "requiredSkills": ["Digital Marketing", "Copywriting", "Analytics", "Branding"],
            "salaryRange": "₹4 LPA - ₹15 LPA",
            "roadmapFocus": "campaigns, content, SEO, customer insight, analytics",
        },
        {
            "title": "Product Manager",
            "description": "Guide product goals, features, and user experience across teams.",
            "requiredSkills": ["Communication", "Strategy", "Research", "Leadership"],
            "salaryRange": "₹8 LPA - ₹28 LPA",
            "roadmapFocus": "roadmaps, product thinking, execution, leadership",
        },
    ],
    "creative": [
        {
            "title": "UI/UX Designer",
            "description": "Design intuitive interfaces and experiences for digital products.",
            "requiredSkills": ["Figma", "Wireframing", "User Research", "Visual Design"],
            "salaryRange": "₹4 LPA - ₹12 LPA",
            "roadmapFocus": "portfolio, case studies, design systems, user testing",
        },
        {
            "title": "Graphic Designer",
            "description": "Create strong visual identities and communication materials.",
            "requiredSkills": ["Illustrator", "Photoshop", "Typography", "Branding"],
            "salaryRange": "₹3 LPA - ₹10 LPA",
            "roadmapFocus": "branding, visual identity, portfolio, tools mastery",
        },
        {
            "title": "Content Creator",
            "description": "Develop engaging content for social, video, and web platforms.",
            "requiredSkills": ["Writing", "Editing", "Storytelling", "Social Media"],
            "salaryRange": "₹3 LPA - ₹12 LPA",
            "roadmapFocus": "content strategy, editing, audience growth, personal brand",
        },
    ],
    "research": [
        {
            "title": "Research Analyst",
            "description": "Study trends, collect data, and present insights for decision-making.",
            "requiredSkills": ["Research", "Excel", "Writing", "Statistics"],
            "salaryRange": "₹4 LPA - ₹13 LPA",
            "roadmapFocus": "research methods, reports, evidence analysis, presentations",
        },
        {
            "title": "Scientist",
            "description": "Work on experiments and evidence-driven problem solving.",
            "requiredSkills": ["Critical Thinking", "Research", "Lab Skills", "Analysis"],
            "salaryRange": "₹5 LPA - ₹16 LPA",
            "roadmapFocus": "foundations, experiments, specialization, publications",
        },
        {
            "title": "Policy Analyst",
            "description": "Evaluate public policies and recommend improvements using evidence.",
            "requiredSkills": ["Research", "Writing", "Analysis", "Communication"],
            "salaryRange": "₹4 LPA - ₹14 LPA",
            "roadmapFocus": "policy frameworks, case studies, reports, stakeholder review",
        },
    ],
    "general": [
        {
            "title": "Career Explorer",
            "description": "A flexible path to help you identify the strongest career direction.",
            "requiredSkills": ["Self-awareness", "Communication", "Basic Digital Skills"],
            "salaryRange": "Varies",
            "roadmapFocus": "exploration, skills sampling, projects, guidance",
        },
        {
            "title": "Operations Associate",
            "description": "Support daily operations while building workplace fundamentals.",
            "requiredSkills": ["Communication", "Excel", "Coordination", "Time Management"],
            "salaryRange": "₹3 LPA - ₹8 LPA",
            "roadmapFocus": "office tools, coordination, productivity, reliability",
        },
    ],
}


def _normalize_interest(interest):
    if not interest:
        return "general"
    interest = str(interest).strip().lower()
    if interest in CAREER_OPTIONS:
        return interest
    if "tech" in interest or "engineering" in interest or "it" in interest:
        return "tech"
    if "business" in interest or "commerce" in interest or "management" in interest:
        return "business"
    if "creative" in interest or "design" in interest or "media" in interest:
        return "creative"
    if "research" in interest or "science" in interest:
        return "research"
    return "general"


def _normalize_text(value):
    return str(value or "").strip().lower()


def _add_unique(careers, item):
    titles = {career["title"] for career in careers}
    if item["title"] not in titles:
        careers.append(item)


def _career_score(career, skill_name, skill_level, ability):
    score = 0
    title = _normalize_text(career.get("title"))
    description = _normalize_text(career.get("description"))
    roadmap_focus = _normalize_text(career.get("roadmapFocus"))
    required_skills = {_normalize_text(item) for item in career.get("requiredSkills", [])}

    skill_name = _normalize_text(skill_name)
    skill_keywords = set(skill_name.split()) if skill_name else set()

    if skill_name and (
        skill_name in required_skills
        or skill_name in title
        or skill_name in description
        or skill_name in roadmap_focus
    ):
        score += 60

    if skill_keywords and any(
        keyword in required_skills or keyword in title or keyword in roadmap_focus
        for keyword in skill_keywords
    ):
        score += 20

    if skill_level == "advanced":
        if any(term in title for term in ["ai engineer", "data scientist", "product manager", "policy analyst", "scientist"]):
            score += 20
    elif skill_level == "beginner":
        if any(term in title for term in ["software developer", "business analyst", "ui/ux designer", "graphic designer", "content creator", "career explorer", "operations associate"]):
            score += 15

    if ability == "high":
        score += 10
    elif ability == "medium":
        score += 5

    return score


def get_recommendations(interest, skills, ability, skill_level=None, skill_name=None, skill_score=None, skill_total=None):
    interest_key = _normalize_interest(interest)
    skills_lower = {str(skill).strip().lower() for skill in (skills or []) if skill}

    careers = [dict(option) for option in CAREER_OPTIONS.get(interest_key, CAREER_OPTIONS["general"])]

    if "python" in skills_lower and interest_key != "tech":
        _add_unique(
            careers,
            {
                "title": "Data Analyst",
                "description": "Use Python, Excel, and SQL to find patterns and insights.",
                "requiredSkills": ["Python", "SQL", "Excel", "Statistics"],
                "salaryRange": "₹4 LPA - ₹12 LPA",
                "roadmapFocus": "data cleaning, charts, insights, business reporting",
            },
        )

    if "communication" in skills_lower or "presentation" in skills_lower:
        _add_unique(
            careers,
            {
                "title": "Product / Client Success",
                "description": "Manage users, clients, or products with strong communication skills.",
                "requiredSkills": ["Communication", "Coordination", "Problem Solving", "Documentation"],
                "salaryRange": "₹4 LPA - ₹14 LPA",
                "roadmapFocus": "stakeholder support, product thinking, client handling",
            },
        )

    if skill_score is not None and skill_total:
        try:
            percentage = (float(skill_score) / float(skill_total)) * 100
            if percentage >= 75:
                skill_level = skill_level or "advanced"
            elif percentage >= 40:
                skill_level = skill_level or "intermediate"
            else:
                skill_level = skill_level or "beginner"
        except Exception:
            pass

    if ability == "low":
        for career in careers:
            career["description"] = f"Beginner-friendly path: {career['description']}"
            career["roadmapFocus"] = f"foundation learning, projects, guidance, {career['roadmapFocus']}"

    ranked = sorted(
        careers,
        key=lambda career: _career_score(career, skill_name, skill_level, ability),
        reverse=True,
    )

    return ranked
