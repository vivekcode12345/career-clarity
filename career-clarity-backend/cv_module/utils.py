import spacy
from spacy.matcher import PhraseMatcher
from spacy.util import filter_spans
from spacy.tokens import Span
import pdfplumber
import os
import io
import sys
import re
from contextlib import contextmanager

# Force UTF-8 encoding for the process
os.environ["PYTHONIOENCODING"] = "utf-8"

@contextmanager
def suppress_stdout_stderr():
    """A context manager that redirects stdout and stderr to devnull."""
    with open(os.devnull, 'w', encoding='utf-8') as fnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = fnull
        sys.stderr = fnull
        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

# Lazy load OCR reader
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        # Disable verbose to prevent progress bars and console prints
        _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    return _ocr_reader

# Load NLP model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError(
        "spaCy model 'en_core_web_sm' is not installed. "
        "Run: python -m spacy download en_core_web_sm"
    )

def safe_print(msg):
    """Safely print to console even if encoding doesn't support characters."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', errors='replace').decode('ascii'))

SKILLS_LIST = [
    # ── CS / IT: Programming Languages ──────────────────────────────────────
    "python", "java", "c", "c++", "c#", "javascript", "typescript", "ruby",
    "go", "rust", "swift", "kotlin", "php", "perl", "sql", "dart", "scala",
    "objective-c", "r programming", "matlab", "bash", "shell scripting", "powershell",
    "assembly", "fortran", "cobol", "haskell", "lua", "julia",

    # ── CS / IT: Web & Frameworks ────────────────────────────────────────────
    "html", "html5", "css", "css3", "django", "flask", "fastapi", "react",
    "angular", "vue", "next.js", "nuxt.js", "svelte", "express", "node.js",
    "spring boot", "laravel", "asp.net", "jquery", "bootstrap", "tailwind",
    "webpack", "vite", "redux", "graphql", "apollo", "rest api", "soap",

    # ── CS / IT: Mobile ──────────────────────────────────────────────────────
    "flutter", "react native", "android", "ios", "xamarin", "ionic", "capacitor",

    # ── CS / IT: Data Science & AI ───────────────────────────────────────────
    "machine learning", "deep learning", "data science", "natural language processing",
    "computer vision", "tensorflow", "pytorch", "keras", "pandas", "numpy",
    "scikit-learn", "scipy", "spark", "hadoop", "tableau", "power bi",
    "matplotlib", "seaborn", "nltk", "transformers", "langchain", "opencv",
    "reinforcement learning", "generative ai", "llm", "data analysis",
    "data visualization", "statistics", "regression", "classification",

    # ── CS / IT: Cloud & DevOps ──────────────────────────────────────────────
    "aws", "azure", "google cloud", "gcp", "docker", "kubernetes", "jenkins",
    "terraform", "ansible", "git", "gitlab", "github actions", "linux", "bash",
    "nginx", "apache", "ci/cd", "prometheus", "grafana", "devops", "mlops",

    # ── CS / IT: Databases ───────────────────────────────────────────────────
    "mongodb", "postgresql", "mysql", "redis", "cassandra", "firebase",
    "sqlite", "oracle", "elasticsearch", "mariadb", "dynamodb", "supabase",
    "prisma", "nosql", "sql server",

    # ── CS / IT: Tools & Other ───────────────────────────────────────────────
    "jira", "confluence", "postman", "agile", "scrum", "unit testing",
    "microservices", "figma", "socket.io", "selenium", "cybersecurity",
    "ethical hacking", "penetration testing", "networking", "blockchain",
    "cryptography", "computer networks", "operating systems",

    # ── ECE / EEE: Electronics & Embedded ───────────────────────────────────
    "vlsi", "vhdl", "verilog", "fpga", "embedded systems", "embedded c",
    "microcontrollers", "arduino", "raspberry pi", "stm32", "arm cortex",
    "rtos", "pic microcontroller", "8051", "esp32", "esp8266",
    "signal processing", "dsp", "digital signal processing",
    "image processing", "rfid", "iot", "internet of things",
    "pcb design", "altium designer", "eagle cad", "kicad", "ltspice",
    "proteus", "multisim", "circuit design", "analog circuits",
    "digital circuits", "communication systems", "wireless communication",
    "5g", "lte", "antenna design", "rf design", "radar systems",
    "optical fiber", "satellite communication", "gsm", "zigbee", "bluetooth",
    "sensor fusion", "plc", "scada", "hmi",

    # ── EE: Electrical Engineering ───────────────────────────────────────────
    "power systems", "power electronics", "electric machines",
    "control systems", "pid controller", "simulink", "matlab simulink",
    "high voltage engineering", "renewable energy", "solar energy",
    "wind energy", "smart grid", "energy management", "drives",
    "inverter design", "transformer design", "protection systems",
    "load flow analysis", "transient analysis", "autocad electrical",
    "pscad", "etap", "powerworld",

    # ── Mechanical Engineering ───────────────────────────────────────────────
    "autocad", "solidworks", "catia", "ansys", "creo", "nx cad",
    "3d printing", "additive manufacturing", "cfd", "fea",
    "finite element analysis", "computational fluid dynamics",
    "thermodynamics", "fluid mechanics", "heat transfer", "manufacturing",
    "cnc machining", "cam", "product design", "hvac", "robotics",
    "automation", "lean manufacturing", "six sigma", "quality control",
    "tribology", "dynamics", "kinematics", "materials science",
    "composite materials", "welding",

    # ── Civil Engineering ────────────────────────────────────────────────────
    "staad pro", "sap2000", "etabs", "revit", "civil 3d",
    "structural analysis", "structural design", "rcc design",
    "steel design", "geotechnical engineering", "soil mechanics",
    "surveying", "remote sensing", "gis", "transportation engineering",
    "highway design", "water resources", "hydraulics", "hydrology",
    "environmental engineering", "water treatment", "project management",
    "primavera", "ms project", "construction management", "quantity surveying",

    # ── Chemical Engineering ─────────────────────────────────────────────────
    "aspen plus", "aspen hysys", "process simulation", "chemical process design",
    "mass transfer", "heat exchanger design", "reaction engineering",
    "process control", "polymers", "distillation", "absorption",
    "fluid dynamics", "safety analysis", "hazop", "refinery operations",

    # ── Biotechnology / Biomedical ───────────────────────────────────────────
    "bioinformatics", "genomics", "proteomics", "pcr", "gel electrophoresis",
    "cloning", "crispr", "cell culture", "biostatistics", "r programming",
    "biopython", "blast", "molecular biology", "microbiology",
    "biochemistry", "immunology", "drug discovery", "clinical trials",
    "medical imaging", "biomedical signal processing", "health informatics",

    # ── Aerospace / Aeronautical ─────────────────────────────────────────────
    "aerodynamics", "propulsion", "avionics", "flight mechanics",
    "structural mechanics", "composite structures", "cfd analysis",
    "openfoam", "xfoil", "catia v5",

    # ── Soft / Management Skills ─────────────────────────────────────────────
    "leadership", "communication", "problem solving", "teamwork",
    "critical thinking", "time management", "research", "public speaking",
    "negotiation", "conflict resolution", "decision making", "innovation",

    # ── Medicine / Healthcare ─────────────────────────────────────────────────
    "anatomy", "physiology", "pharmacology", "pathology", "clinical diagnosis",
    "patient care", "surgery", "radiology", "ecg", "emergency medicine",
    "nursing", "medical coding", "icd-10", "electronic health records", "ehr",
    "telemedicine", "public health", "epidemiology", "nutrition", "pharmacy",
    "first aid", "cpr", "medical research", "clinical research",

    # ── Law / Legal ───────────────────────────────────────────────────────────
    "legal research", "contract law", "corporate law", "criminal law",
    "intellectual property", "taxation law", "constitutional law",
    "legal drafting", "litigation", "arbitration", "compliance",
    "due diligence", "legal writing", "case analysis",

    # ── Finance / Accounting / Economics ─────────────────────────────────────
    "financial analysis", "financial modeling", "valuation", "accounting",
    "bookkeeping", "auditing", "taxation", "gst", "tally", "sap fi",
    "excel", "advanced excel", "pivot tables", "vba", "bloomberg",
    "equity research", "portfolio management", "risk management",
    "investment banking", "corporate finance", "derivatives",
    "mutual funds", "economics", "macroeconomics", "microeconomics",
    "econometrics", "forecasting", "budgeting",

    # ── Business / Management / MBA ───────────────────────────────────────────
    "business analysis", "strategic planning", "operations management",
    "supply chain management", "logistics", "procurement",
    "human resources", "talent acquisition", "performance management",
    "marketing", "digital marketing", "seo", "sem", "social media marketing",
    "content marketing", "brand management", "market research",
    "sales", "crm", "erp", "sap", "business intelligence",
    "entrepreneurship", "product management", "stakeholder management",

    # ── Design / Media / Arts ─────────────────────────────────────────────────
    "adobe photoshop", "adobe illustrator", "adobe indesign", "adobe premiere",
    "adobe after effects", "figma", "sketch", "ui design", "ux design",
    "graphic design", "motion graphics", "video editing", "3d modeling",
    "blender", "maya", "unity", "unreal engine", "game design",
    "photography", "cinematography", "audio editing", "music production",
    "content creation", "animation",

    # ── Education / Teaching ──────────────────────────────────────────────────
    "curriculum development", "lesson planning", "classroom management",
    "e-learning", "instructional design", "lms", "moodle", "mentoring",
    "training", "assessment design", "special education",

    # ── Psychology / Social Sciences ──────────────────────────────────────────
    "counseling", "psychotherapy", "cognitive behavioral therapy", "cbt",
    "assessment tools", "social work", "community development",
    "sociology", "anthropology", "behavioral analysis", "spss", "nvivo",
    "qualitative research", "quantitative research", "survey design",

    # ── Architecture / Urban Planning ─────────────────────────────────────────
    "architectural design", "urban planning", "revit architecture",
    "sketchup", "lumion", "rhino", "grasshopper", "bim", "autocad architecture",
    "landscape design", "interior design", "sustainable design",

    # ── Agriculture / Environmental Science ──────────────────────────────────
    "crop science", "soil science", "agronomy", "horticulture",
    "agricultural economics", "remote sensing", "precision agriculture",
    "environmental impact assessment", "climate change", "ecology",
    "waste management", "water quality", "conservation",

    # ── Hospitality / Tourism ─────────────────────────────────────────────────
    "hotel management", "food and beverage", "event management",
    "travel management", "reservation systems", "customer service",
    "front office", "housekeeping",

    # ── Journalism / Mass Communication ──────────────────────────────────────
    "journalism", "news writing", "copywriting", "proofreading", "editing",
    "broadcast media", "radio", "podcasting", "public relations",
    "media planning", "storytelling", "wordpress", "cms",
]

# Build matcher ONCE at module load — not on every request
_MATCHER = PhraseMatcher(nlp.vocab, attr="LOWER")
_MATCHER.add("SKILL", [nlp.make_doc(skill) for skill in SKILLS_LIST])

def extract_text_from_image(file):
    """Extract text from an image using EasyOCR."""
    try:
        safe_print(f"[DEBUG] Starting OCR for image: {getattr(file, 'name', 'Uploaded Image')}")
        reader = get_ocr_reader()
        # Read the file content into bytes
        file.seek(0)
        img_bytes = file.read()
        
        # Suppress internal prints/progress bars that cause encoding errors
        with suppress_stdout_stderr():
            results = reader.readtext(img_bytes, detail=0)
            
        text = " ".join(results)
        safe_print(f"[DEBUG] OCR complete. Extracted {len(text)} characters.")
        return text
    except Exception as e:
        safe_print(f"[DEBUG] OCR Error: {str(e)}")
        raise Exception(f"OCR Error: {str(e)}")

def extract_text_from_pdf(file):
    text = ""
    try:
        safe_print(f"[DEBUG] Starting extraction for file: {getattr(file, 'name', 'Uploaded File')}")

        # Read all bytes once into a BytesIO buffer.
        # pdfplumber closes the underlying file handle when its `with` block exits,
        # so passing the Django file object directly causes "I/O operation on closed file"
        # on the second open. BytesIO is always seekable and never closes.
        file.seek(0)
        pdf_bytes = io.BytesIO(file.read())

        with pdfplumber.open(pdf_bytes) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        # Fallback to OCR if no text was found (scanned PDF)
        if len(text.strip()) < 50:
            safe_print(f"[DEBUG] Low text count ({len(text)}). Attempting OCR fallback...")
            pdf_bytes.seek(0)  # rewind the buffer — always safe on BytesIO
            with pdfplumber.open(pdf_bytes) as pdf_ocr:
                for ocr_page in pdf_ocr.pages:
                    img = ocr_page.to_image(resolution=150)
                    # Convert to PIL then to bytes for easyocr
                    img_buf = io.BytesIO()
                    img.original.save(img_buf, format='PNG')
                    img_buf.seek(0)
                    ocr_text = extract_text_from_image(img_buf)
                    text = text + (str(ocr_text) if ocr_text else "") + "\n"

        safe_print(f"[DEBUG] Extraction complete. Text length: {len(text)}")
    except Exception as e:
        safe_print(f"[DEBUG] Extraction error: {str(e)}")
        raise Exception(f"PDF Extraction Error: {str(e)}")
    return text

def parse_cv(text):
    safe_print("[DEBUG] Starting parse_cv...")
    
    # Cap text length — CVs are short; this avoids slow NLP on huge OCR dumps
    text = text[:8000]
    
    # Use make_doc (tokenization only) — PhraseMatcher doesn't need POS/NER/DEP
    # This is ~10x faster than nlp(text) which runs the full pipeline
    doc = nlp.make_doc(text)
    
    # Skill Extraction — use pre-built module-level matcher (fast)
    matches = _MATCHER(doc)
    
    spans = [Span(doc, start, end, label="SKILL") for _, start, end in matches]
    filtered_spans = filter_spans(spans)
    
    skills = set()
    for span in filtered_spans:
        skills.add(span.text.lower())
    
    found_skills = list(skills)
    safe_print(f"[DEBUG] Found skills: {found_skills}")
    
    safe_print("[DEBUG] Parse complete.")

    return {
        "skills": found_skills,
    }


RESUME_SECTION_HEADINGS = [
    "summary",
    "profile",
    "objective",
    "experience",
    "work experience",
    "professional experience",
    "projects",
    "project experience",
    "achievements",
    "accomplishments",
    "education",
    "skills",
    "certifications",
    "courses",
    "internships",
    "training",
    "awards",
]

ACTION_VERBS = [
    "built",
    "developed",
    "designed",
    "led",
    "managed",
    "implemented",
    "improved",
    "optimized",
    "created",
    "analyzed",
    "collaborated",
    "deployed",
    "delivered",
    "reduced",
    "increased",
    "streamlined",
    "launched",
    "automated",
    "organized",
]

INDUSTRY_TERMS = [
    "stakeholder",
    "business",
    "strategy",
    "analytics",
    "operations",
    "project management",
    "market research",
    "product management",
    "customer",
    "compliance",
    "quality assurance",
    "research",
    "reporting",
    "presentations",
    "team collaboration",
    "problem solving",
    "communication",
    "leadership",
    "cross-functional",
    "kpi",
    "okr",
    "roi",
]


def _safe_lower(text):
    return (text or "").strip().lower()


def _count_term_hits(text, terms):
    lowered = _safe_lower(text)
    hits = set()
    for term in terms:
        pattern = r"\b" + re.escape(term.lower()) + r"\b"
        if re.search(pattern, lowered):
            hits.add(term.lower())
    return sorted(hits)


def _extract_contact_signals(text):
    lowered = _safe_lower(text)
    signals = []
    if re.search(r"\b\d{10}\b", lowered) or re.search(r"\+?\d[\d\s\-]{8,}\d", lowered):
        signals.append("phone number")
    if "@" in lowered:
        signals.append("email address")
    if "linkedin" in lowered:
        signals.append("linkedin profile")
    if "github" in lowered:
        signals.append("github profile")
    return signals


def _split_bullets(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    bullet_lines = [line for line in lines if line.startswith(("-", "•", "*", "→"))]
    return lines, bullet_lines


def _sentence_quality_score(doc):
    sentences = [sent.text.strip() for sent in getattr(doc, "sents", []) if sent.text.strip()]
    if not sentences:
        return 45, ["Add complete sentences in a clear sectioned format."]

    penalties = 0
    suggestions = []
    lowercase_starts = 0
    long_sentences = 0
    punctuation_gaps = 0

    for sentence in sentences:
        first_alpha = next((char for char in sentence if char.isalpha()), "")
        if first_alpha and first_alpha.islower():
            lowercase_starts += 1
        word_count = len(sentence.split())
        if word_count > 28:
            long_sentences += 1
        if not sentence.endswith((".", "!", "?", ":", ";")) and word_count > 5:
            punctuation_gaps += 1

    if lowercase_starts:
        penalties += min(15, lowercase_starts * 4)
        suggestions.append("Start sentences with capital letters.")
    if long_sentences:
        penalties += min(12, long_sentences * 3)
        suggestions.append("Break very long sentences into shorter, clearer points.")
    if punctuation_gaps:
        penalties += min(10, punctuation_gaps * 2)
        suggestions.append("Add punctuation to improve readability.")

    score = max(35, 100 - penalties)
    return score, suggestions


def analyze_resume_text(text, extracted_skills=None):
    safe_print("[DEBUG] Starting analyze_resume_text...")

    text = (text or "")[:9000]
    extracted_skills = [str(skill).strip().lower() for skill in (extracted_skills or []) if str(skill).strip()]

    doc = nlp(text) if text.strip() else nlp.make_doc("")
    cleaned_text = _safe_lower(text)
    lines, bullet_lines = _split_bullets(text)

    skill_hits = sorted(set(extracted_skills))
    technical_terms = _count_term_hits(cleaned_text, SKILLS_LIST)
    industry_terms = _count_term_hits(cleaned_text, INDUSTRY_TERMS)

    section_hits = [heading for heading in RESUME_SECTION_HEADINGS if re.search(rf"\b{re.escape(heading)}\b", cleaned_text)]
    contact_signals = _extract_contact_signals(text)

    years_experience = len(re.findall(r"\b\d+\+?\s*(?:years?|yrs?)\b", cleaned_text))
    internship_mentions = len(re.findall(r"\bintern(?:ship|s|ed)?\b", cleaned_text))
    work_mentions = len(re.findall(r"\bexperience\b|\bworked\b|\bemployed\b|\bfreelance\b", cleaned_text))

    action_verbs_found = [verb for verb in ACTION_VERBS if re.search(rf"\b{re.escape(verb)}\b", cleaned_text)]
    metric_mentions = len(re.findall(r"\b\d+(?:\.\d+)?%\b|\b\d+(?:\.\d+)?\b|₹|\$|\bmln\b|\bmillion\b", cleaned_text))
    achievement_lines = [
        line for line in lines
        if re.search(r"\b\d+(?:\.\d+)?%\b|\b\d+(?:\.\d+)?\b|₹|\$", line) and any(verb in _safe_lower(line) for verb in ACTION_VERBS)
    ]

    grammar_score, grammar_suggestions = _sentence_quality_score(doc)

    structure_score = 40
    if section_hits:
        structure_score += min(30, len(section_hits) * 5)
    if bullet_lines:
        structure_score += min(10, len(bullet_lines) * 2)
    if contact_signals:
        structure_score += min(10, len(contact_signals) * 3)
    structure_score = min(100, structure_score)

    skills_score = min(25, len(skill_hits) * 3)
    technical_score = min(20, (len(technical_terms) + len(industry_terms)) * 2)

    experience_score = 18
    experience_score += min(8, years_experience * 4)
    experience_score += min(6, internship_mentions * 2)
    experience_score += min(6, work_mentions)
    if section_hits and any(hit in section_hits for hit in ["experience", "work experience", "professional experience", "projects", "internships"]):
        experience_score += 4
    experience_score = min(20, experience_score)

    achievement_score = 5
    achievement_score += min(8, len(achievement_lines) * 4)
    achievement_score += min(4, metric_mentions)
    if action_verbs_found:
        achievement_score += 2
    achievement_score = min(15, achievement_score)

    overall_score = int(round(skills_score + technical_score + experience_score + achievement_score + ((grammar_score / 100) * 10) + ((structure_score / 100) * 10)))
    overall_score = max(0, min(100, overall_score))

    summary_points = []
    if skill_hits:
        summary_points.append(f"Detected {len(skill_hits)} relevant skills or keywords.")
    if technical_terms or industry_terms:
        summary_points.append(f"Found {len(technical_terms) + len(industry_terms)} technical and industry terms.")
    if achievement_lines:
        summary_points.append(f"Found {len(achievement_lines)} achievement-focused bullet points with measurable impact.")
    if section_hits:
        summary_points.append(f"Resume contains {len(section_hits)} clear section headers.")

    strengths = []
    if skill_hits:
        strengths.append(f"Relevant skills detected: {', '.join(skill_hits[:8])}")
    if technical_terms or industry_terms:
        strengths.append("Uses role-relevant technical or industry keywords.")
    if achievement_lines:
        strengths.append("Highlights measurable achievements in bullet points.")
    if section_hits:
        strengths.append("Has clear resume sections and structure.")
    if contact_signals:
        strengths.append(f"Contains contact details such as {', '.join(contact_signals[:3])}.")

    mistakes = []
    if grammar_score < 75:
        mistakes.append("Some sentences may be too long, incomplete, or not well punctuated.")
    if len(skill_hits) < 5:
        mistakes.append("Not enough skills or keywords are highlighted in the CV.")
    if not achievement_lines:
        mistakes.append("Achievements are not clearly written with measurable impact.")
    if len(section_hits) < 4:
        mistakes.append("The CV needs clearer section headings like Summary, Experience, Projects, and Skills.")
    if not any(term in cleaned_text for term in ["intern", "project", "experience", "worked"]):
        mistakes.append("Work experience or project depth is not obvious enough.")

    improvement_suggestions = []
    if len(skill_hits) < 5:
        improvement_suggestions.append("Add more relevant technical and role-specific skills naturally inside project or experience bullets.")
    if not achievement_lines:
        improvement_suggestions.append("Rewrite responsibilities as outcomes using numbers, percentages, or impact statements.")
    if grammar_score < 75:
        improvement_suggestions.append("Fix grammar, capitalize sentence starts, and keep each bullet concise.")
    if len(section_hits) < 4:
        improvement_suggestions.append("Use clear sections such as Summary, Education, Experience, Projects, Skills, and Certifications.")
    if not contact_signals:
        improvement_suggestions.append("Include complete contact details like email, phone number, LinkedIn, and GitHub where relevant.")
    if not technical_terms and not industry_terms:
        improvement_suggestions.append("Add domain keywords for your target role so ATS systems can match your CV better.")

    what_to_include = [
        "A short professional summary",
        "Skills matched to the target job",
        "Projects, internships, or work experience with outcomes",
        "Numbers, percentages, or results wherever possible",
        "Relevant certifications, awards, or achievements",
    ]

    score_breakdown = {
        "skills": skills_score,
        "technical_terms": technical_score,
        "experience": experience_score,
        "achievements": achievement_score,
        "grammar": int(round((grammar_score / 100) * 10)),
        "structure": int(round((structure_score / 100) * 10)),
    }

    if overall_score >= 80:
        score_label = "Excellent"
    elif overall_score >= 60:
        score_label = "Good"
    elif overall_score >= 40:
        score_label = "Fair"
    else:
        score_label = "Needs Work"

    if overall_score >= 80:
        suggested_careers = ["Software Developer", "Data Analyst", "Product Analyst"]
    elif overall_score >= 60:
        suggested_careers = ["Associate Analyst", "Junior Developer", "Operations Executive"]
    elif overall_score >= 40:
        suggested_careers = ["Internship roles", "Entry-level support roles", "Trainee programs"]
    else:
        suggested_careers = ["Build a stronger CV first", "Add projects and internships", "Work on resume structure"]

    detailed_overview = " ".join(summary_points) if summary_points else "The CV contains limited detail. Add stronger sections, achievements, and target-role keywords."

    safe_print(f"[DEBUG] CV score calculated: {overall_score}")
    return {
        "resumeScore": overall_score,
        "scoreLabel": score_label,
        "scoreBreakdown": score_breakdown,
        "analysisSummary": detailed_overview,
        "strengths": strengths,
        "mistakes": mistakes,
        "improvementSuggestions": improvement_suggestions,
        "whatToInclude": what_to_include,
        "suggestedCareers": suggested_careers,
        "extractedSkills": skill_hits,
        "technicalTerms": technical_terms,
        "industryTerms": industry_terms,
        "sectionHighlights": section_hits,
        "contactSignals": contact_signals,
        "achievementLines": achievement_lines,
    }
