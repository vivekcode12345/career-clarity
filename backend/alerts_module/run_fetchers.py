import logging


logger = logging.getLogger(__name__)


def _safe_fetch(fetcher_name, module_path, function_name, limit=50):
    try:
        module = __import__(module_path, fromlist=[function_name])
        fetcher = getattr(module, function_name)
        return fetcher(limit=limit)
    except Exception as exc:
        logger.warning("Fetcher '%s' failed: %s", fetcher_name, exc)
        return 0


def run_all_fetchers():
    return {
        "internshala": _safe_fetch("internshala", "alerts_module.fetchers.internshala", "fetch_internshala", limit=50),
        "scholarships": _safe_fetch("scholarships", "alerts_module.fetchers.scholarships", "fetch_scholarships", limit=50),
        "jobs": _safe_fetch("jobs", "alerts_module.fetchers.jobs", "fetch_jobs", limit=50),
        "exams": _safe_fetch("exams", "alerts_module.fetchers.exams", "fetch_exams", limit=50),
    }

