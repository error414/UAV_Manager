from django.db import models
from django.contrib.auth.models import AbstractUser

# Beispiel: Benutzer-Modell (optional erweiterbar)
class User(AbstractUser):
    # Zusätzliche Felder, falls nötig
    pass

# Beispiel: Modell für Fluggeräte (Aircraft)
class Aircraft(models.Model):
    model = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, unique=True)
    manufacturer = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.manufacturer} {self.model}"

# Beispiel: Modell für Flugstunden (FlightLog)
class FlightLog(models.Model):
    pilot = models.ForeignKey(User, on_delete=models.CASCADE)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE)
    date = models.DateField()
    flight_time = models.DecimalField(max_digits=5, decimal_places=2)
    departure = models.CharField(max_length=100)
    landing = models.CharField(max_length=100)

    def __str__(self):
        return f"Flight on {self.date} by {self.pilot.username}"

# Beispiel: Modell für Wartungsprotokolle (MaintenanceLog)
class MaintenanceLog(models.Model):
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE)
    maintenance_date = models.DateField()
    description = models.TextField()

    def __str__(self):
        return f"Maintenance on {self.maintenance_date} for {self.aircraft}"
