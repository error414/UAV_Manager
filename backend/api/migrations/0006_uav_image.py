from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_uavconfig_script'),
    ]

    operations = [
        migrations.AddField(
            model_name='uav',
            name='image',
            field=models.TextField(blank=True, null=True),
        ),
    ]
