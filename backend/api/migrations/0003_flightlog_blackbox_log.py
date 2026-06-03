from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_uav_unique_user_drone_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='flightlog',
            name='blackbox_log',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
