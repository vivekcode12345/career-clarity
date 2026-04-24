from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SavedRoadmap',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('career_title', models.CharField(max_length=150)),
                ('ability', models.CharField(blank=True, default='', max_length=30)),
                ('interest', models.CharField(blank=True, default='', max_length=80)),
                ('skills', models.JSONField(blank=True, default=list)),
                ('roadmap_data', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saved_roadmaps', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-updated_at'],
                'unique_together': {('user', 'career_title')},
                'indexes': [models.Index(fields=['user', 'career_title'], name='prediction__user_id_7c0f1c_idx')],
            },
        ),
    ]
