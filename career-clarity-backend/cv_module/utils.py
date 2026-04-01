import spacy
from spacy.matcher import PhraseMatcher
from spacy.util import filter_spans
from spacy.tokens import Span
import pdfplumber
import os
import io
import sys
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
