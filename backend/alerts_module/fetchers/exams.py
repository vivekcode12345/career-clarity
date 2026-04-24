import requests
from bs4 import BeautifulSoup

from alerts_module.models import Opportunity


EXAMS_DATA = [
    {
        "title": "JEE Main 2025",
        "type": "exam",
        "level": "12",
        "link": "https://www.nta.ac.in/",
        "description": "Joint Entrance Examination (Main) for engineering aspirants. Registration, admit card, and results available on official portal.",
        "source": "NTA Official",
        "tags": ["engineering", "entrance-exam", "jee"],
    },
    {
        "title": "JEE Advanced 2025",
        "type": "exam",
        "level": "12",
        "link": "https://www.jeeadv.ac.in/",
        "description": "Advanced entrance examination for top engineering institutes. Only for JEE Main qualifiers.",
        "source": "IIT Official",
        "tags": ["engineering", "entarance-exam", "advanced"],
    },
    {
        "title": "NEET-UG 2025",
        "type": "exam",
        "level": "12",
        "link": "https://neet.ntaonline.org/",
        "description": "National Eligibility cum Entrance Test for undergraduate medical programs. Conducted by NTA annually.",
        "source": "NTA Official",
        "tags": ["medical", "entrance-exam", "neet"],
    },
    {
        "title": "BITSAT 2025",
        "type": "exam",
        "level": "12",
        "link": "https://www.bitsadmission.com/",
        "description": "BITS Pilani Admission Test for engineering and science programs at BITS campuses.",
        "source": "BITS Pilani",
        "tags": ["engineering", "entrance-exam", "technology"],
    },
    {
        "title": "VIT-AP VITEEE 2025",
        "type": "exam",
        "level": "12",
        "link": "https://www.vit.ac.in/",
        "description": "VIT Engineering Entrance Examination for admission to VIT's engineering programs.",
        "source": "VIT University",
        "tags": ["engineering", "entrance-exam", "university"],
    },
    {
        "title": "CUET-UG 2025",
        "type": "exam",
        "level": "12",
        "link": "https://www.nta.ac.in/",
        "description": "Common University Entrance Test for undergraduate programs across central universities.",
        "source": "NTA Official",
        "tags": ["undergraduate", "entrance-exam", "university"],
    },
    {
        "title": "CAT 2025",
        "type": "exam",
        "level": "UG",
        "link": "https://www.iimcat.ac.in/",
        "description": "Common Admission Test for postgraduate management programs in IIMs and premiere business schools.",
        "source": "IIM Official",
        "tags": ["mba", "entrance-exam", "management"],
    },
    {
        "title": "GATE 2026",
        "type": "exam",
        "level": "UG",
        "link": "https://gate.iisc.ac.in/",
        "description": "Graduate Aptitude Test in Engineering for postgraduate engineering programs and PSU recruitment.",
        "source": "IISc Official",
        "tags": ["engineering", "postgraduate", "entrance-exam"],
    },
    {
        "title": "GMAT 2025",
        "type": "exam",
        "level": "UG",
        "link": "https://www.mba.com/",
        "description": "Graduate Management Admission Test for international MBA programs. Available year-round in various formats.",
        "source": "GMAC",
        "tags": ["mba", "international", "entrance-exam"],
    },
    {
        "title": "GRE 2025",
        "type": "exam",
        "level": "UG",
        "link": "https://www.ets.org/gre",
        "description": "Graduate Record Examinations for postgraduate and research programs worldwide.",
        "source": "ETS Official",
        "tags": ["higher-education", "international", "entrance-exam"],
    },
    {
        "title": "NEET-PG 2025",
        "type": "exam",
        "level": "PG",
        "link": "https://nbe.edu.in/",
        "description": "National Eligibility cum Entrance Test for postgraduate medical programs. Essential for medical specialization.",
        "source": "NBE Official",
        "tags": ["medical", "postgraduate", "entrance-exam"],
    },
    {
        "title": "AIIMS PG Entrance 2025",
        "type": "exam",
        "level": "PG",
        "link": "https://www.aiimsexams.org/",
        "description": "AIIMS Postgraduate Entrance Examination for medical specialization at AIIMS institutes.",
        "source": "AIIMS",
        "tags": ["medical", "postgraduate", "entrance-exam"],
    },
    {
        "title": "UGC-NET 2025",
        "type": "exam",
        "level": "PG",
        "link": "https://ugcnet.nta.ac.in/",
        "description": "National Eligibility Test for Junior Research Fellowship and Assistant Professor positions in higher education.",
        "source": "NTA Official",
        "tags": ["academic", "postgraduate", "entrance-exam"],
    },
    {
        "title": "CSIR-UGC NET 2025",
        "type": "exam",
        "level": "PG",
        "link": "https://csirnet.nta.ac.in/",
        "description": "Council of Scientific and Industrial Research National Eligibility Test for research and academic positions.",
        "source": "NTA Official",
        "tags": ["research", "postgraduate", "science"],
    },
]


def fetch_exams(limit=50):
    """
    Fetch competitive entrance exam opportunities.
    Fetches entrance exams for Class 10, 12, UG, and PG levels.
    """
    created_or_updated = 0

    try:
        # Try to fetch additional exams from a web source (fallback to hardcoded data)
        response = requests.get(
            "https://www.careers360.com/entrance-exams",
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        seen = set()
        for anchor in soup.select("a[href]"):
            title = anchor.get_text(" ", strip=True)
            href = anchor.get("href", "")

            if not title or len(title) < 5:
                continue

            title_lower = title.lower()
            if not any(token in title_lower for token in ["exam", "test", "entrance", "entrance", "test"]):
                continue

            link = href if href.startswith("http") else f"https://www.careers360.com{href}"
            key = (title.lower(), link)
            if key in seen:
                continue
            seen.add(key)

            # Detect level from title
            if "12" in title or "neet-ug" in title_lower or "jee" in title_lower or "bitsat" in title_lower:
                level = "12"
            elif "pg" in title_lower or "neet-pg" in title_lower or "gate" in title_lower or "cat" in title_lower:
                level = "PG"
            else:
                level = "UG"

            Opportunity.objects.update_or_create(
                title=title,
                link=link,
                defaults={
                    "type": "exam",
                    "level": level,
                    "description": "Entrance examination opportunity sourced from Careers360.",
                    "source": "Careers360",
                    "tags": ["entrance-exam", "competitive"],
                },
            )
            created_or_updated += 1

            if created_or_updated >= limit:
                break

    except Exception:
        # Use hardcoded comprehensive exam data as fallback
        pass

    # Always ensure we have the comprehensive hardcoded exam data
    for exam_item in EXAMS_DATA[:limit]:
        try:
            Opportunity.objects.update_or_create(
                title=exam_item["title"],
                link=exam_item["link"],
                defaults={
                    "type": exam_item["type"],
                    "level": exam_item["level"],
                    "description": exam_item["description"],
                    "source": exam_item["source"],
                    "tags": exam_item["tags"],
                },
            )
            created_or_updated += 1
        except Exception:
            pass

    return created_or_updated
