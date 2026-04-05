from alerts_module.fetchers.internshala import fetch_internshala
from alerts_module.fetchers.jobs import fetch_jobs
from alerts_module.fetchers.scholarships import fetch_scholarships
from alerts_module.fetchers.exams import fetch_exams


def run_all_fetchers():
    return {
        "internshala": fetch_internshala(limit=50),
        "scholarships": fetch_scholarships(limit=50),
        "jobs": fetch_jobs(limit=50),
        "exams": fetch_exams(limit=50),
    }

