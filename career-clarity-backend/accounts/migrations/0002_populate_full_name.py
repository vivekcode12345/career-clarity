# Generated migration to populate full_name for existing users

from django.db import migrations


def populate_full_name(apps, schema_editor):
    """Populate full_name from username for existing profiles"""
    Profile = apps.get_model('accounts', 'Profile')
    for profile in Profile.objects.filter(full_name=''):
        profile.full_name = profile.user.username
        profile.save()


def reverse_populate_full_name(apps, schema_editor):
    """Reverse: clear full_name"""
    Profile = apps.get_model('accounts', 'Profile')
    Profile.objects.filter(full_name='').update(full_name='')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(populate_full_name, reverse_populate_full_name),
    ]
