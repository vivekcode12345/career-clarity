import csv
import re
from django.core.management.base import BaseCommand, CommandError
from prediction_module.models import College


class Command(BaseCommand):
    help = "Import colleges from a CSV file into the database"

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="Path to the colleges CSV file")
        parser.add_argument("--clear", action="store_true", help="Delete existing college rows before importing")

    def handle(self, *args, **options):
        csv_path = options["csv_path"]
        clear_existing = options["clear"]

        def parse_row(row):
            """Parse loosely formatted CSV rows where courses/descriptions may contain commas without quotes."""
            if len(row) < 6:
                return None

            name = row[0].strip()
            location = row[1].strip()

            # Find fee start: first numeric token after location.
            fee_index = None
            for idx in range(2, len(row)):
                token = row[idx].strip().replace(",", "")
                if re.fullmatch(r"\d+(?:\.\d+)?", token):
                    fee_index = idx
                    break

            if fee_index is None or fee_index + 2 >= len(row):
                return None

            courses = [item.strip() for item in row[2:fee_index] if item.strip()]
            fees_raw = row[fee_index].strip().replace(",", "")
            rating_raw = row[fee_index + 1].strip() if fee_index + 1 < len(row) else ""
            raw_type = row[fee_index + 2].strip().lower() if fee_index + 2 < len(row) else "ug"

            type_map = {
                "school": "junior",
                "coaching": "junior",
                "intermediate": "junior",
                "junior": "junior",
                "ug": "ug",
                "undergraduate": "ug",
                "pg": "pg",
                "postgraduate": "pg",
            }
            college_type = type_map.get(raw_type, raw_type if raw_type in {"junior", "ug", "pg"} else "ug")

            apply_link = ""
            for idx in range(fee_index + 3, len(row)):
                token = row[idx].strip()
                if token.startswith("http://") or token.startswith("https://"):
                    apply_link = token
                    break

            if not apply_link:
                return None

            return {
                "name": name,
                "location": location,
                "courses": courses,
                "fees": int(float(fees_raw)),
                "rating": float(rating_raw) if rating_raw and rating_raw not in {"NA", "N/A", "null"} else None,
                "type": college_type,
                "apply_link": apply_link,
            }

        try:
            with open(csv_path, newline="", encoding="utf-8-sig") as csvfile:
                created = 0
                updated = 0

                if clear_existing:
                    College.objects.all().delete()

                reader = csv.reader(csvfile)
                header = next(reader, None)
                if not header:
                    raise CommandError("CSV file is empty")

                for row in reader:
                    parsed = parse_row(row)
                    if not parsed:
                        continue

                    normalized_courses = [item.strip() for item in parsed["courses"] if item.strip()]

                    obj, created_flag = College.objects.update_or_create(
                        name=parsed["name"],
                        location=parsed["location"],
                        type=parsed["type"],
                        apply_link=parsed["apply_link"],
                        defaults={
                            "courses": normalized_courses,
                            "fees": parsed["fees"],
                            "rating": parsed["rating"],
                        },
                    )
                    if created_flag:
                        created += 1
                    else:
                        updated += 1

                self.stdout.write(self.style.SUCCESS(f"Imported colleges. Created: {created}, Updated: {updated}"))
        except FileNotFoundError:
            raise CommandError(f"File not found: {csv_path}")
