from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.conf import settings


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        from django.contrib.sites.models import Site
        def set_default_site(sender, **kwargs):
            domain = settings.FRONTEND_URL.split('://', 1)[-1]
            site, _ = Site.objects.get_or_create(pk=settings.SITE_ID)
            site.domain = domain
            site.name = domain
            site.save()

        post_migrate.connect(set_default_site, sender=self)
