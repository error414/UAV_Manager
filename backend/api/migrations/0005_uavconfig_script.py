from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_uavconfig_note'),
    ]

    operations = [
        migrations.AddField(
            model_name='uavconfig',
            name='script',
            field=models.TextField(blank=True, default=''),
        ),
    ]
