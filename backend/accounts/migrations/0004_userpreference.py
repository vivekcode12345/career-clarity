from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_tokenblacklist"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("internship", models.BooleanField(default=True)),
                ("job", models.BooleanField(default=True)),
                ("scholarship", models.BooleanField(default=True)),
                ("exam", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(on_delete=models.deletion.CASCADE, related_name="preferences", to="auth.user"),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="userpreference",
            index=models.Index(fields=["user"], name="accounts_use_user_id_9efde3_idx"),
        ),
    ]
