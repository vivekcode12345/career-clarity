from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from alerts_module.models import Opportunity


SCHOLARSHIP_URL = "https://scholarships.gov.in/"

SCHOLARSHIP_FALLBACK_DATA = [
    {
        "title": "Pre-Matric Scholarship Scheme",
        "link": "https://scholarships.gov.in/",
        "level": "10",
        "description": "Government scholarship for Class 10 students belonging to minority communities. Financial assistance for education.",
        "source": "National Scholarship Portal",
        "tags": ["scholarship", "minority", "class-10", "government"],
    },
    {
        "title": "Post-Matric Scholarship Scheme",
        "link": "https://scholarships.gov.in/",
        "level": "12",
        "description": "Financial assistance for Class 12 students pursuing higher education. Covers tuition and maintenance.",
        "source": "National Scholarship Portal",
        "tags": ["scholarship", "class-12", "government", "merit"],
    },
    {
        "title": "NSFDC Merit Scholarship",
        "link": "https://scholarships.gov.in/",
        "level": "12",
        "description": "Merit-based scholarship for meritorious Class 12 students from minority communities. Fully funded.",
        "source": "National Scholarship Portal",
        "tags": ["scholarship", "merit", "minority", "class-12"],
    },
    {
        "title": "National Merit Scholarship",
        "link": "https://scholarships.gov.in/",
        "level": "12",
        "description": "For toppers scoring 80% and above. Provides monthly stipend for pursuing undergraduate studies.",
        "source": "National Scholarship Portal",
        "tags": ["scholarship", "merit", "national", "class-12"],
    },
    {
        "title": "Integrated Scholarship for Women",
        "link": "https://scholarships.gov.in/",
        "level": "UG",
        "description": "Comprehensive scholarship scheme for undergraduate women students from disadvantaged backgrounds.",
        "source": "National Scholarship Portal",
        "tags": ["scholarship", "women", "undergraduate", "government"],
    },
    {
        "title": "AICTE Scholarship for Disadvantaged Groups",
        "link": "https://scholarships.gov.in/",
        "level": "UG",
        "description": "Technical education scholarships for marginalized students pursuing engineering and technology programs.",
        "source": "AICTE",
        "tags": ["scholarship", "technical", "engineering", "undergraduate"],
    },
    {
        "title": "DST INSPIRE Scholarship",
        "link": "https://www.dst.gov.in/",
        "level": "UG",
        "description": "Department of Science & Technology scholarship for pursuing science and technology higher education. ₹50,000 scholarship.",
        "source": "Department of Science & Technology",
        "tags": ["scholarship", "science", "technology", "undergraduate"],
    },
    {
        "title": "CSIR Fellowship for Science Students",
        "link": "https://www.csir.res.in/",
        "level": "UG",
        "description": "Fellowship for meritorious science students pursuing advanced research in CSIR laboratories.",
        "source": "CSIR",
        "tags": ["scholarship", "science", "research", "fellowship"],
    },
    {
        "title": "UGC Scholarship for Research",
        "link": "https://www.ugc.ac.in/",
        "level": "PG",
        "description": "Merit-based research scholarship for postgraduate students pursuing PhD and research programs.",
        "source": "University Grants Commission",
        "tags": ["scholarship", "research", "postgraduate", "phd"],
    },
    {
        "title": "ICMR Research Scholarship",
        "link": "https://www.icmr.gov.in/",
        "level": "PG",
        "description": "Research scholarships for medical and health science postgraduate students. Monthly stipend and research funding.",
        "source": "ICMR",
        "tags": ["scholarship", "medical", "research", "postgraduate"],
    },
    {
        "title": "DBT Fellowship for Life Sciences",
        "link": "https://www.dbtindia.gov.in/",
        "level": "PG",
        "description": "Department of Biotechnology fellowship for pursuing postgraduate research in life sciences.",
        "source": "DBT",
        "tags": ["scholarship", "biotechnology", "research", "postgraduate"],
    },
    {
        "title": "Fulbright Scholarship Program",
        "link": "https://www.usief.org.in/",
        "level": "PG",
        "description": "US Government scholarship for studying in American universities. Covers tuition, living expenses, and airfare.",
        "source": "USIEF",
        "tags": ["scholarship", "international", "postgraduate", "competitive"],
    },
]


def _detect_level(text):
    lowered = (text or "").lower()
    if "phd" in lowered or "doctoral" in lowered or "postgraduate" in lowered or "pg" in lowered:
        return "PG"
    if "undergraduate" in lowered or "ug" in lowered or "bachelor" in lowered:
        return "UG"
    if "10" in lowered or "ssc" in lowered or "secondary" in lowered:
        return "10"
    if "12" in lowered or "intermediate" in lowered or "hsc" in lowered:
        return "12"
    return "12"


def fetch_scholarships(limit=50):
    created_or_updated = 0

    try:
        response = requests.get(SCHOLARSHIP_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        seen = set()
        for anchor in soup.select("a[href]"):
            title = anchor.get_text(" ", strip=True)
            href = anchor.get("href", "")

            if not title or len(title) < 5:
                continue

            title_lower = title.lower()
            if not any(k in title_lower for k in ["scholar", "scheme", "student", "fellowship", "grant"]):
                continue

            full_link = urljoin(SCHOLARSHIP_URL, href)
            key = (title.lower(), full_link)
            if key in seen:
                continue
            seen.add(key)

            level = _detect_level(title)
            Opportunity.objects.update_or_create(
                title=title,
                link=full_link,
                defaults={
                    "type": "scholarship",
                    "level": level,
                    "description": "Scholarship opportunity sourced from NSP.",
                    "source": "National Scholarship Portal",
                    "tags": ["scholarship", f"class-{level}"],
                },
            )
            created_or_updated += 1

            if created_or_updated >= limit:
                break

    except Exception:
        pass

    # Always ensure we have comprehensive scholarship fallback data
    for item in SCHOLARSHIP_FALLBACK_DATA[:limit]:
        try:
            Opportunity.objects.update_or_create(
                title=item["title"],
                link=item["link"],
                defaults={
                    "type": "scholarship",
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

