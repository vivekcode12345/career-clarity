import re


SUBJECT_SKILL_MAP = {
    "mathematics": ["logical reasoning", "quantitative aptitude"],
    "maths": ["logical reasoning", "quantitative aptitude"],
    "physics": ["analytical thinking", "problem solving"],
    "chemistry": ["scientific thinking", "attention to detail"],
    "biology": ["observation", "research mindset"],
    "computer science": ["digital literacy", "computational thinking"],
    "informatics": ["digital literacy", "computational thinking"],
    "english": ["communication", "reading comprehension"],
    "economics": ["data interpretation", "critical thinking"],
    "accountancy": ["numerical accuracy", "financial literacy"],
    "business studies": ["business awareness", "decision making"],
    "history": ["research", "contextual analysis"],
    "geography": ["data interpretation", "spatial reasoning"],
    "political science": ["critical thinking", "argumentation"],
}


SUBJECT_ALIASES = {
    "mathematics": ["mathematics", "maths", "math", "basic maths", "standard maths"],
    "physics": ["physics"],
    "chemistry": ["chemistry"],
    "biology": ["biology", "bio"],
    "computer science": ["computer science", "cs", "comp science", "computer"],
    "informatics": ["informatics", "informatics practices", "ip"],
    "english": ["english", "english core", "english language", "eng"],
    "economics": ["economics", "eco"],
    "accountancy": ["accountancy", "accounts", "accounting"],
    "business studies": ["business studies", "bst", "business"],
    "history": ["history"],
    "geography": ["geography", "geo"],
    "political science": ["political science", "political", "civics"],
}


IGNORE_SUBJECT_TOKENS = {
    "total",
    "result",
    "percentage",
    "obtained",
    "grade",
    "marks",
    "grand total",
    "overall",
}


def normalize_education_level(level):
    return (level or "").strip().lower()


def is_school_student(level):
    normalized = normalize_education_level(level)
    if not normalized:
        return False

    school_patterns = [
        r"\bclass\s*10\b",
        r"\bclass\s*12\b",
        r"\b10th\b",
        r"\b12th\b",
        r"\bx\b",
        r"\bxii\b",
        r"\bsecondary\b",
        r"\bhigher\s*secondary\b",
        r"\bintermediate\b",
        r"\bpuc\b",
        r"\bpre\s*university\b",
    ]

    return any(re.search(pattern, normalized) for pattern in school_patterns)


def has_no_cv_intent(message):
    text = (message or "").strip().lower()
    if not text:
        return False

    patterns = [
        r"\bno\s+cv\b",
        r"\bdon'?t\s+have\s+(a\s+)?cv\b",
        r"\bdo\s+not\s+have\s+(a\s+)?cv\b",
        r"\bwithout\s+cv\b",
    ]
    return any(re.search(pattern, text) for pattern in patterns)


def extract_subjects(text):
    lowered = (text or "").lower()
    found = []
    for subject in SUBJECT_SKILL_MAP.keys():
        if subject in lowered:
            found.append(subject)

    ordered_unique = []
    seen = set()
    for subject in found:
        if subject not in seen:
            seen.add(subject)
            ordered_unique.append(subject)

    return ordered_unique


def infer_skills_from_subjects(subjects):
    inferred = []
    seen = set()
    for subject in subjects:
        for skill in SUBJECT_SKILL_MAP.get(subject, []):
            if skill not in seen:
                seen.add(skill)
                inferred.append(skill)
    return inferred


def canonicalize_subject(raw_subject):
    normalized = re.sub(r"[^a-zA-Z\s]", " ", (raw_subject or "").lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        return None

    if normalized in IGNORE_SUBJECT_TOKENS:
        return None

    for canonical, aliases in SUBJECT_ALIASES.items():
        if normalized == canonical or normalized in aliases:
            return canonical

    for canonical, aliases in SUBJECT_ALIASES.items():
        if any(alias in normalized for alias in aliases):
            return canonical

    for subject_key in SUBJECT_SKILL_MAP.keys():
        if subject_key in normalized:
            return subject_key

    return None


def extract_high_marks_subjects(text):
    """
    Extract strongest subjects from marks card text using relative performance.
    Uses top-scoring subjects relative to the highest mark instead of a fixed threshold.
    """
    source_text = text or ""
    scored_subjects = {}

    # Pattern A: "Mathematics: 95" / "Physics - 88" / "English 91"
    pattern_subject_first = r"([A-Za-z][A-Za-z\s&\.-]{1,40}?)[\s:\-]+(\d{1,3})(?:\s*/\s*(\d{2,3}))?"
    for match in re.finditer(pattern_subject_first, source_text):
        raw_subject = match.group(1)
        marks = int(match.group(2))
        if marks < 0 or marks > 100:
            continue
        canonical = canonicalize_subject(raw_subject)
        if not canonical:
            continue
        scored_subjects[canonical] = max(scored_subjects.get(canonical, 0), marks)

    # Pattern B: "95 Mathematics" / "88 Physics"
    pattern_marks_first = r"\b(\d{1,3})(?:\s*/\s*(\d{2,3}))?\s+([A-Za-z][A-Za-z\s&\.-]{1,40})"
    for match in re.finditer(pattern_marks_first, source_text):
        marks = int(match.group(1))
        if marks < 0 or marks > 100:
            continue
        raw_subject = match.group(3)
        canonical = canonicalize_subject(raw_subject)
        if not canonical:
            continue
        scored_subjects[canonical] = max(scored_subjects.get(canonical, 0), marks)

    if scored_subjects:
        sorted_scored = sorted(scored_subjects.items(), key=lambda item: item[1], reverse=True)
        max_marks = sorted_scored[0][1]

        # Relative cutoff: keep subjects at >= 90% of topper score
        # with a small adaptive floor for noisy OCR extraction.
        relative_floor = max(55, int(max_marks * 0.90))

        strongest_subjects = [
            subject for subject, marks in sorted_scored if marks >= relative_floor
        ]

        # Ensure at least one strongest subject and keep output concise.
        if not strongest_subjects and sorted_scored:
            strongest_subjects = [sorted_scored[0][0]]

        return strongest_subjects[:3]

    detected_subjects = extract_subjects(source_text)
    if detected_subjects:
        return detected_subjects[:3]

    # Last fallback via alias scan for OCR-noisy text
    alias_detected = []
    lowered = source_text.lower()
    for canonical, aliases in SUBJECT_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            alias_detected.append(canonical)

    unique_alias_subjects = []
    seen = set()
    for subject in alias_detected:
        if subject not in seen:
            seen.add(subject)
            unique_alias_subjects.append(subject)

    return unique_alias_subjects[:3]
