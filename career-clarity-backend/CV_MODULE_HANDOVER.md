# CV Module — Handover Document

**Module:** `cv_module` (Django App)  
**Owner:** Member 2  
**Date:** March 2026

---

## What This Module Does

Accepts a user's CV (PDF or image), extracts all text, runs NLP to identify skills, and stores them per user. Exposes two REST API endpoints for the frontend and prediction engine.

---

## Files to Integrate

Copy the entire `cv_module/` folder into the main Django project:

```
cv_module/
├── apps.py
├── models.py        ← CVProfile database model
├── views.py         ← API logic
├── urls.py          ← endpoint routing
├── utils.py         ← PDF/image text extraction + NLP skill parsing
└── migrations/      ← run these to create the DB table
```

---

## Step-by-Step Integration

### 1. Add to `INSTALLED_APPS` in `settings.py`
```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'cv_module',   # ← add this
]
```

### 2. Add to root `urls.py`
```python
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('', include('cv_module.urls')),   # ← add this
]
```

### 3. Add to `settings.py` (JWT + CORS)
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",   # adjust to your frontend origin
]
```

### 4. Install dependencies
```bash
pip install djangorestframework djangorestframework-simplejwt django-cors-headers pdfplumber easyocr opencv-python-headless spacy
python -m spacy download en_core_web_sm
```

### 5. Run migrations
```bash
python manage.py makemigrations cv_module
python manage.py migrate
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` except the token endpoint.

| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| `POST` | `/api/token/` | ❌ | Get JWT tokens |
| `POST` | `/api/token/refresh/` | ❌ | Refresh access token |
| `POST` | `/upload-cv/` | ✅ | Upload CV → returns skills |
| `GET`  | `/cv-data/` | ✅ | Get stored skills for user |

### `POST /upload-cv/`
```
Body: multipart/form-data
  cv: <file>   (PDF, JPG, PNG — max 10 MB)

Response 200:
  { "success": true, "skills": ["python", "django", "react"] }
```

### `GET /cv-data/`
```
Response 200:
  { "skills": ["python", "django", "react"] }

Response 404:
  { "error": "CV not uploaded" }
```

---

## Database Model

**`CVProfile`** — one record per user (auto upserted on upload)

| Field | Type | Notes |
|-------|------|-------|
| `user` | OneToOneField | Links to Django `User` |
| `skills` | JSONField | List of skill strings (lowercase) |
| `full_text` | TextField | Raw extracted CV text |
| `uploaded_at` | DateTimeField | Auto-updated |

### For the Prediction Engine
```python
from cv_module.models import CVProfile

profile = CVProfile.objects.get(user=user)
skills = profile.skills  # e.g. ["python", "machine learning", "sql"]
```

---

## Supported File Types & Limits

| Type | Processing Method |
|------|-------------------|
| `.pdf` (text-based) | pdfplumber |
| `.pdf` (scanned) | auto-fallback to EasyOCR |
| `.jpg`, `.jpeg`, `.png` | EasyOCR |
| Max file size | 10 MB |

---

## Notes

- spaCy model (`en_core_web_sm`) must be downloaded once per environment.
- The `PhraseMatcher` is pre-built at server startup — no per-request overhead.
- Skills list covers 400+ terms across CS, ECE, Mechanical, Civil, Medical, Finance, and more.
