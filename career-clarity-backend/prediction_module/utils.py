import requests
import json
import hashlib
import re
from django.conf import settings
import logging

MIN_RECOMMENDATION_COUNT = 3
MAX_RECOMMENDATION_COUNT = 4

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
    Build a personalized prompt for AI to generate top career recommendations.
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

Based on the following user profile, recommend the TOP 3 to 4 most suitable careers. Be specific and personalized.

**User Profile:**
- Overall Ability Level: {ability.upper()} (scale: low/medium/high)
- Career Interest: {interest}
- Known Skills: {skills_str}
- Strongest Skill: {skill_name} (Level: {skill_level}, Score: {skill_score}/10)
- Skill Test History:
{history_str}

**Important Guidelines:**
1. Generate ONLY 3 or 4 career recommendations
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
                        cleaned = [item for item in data["recommendations"] if isinstance(item, dict)]
                        return cleaned[:MAX_RECOMMENDATION_COUNT]
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse AI response: {content}")
                    return []
        else:
            logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
            return []

    except Exception as e:
        logger.error(f"AI recommendation generation error: {str(e)}")
        return []


def call_ai_json_response(prompt, max_tokens=1200):
    import os

    api_key = os.getenv("OPENROUTER_API_KEY") or getattr(settings, "OPENROUTER_API_KEY", None)
    if not api_key:
        logger.error("OPENROUTER_API_KEY not configured")
        return None

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
                "temperature": 0.4,
                "max_tokens": max_tokens,
            },
            timeout=30,
        )

        if response.status_code != 200:
            logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
            return None

        result = response.json()
        if "choices" not in result or not result["choices"]:
            return None

        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(content[start:end])
                except Exception:
                    pass
            return None
    except Exception as exc:
        logger.error(f"AI JSON response error: {exc}")
        return None


def generate_ai_recommendations(ability, interest, skills, skill_name, skill_level, skill_score, skill_history=None):
    """
    Generate personalized career recommendations using AI.
    Returns list of personalized recommendations or fallback careers.
    """
    prompt = build_recommendations_prompt(ability, interest, skills, skill_name, skill_level, skill_score, skill_history=skill_history)
    recommendations = call_ai_for_recommendations(prompt)

    if recommendations and MIN_RECOMMENDATION_COUNT <= len(recommendations) <= MAX_RECOMMENDATION_COUNT:
        return recommendations

    # Fallback to rule-based ranking + broader pool if AI fails/returns too few
    logger.warning("AI recommendation insufficient, using fallback careers")

    fallback_ranked = get_recommendations(
        interest=interest,
        skills=skills,
        ability=ability,
        skill_level=skill_level,
        skill_name=skill_name,
        skill_score=skill_score,
        skill_total=10,
    )

    merged = []
    seen_titles = set()

    for item in fallback_ranked:
        title = str(item.get("title", "")).strip().lower()
        if title and title not in seen_titles:
            merged.append(item)
            seen_titles.add(title)
        if len(merged) >= MAX_RECOMMENDATION_COUNT:
            return merged

    for category_items in CAREER_OPTIONS.values():
        for item in category_items:
            title = str(item.get("title", "")).strip().lower()
            if title and title not in seen_titles:
                merged.append(item)
                seen_titles.add(title)
            if len(merged) >= MAX_RECOMMENDATION_COUNT:
                return merged

    return merged[:MAX_RECOMMENDATION_COUNT]


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


def _career_score(career, skill_name, skill_level, ability, user_skills=None, preferred_titles=None):
    score = 0
    title = _normalize_text(career.get("title"))
    description = _normalize_text(career.get("description"))
    roadmap_focus = _normalize_text(career.get("roadmapFocus"))
    required_skills = {_normalize_text(item) for item in career.get("requiredSkills", [])}
    required_tokens = {
        token
        for item in required_skills
        for token in item.split()
        if token
    }
    user_skills_norm = {_normalize_text(item) for item in (user_skills or []) if _normalize_text(item)}
    user_tokens = {
        token
        for item in user_skills_norm
        for token in item.split()
        if token
    }

    skill_name = _normalize_text(skill_name)
    skill_keywords = set(skill_name.split()) if skill_name else set()

    if preferred_titles and title in preferred_titles:
        score += 22

    overlap_skills = len(required_skills.intersection(user_skills_norm))
    if overlap_skills:
        score += overlap_skills * 18

    overlap_keywords = len(required_tokens.intersection(user_tokens))
    if overlap_keywords:
        score += min(overlap_keywords * 6, 24)

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
    preferred_titles = {
        _normalize_text(option.get("title"))
        for option in CAREER_OPTIONS.get(interest_key, [])
        if isinstance(option, dict)
    }

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

    user_signature = "|".join(
        [
            interest_key,
            ability or "",
            _normalize_text(skill_name),
            ",".join(sorted(skills_lower)),
        ]
    )

    def _rank_key(career):
        title = _normalize_text(career.get("title"))
        base_score = _career_score(
            career,
            skill_name,
            skill_level,
            ability,
            user_skills=skills_lower,
            preferred_titles=preferred_titles,
        )
        tie_breaker = int(
            hashlib.sha256(f"{user_signature}|{title}".encode("utf-8")).hexdigest()[:8],
            16,
        )
        return (base_score, tie_breaker)

    ranked = sorted(careers, key=_rank_key, reverse=True)

    return ranked


def estimate_career_timeline(career_data, user_skills=None, ability="medium", skill_level=""):
    user_skill_set = {_normalize_text(item) for item in (user_skills or []) if _normalize_text(item)}
    required = [_normalize_text(item) for item in (career_data or {}).get("requiredSkills", []) if _normalize_text(item)]

    if required:
        missing_count = len([item for item in required if item not in user_skill_set])
    else:
        missing_count = 2

    ability_factor = {
        "high": -1,
        "medium": 0,
        "low": 2,
    }.get(_normalize_text(ability), 0)

    level_factor = {
        "advanced": -1,
        "intermediate": 0,
        "beginner": 1,
    }.get(_normalize_text(skill_level), 0)

    score = max(1, missing_count + ability_factor + level_factor)

    if score <= 1:
        duration = "3-5 months"
        stage = "Fast-track"
    elif score <= 3:
        duration = "6-9 months"
        stage = "Core-track"
    elif score <= 5:
        duration = "10-14 months"
        stage = "Growth-track"
    else:
        duration = "15-20 months"
        stage = "Foundation-track"

    return {
        "duration": duration,
        "stage": stage,
        "missing_skills_count": missing_count,
    }


LEVEL_TYPE_MAP = {
    "10": "junior",
    "12": "ug",
    "ug": "pg",
    "pg": "pg",
}


LEVEL_DEFAULT_COURSES = {
    "10": ["MPC", "BiPC", "MEC", "CEC"],
    "12": ["B.Tech", "BSc", "BCA", "BBA"],
    "ug": ["M.Tech", "MBA", "MSc"],
    "pg": ["PhD", "Research", "Specialization"],
}


INTEREST_COURSE_MAP = {
    "tech": ["B.Tech", "BSc Computer Science", "BCA", "M.Tech", "MSc Computer Science"],
    "business": ["BBA", "BCom", "MBA"],
    "science": ["BSc", "BiPC", "MSc"],
    "math": ["MPC", "BSc Math", "MSc Math"],
}


def normalize_user_level(raw_level):
    value = str(raw_level or "").strip().lower()
    if value in {"10", "class 10", "x", "ssc"}:
        return "10"
    if value in {"12", "class 12", "xii", "inter", "intermediate"}:
        return "12"
    if value in {"ug", "undergraduate", "bachelor", "bachelors"}:
        return "ug"
    if value in {"pg", "postgraduate", "masters", "master"}:
        return "pg"
    return "12"


def map_interest_to_courses(interest):
    interest_key = _normalize_interest(interest)
    return INTEREST_COURSE_MAP.get(interest_key, [])


def get_recommended_courses(user_level, interest, course_override=None):
    level_key = normalize_user_level(user_level)
    recommended = list(LEVEL_DEFAULT_COURSES.get(level_key, []))

    for item in map_interest_to_courses(interest):
        if item not in recommended:
            recommended.append(item)

    if course_override:
        override = str(course_override).strip()
        if override and override not in recommended:
            recommended.insert(0, override)

    return recommended


def parse_college_courses(courses):
    if isinstance(courses, list):
        return [str(item).strip() for item in courses if str(item).strip()]
    if isinstance(courses, str):
        return [item.strip() for item in courses.split(",") if item.strip()]
    return []


def _has_text_match(target, candidates):
    target_norm = _normalize_text(target)
    if not target_norm:
        return False
    for candidate in candidates:
        candidate_norm = _normalize_text(candidate)
        if target_norm in candidate_norm or candidate_norm in target_norm:
            return True
    return False


def rank_colleges(colleges, user_profile):
    ranked = []

    recommended_courses = user_profile.get("recommended_courses", [])
    interest = user_profile.get("interest", "")
    skills = user_profile.get("skills", []) or []
    ability = str(user_profile.get("ability", "medium")).strip().lower()
    preferred_location = user_profile.get("location")
    max_fee = user_profile.get("max_fee")
    course_override = user_profile.get("course_override")

    for college in colleges:
        courses = parse_college_courses(getattr(college, "courses", []))
        score = 0.0

        # Interest / course alignment
        interest_match = any(_has_text_match(course, courses) for course in recommended_courses)
        if interest_match:
            score += 3

        # Skill alignment
        if skills:
            if any(_has_text_match(skill, courses + [college.name]) for skill in skills):
                score += 3

        # Ability alignment
        college_rating = getattr(college, "rating", None)
        college_fees = getattr(college, "fees", 0) or 0
        if ability == "high":
            if college_rating is not None and college_rating >= 4.0:
                score += 2
        elif ability == "medium":
            if college_rating is not None and college_rating >= 3.0:
                score += 2
        else:
            if college_fees and college_fees <= 250000:
                score += 2

        # Rating presence bonus
        if college_rating is not None:
            score += 1

        # Soft preferences from query params (do not remove colleges)
        if preferred_location:
            if _has_text_match(preferred_location, [college.location]):
                score += 1.5
            else:
                score -= 0.5

        if max_fee is not None:
            if college_fees and college_fees <= max_fee:
                score += 1.5
            else:
                score -= 1

        if course_override:
            if _has_text_match(course_override, courses):
                score += 1
            else:
                score -= 0.5

        ranked.append(
            {
                "id": college.id,
                "name": college.name,
                "location": college.location,
                "courses": courses,
                "fees": college_fees,
                "rating": college_rating,
                "type": college.type,
                "apply_link": college.apply_link,
                "score": round(score, 2),
            }
        )

    ranked.sort(key=lambda item: (item["score"], item.get("rating") or 0), reverse=True)
    return ranked


def build_college_highlight_prompt(user_profile, candidate_colleges):
    colleges_payload = []
    for college in candidate_colleges[:20]:
        colleges_payload.append(
            {
                "name": college.get("name"),
                "location": college.get("location"),
                "courses": college.get("courses", []),
                "fees": college.get("fees"),
                "rating": college.get("rating"),
                "type": college.get("type"),
            }
        )

    return f"""You are an expert college advisor.

User context:
- User level: {user_profile.get('user_level')}
- Ability: {user_profile.get('ability')}
- Interest: {user_profile.get('interest')}
- Skills: {', '.join(user_profile.get('skills') or [])}
- Recommended courses: {', '.join(user_profile.get('recommended_courses') or [])}

Candidate colleges (use ONLY from this list):
{json.dumps(colleges_payload, ensure_ascii=False)}

Task:
Pick the TOP 3 to 5 best colleges for this user and assign a relevance score from 0 to 100.
Return JSON only in this format:
{{
  "recommended": [
    {{
      "name": "College Name",
      "relevance_score": 92,
      "reason": "Why it matches the user",
      "location": "City",
      "course": "Best course",
      "fees": 123456,
      "apply_link": "https://..."
    }}
  ]
}}

Return only JSON."""


def call_ai_for_college_highlights(prompt):
    data = call_ai_json_response(prompt, max_tokens=1400)
    if isinstance(data, dict) and isinstance(data.get("recommended"), list):
        cleaned = [item for item in data["recommended"] if isinstance(item, dict)]
        return cleaned[:5]
    return []


def generate_ai_college_highlights(user_profile, candidate_colleges):
    prompt = build_college_highlight_prompt(user_profile, candidate_colleges)
    highlighted = call_ai_for_college_highlights(prompt)
    if highlighted:
        return highlighted

    fallback = []
    for college in candidate_colleges[:5]:
        fallback.append(
            {
                "name": college.get("name"),
                "relevance_score": int(college.get("score", 0) or 0),
                "reason": "Best match based on your profile and ranking score.",
                "location": college.get("location"),
                "course": college.get("courses", [None])[0] if college.get("courses") else "",
                "fees": college.get("fees"),
                "apply_link": college.get("apply_link"),
            }
        )
    return fallback


def build_college_feedback_prompt(college, user_profile):
    return f"""You are an AI college advisor.

User profile:
- User level: {user_profile.get('user_level')}
- Ability: {user_profile.get('ability')}
- Interest: {user_profile.get('interest')}
- Skills: {', '.join(user_profile.get('skills') or [])}
- Recommended courses: {', '.join(user_profile.get('recommended_courses') or [])}

College:
- Name: {college.get('name')}
- Location: {college.get('location')}
- Courses: {college.get('courses')}
- Fees: {college.get('fees')}
- Rating: {college.get('rating')}

Return JSON only in this format:
{{
  "should_choose": true,
  "message": "short personalized explanation",
  "why_not": "short note if not ideal, otherwise empty string",
  "match_score": 0-100
}}

Be specific and concise."""


def generate_ai_college_feedback(college, user_profile):
    prompt = build_college_feedback_prompt(college, user_profile)
    result = call_ai_json_response(prompt, max_tokens=900)
    if isinstance(result, dict):
        return {
            "should_choose": bool(result.get("should_choose", False)),
            "message": str(result.get("message", "")).strip(),
            "why_not": str(result.get("why_not", "")).strip(),
            "match_score": int(result.get("match_score", 0) or 0),
        }

    courses = [str(item).lower() for item in (college.get("courses") or [])]
    recommended = [str(item).lower() for item in (user_profile.get("recommended_courses") or [])]
    overlap = len(set(courses) & set(recommended))
    should_choose = overlap > 0
    return {
        "should_choose": should_choose,
        "message": "This college matches your profile well." if should_choose else "This college is acceptable but not the strongest match for your current profile.",
        "why_not": "" if should_choose else "Course or level alignment is weaker than the top picks.",
        "match_score": min(100, max(0, overlap * 25)),
    }


def paginate_items(items, page=1, page_size=15):
    try:
        page = max(1, int(page))
    except Exception:
        page = 1

    try:
        page_size = max(1, min(15, int(page_size)))
    except Exception:
        page_size = 15

    total_count = len(items)
    total_pages = max(1, (total_count + page_size - 1) // page_size)
    if page > total_pages:
        page = total_pages

    start = (page - 1) * page_size
    end = start + page_size
    sliced = items[start:end]

    return {
        "items": sliced,
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }


def build_college_filter_signature(user_level, ability, interest, skills, location, max_fee, course_override, search=None):
    payload = {
        "user_level": user_level,
        "ability": ability,
        "interest": interest,
        "skills": skills or [],
        "location": location or "",
        "max_fee": max_fee if max_fee is not None else "",
        "course_override": course_override or "",
        "search": search or "",
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _normalize_skill_items(values):
    if not values:
        return []

    if isinstance(values, str):
        values = [values]
    elif not isinstance(values, (list, tuple, set)):
        return []

    cleaned = []
    seen = set()
    for item in values:
        text = str(item or "").strip().lower()
        if not text:
            continue
        if text in seen:
            continue
        seen.add(text)
        cleaned.append(text)
    return cleaned


def _extract_keyword_skills(text):
    content = str(text or "").lower()
    if not content:
        return []

    raw_tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.\-/]*", content)
    stop_words = {
        "and", "the", "for", "with", "from", "into", "your", "this", "that", "you", "are",
        "about", "will", "have", "has", "had", "been", "being", "their", "them", "they", "our",
        "should", "must", "also", "more", "less", "than", "then", "step", "steps", "course", "career",
        "focus", "roadmap", "learn", "learning", "build", "based", "level", "high", "medium", "low",
        "next", "title", "description", "resource", "resources", "project", "projects", "skill", "skills",
    }

    keywords = []
    seen = set()
    for token in raw_tokens:
        token = token.strip("-./")
        if len(token) < 3 or token in stop_words or token.isdigit():
            continue
        if token in seen:
            continue
        seen.add(token)
        keywords.append(token)
    return keywords


def _extract_required_skills_from_roadmap(roadmap_data):
    if not isinstance(roadmap_data, dict):
        return []

    extracted = []
    extracted.extend(_normalize_skill_items(roadmap_data.get("skillRoadmap", [])))

    steps = roadmap_data.get("steps", [])
    if isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict):
                continue
            extracted.extend(_extract_keyword_skills(step.get("title", "")))
            extracted.extend(_extract_keyword_skills(step.get("description", "")))

    exams = roadmap_data.get("exams", [])
    certifications = roadmap_data.get("certifications", [])
    extracted.extend(_normalize_skill_items(exams))
    extracted.extend(_normalize_skill_items(certifications))

    return _normalize_skill_items(extracted)


def _extract_required_skills_from_career_data(career_data):
    if not isinstance(career_data, dict):
        return []

    direct_skills = career_data.get("requiredSkills") or career_data.get("skills") or []
    extracted = _normalize_skill_items(direct_skills)
    if extracted:
        return extracted

    tag_values = career_data.get("tags") or []
    extracted.extend(_normalize_skill_items(tag_values))

    keyword_fields = [
        career_data.get("title", ""),
        career_data.get("name", ""),
        career_data.get("career", ""),
        career_data.get("description", ""),
        career_data.get("roadmapFocus", ""),
        career_data.get("reason", ""),
    ]
    for value in keyword_fields:
        extracted.extend(_extract_keyword_skills(value))

    return _normalize_skill_items(extracted)


def get_skill_gap(user, career_data):
    from accounts.models import Profile
    from cv_module.models import CVProfile
    from .models import SavedRoadmap

    profile = Profile.objects.filter(user=user).first()
    cv_profile = CVProfile.objects.filter(user=user).first()

    user_skills = []
    if cv_profile and isinstance(cv_profile.skills, list):
        user_skills = cv_profile.skills
    elif profile and isinstance(profile.skills, list):
        user_skills = profile.skills

    normalized_user_skills = _normalize_skill_items(user_skills)

    career_title = ""
    if isinstance(career_data, dict):
        career_title = str(
            career_data.get("title")
            or career_data.get("name")
            or career_data.get("career")
            or ""
        ).strip()

    required_skills = []

    if career_title:
        saved_roadmap = SavedRoadmap.objects.filter(user=user, career_title=career_title).first()
        if saved_roadmap and isinstance(saved_roadmap.roadmap_data, dict):
            required_skills = _extract_required_skills_from_roadmap(saved_roadmap.roadmap_data)

    if not required_skills:
        required_skills = _extract_required_skills_from_career_data(career_data)

    normalized_required_skills = _normalize_skill_items(required_skills)
    if not normalized_required_skills:
        return None

    user_skill_set = set(normalized_user_skills)
    have_skills = [skill for skill in normalized_required_skills if skill in user_skill_set]
    missing_skills = [skill for skill in normalized_required_skills if skill not in user_skill_set]

    return {
        "have_skills": have_skills,
        "missing_skills": missing_skills,
    }
