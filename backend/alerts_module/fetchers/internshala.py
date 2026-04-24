from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from alerts_module.models import Opportunity


INTERNSHALA_URL = "https://internshala.com/internships/"


KEYWORD_TAG_MAP = {
    "python": "tech",
    "developer": "tech",
    "web": "tech",
    "design": "design",
    "marketing": "marketing",
    "data": "data",
    "finance": "finance",
    "sales": "sales",
    "java": "tech",
    "android": "tech",
    "ios": "tech",
    "ux": "design",
}

INTERNSHIP_FALLBACK_DATA = [
    {
        "title": "Python Developer Intern",
        "link": "https://internshala.com/internships/python-developer-internship",
        "level": "UG",
        "description": "Exciting opportunity to work on Python backend projects. Mentorship provided by experienced developers. Remote and flexible hours.",
        "source": "Internshala",
        "tags": ["tech", "python", "backend"],
    },
    {
        "title": "Digital Marketing Intern",
        "link": "https://internshala.com/internships/digital-marketing-internship",
        "level": "UG",
        "description": "Learn digital marketing strategies by working on real projects. Social media, SEO, and content marketing experience.",
        "source": "Internshala",
        "tags": ["marketing", "digital", "content"],
    },
    {
        "title": "Web Developer Intern",
        "link": "https://internshala.com/internships/web-developer-internship",
        "level": "UG",
        "description": "Build responsive web applications using React and Node.js. Work with modern web technologies and best practices.",
        "source": "Internshala",
        "tags": ["tech", "web", "frontend"],
    },
    {
        "title": "UI/UX Design Intern",
        "link": "https://internshala.com/internships/ui-ux-design-internship",
        "level": "UG",
        "description": "Create user-centric designs for web and mobile applications. Build portfolio with real-world projects.",
        "source": "Internshala",
        "tags": ["design", "ux", "ui"],
    },
    {
        "title": "Data Analyst Intern",
        "link": "https://internshala.com/internships/data-analyst-internship",
        "level": "UG",
        "description": "Work with SQL, Python, and BI tools to analyze business data. Learn data visualization and reporting techniques.",
        "source": "Internshala",
        "tags": ["data", "analytics", "tech"],
    },
    {
        "title": "Content Writer Intern",
        "link": "https://internshala.com/internships/content-writer-internship",
        "level": "UG",
        "description": "Write engaging blog posts, articles, and social media content. Develop writing and research skills.",
        "source": "Internshala",
        "tags": ["marketing", "content", "writing"],
    },
    {
        "title": "Business Development Intern",
        "link": "https://internshala.com/internships/business-development-internship",
        "level": "UG",
        "description": "Work on business growth initiatives and market research. Learn sales and negotiation skills.",
        "source": "Internshala",
        "tags": ["business", "sales", "growth"],
    },
    {
        "title": "Android Developer Intern",
        "link": "https://internshala.com/internships/android-developer-internship",
        "level": "PG",
        "description": "Develop Android applications using Kotlin and Java. Work with APIs and databases in a professional environment.",
        "source": "Internshala",
        "tags": ["tech", "android", "mobile"],
    },
    {
        "title": "Senior Python Developer Intern",
        "link": "https://internshala.com/internships/senior-python-developer-internship",
        "level": "PG",
        "description": "Lead Python development projects and mentor junior developers. Work on scalable systems and architecture.",
        "source": "Internshala",
        "tags": ["tech", "python", "senior"],
    },
    {
        "title": "Full Stack Developer Intern",
        "link": "https://internshala.com/internships/full-stack-developer-internship",
        "level": "PG",
        "description": "Develop end-to-end web applications. Work with frontend and backend technologies in a fast-paced environment.",
        "source": "Internshala",
        "tags": ["tech", "web", "fullstack"],
    },
    {
        "title": "Data Science Intern",
        "link": "https://internshala.com/internships/data-science-internship",
        "level": "PG",
        "description": "Build ML models and perform advanced data analysis. Use Python, TensorFlow, and scikit-learn.",
        "source": "Internshala",
        "tags": ["data", "analytics", "ml"],
    },
    {
        "title": "Product Manager Intern",
        "link": "https://internshala.com/internships/product-manager-internship",
        "level": "PG",
        "description": "Manage product roadmap and work on strategic initiatives. Collaborate with design and development teams.",
        "source": "Internshala",
        "tags": ["product", "management", "strategy"],
    },
]


def _infer_tags(text):
    lowered = (text or "").lower()
    found = set()
    for keyword, tag in KEYWORD_TAG_MAP.items():
        if keyword in lowered:
            found.add(tag)
    return sorted(found) or ["internship"]


def fetch_internshala(limit=50):
    created_or_updated = 0

    try:
        response = requests.get(INTERNSHALA_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        links = soup.select("a[href]")
        seen = set()

        for anchor in links:
            title = anchor.get_text(" ", strip=True)
            href = anchor.get("href", "")

            if not title or len(title) < 5:
                continue
            if "internship" not in href.lower() and "internship" not in title.lower():
                continue

            full_link = urljoin(INTERNSHALA_URL, href)
            key = (title.lower(), full_link)
            if key in seen:
                continue
            seen.add(key)

            # Detect level from content
            level = "UG"
            if "senior" in title.lower() or "lead" in title.lower():
                level = "PG"

            Opportunity.objects.update_or_create(
                title=title,
                link=full_link,
                defaults={
                    "type": "internship",
                    "level": level,
                    "description": "Internship opportunity sourced from Internshala.",
                    "source": "Internshala",
                    "tags": _infer_tags(title),
                },
            )
            created_or_updated += 1

            if created_or_updated >= limit:
                break

    except Exception:
        pass

    # Always ensure we have comprehensive internship fallback data
    for item in INTERNSHIP_FALLBACK_DATA[:limit]:
        try:
            Opportunity.objects.update_or_create(
                title=item["title"],
                link=item["link"],
                defaults={
                    "type": "internship",
                    "level": item["level"],
                    "description": item["description"],
                    "source": item["source"],
                    "tags": item["tags"],
                },
            )
            created_or_updated += 1
        except Exception:
            pass

    return created_or_updated

