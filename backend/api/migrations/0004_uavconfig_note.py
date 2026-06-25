from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_flightlog_blackbox_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='uavconfig',
            name='note',
            field=models.TextField(blank=True, default=''),
        ),
    ]
