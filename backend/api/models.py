from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    user_id = models.AutoField(primary_key=True)
    # Du kannst hier zusätzliche Felder hinzufügen, wenn nötig:
    phone = models.CharField(max_length=50, blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    zip = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    drone_ops_nb = models.CharField(max_length=100, blank=True, null=True)
    pilot_license_nb = models.CharField(max_length=100, blank=True, null=True)
    a1_a3 = models.DateField(blank=True, null=True)
    a2 = models.DateField(blank=True, null=True)
    sts = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

# Benutzereinstellungen (USERSETTINGS)
class UserSettings(models.Model):
    settings_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='settings')
    preferred_units = models.CharField(max_length=50, blank=True, null=True)
    theme = models.CharField(max_length=50, blank=True, null=True)
    notifications_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.user}"


# UAVs (UAVS)
class UAV(models.Model):
    uav_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uavs')
    drone_name = models.CharField(max_length=255)
    manufacturer = models.CharField(max_length=100)
    type = models.CharField(max_length=100)
    motors = models.IntegerField()
    motor_type = models.CharField(max_length=100, blank=True, null=True)
    video = models.CharField(max_length=255, blank=True, null=True)
    video_system = models.CharField(max_length=255, blank=True, null=True)
    esc = models.CharField(max_length=100, blank=True, null=True)
    esc_firmware = models.CharField(max_length=100, blank=True, null=True)
    receiver = models.CharField(max_length=100, blank=True, null=True)
    receiver_firmware = models.CharField(max_length=100, blank=True, null=True)
    flight_controller = models.CharField(max_length=100, blank=True, null=True)
    firmware = models.CharField(max_length=100, blank=True, null=True)
    firmware_version = models.CharField(max_length=100, blank=True, null=True)
    gps = models.CharField(max_length=100, blank=True, null=True)
    mag = models.CharField(max_length=100, blank=True, null=True)
    baro = models.CharField(max_length=100, blank=True, null=True)
    gyro = models.CharField(max_length=100, blank=True, null=True)
    acc = models.CharField(max_length=100, blank=True, null=True)
    registration_number = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=100, unique=True)
    custom_attributes = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.drone_name} ({self.serial_number})"


# Fluglogs (FLIGHTLOGS)
class FlightLog(models.Model):
    flightlog_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='flightlogs')
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='flightlogs')
    departure_place = models.CharField(max_length=255)
    departure_time = models.DateTimeField()
    landing_place = models.CharField(max_length=255)
    landing_time = models.DateTimeField()
    flight_duration = models.IntegerField()  # z.B. in Minuten
    landings = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"FlightLog {self.flightlog_id} for UAV {self.uav}"


# Wartungsprotokolle (MAINTENANCELOGS)
class MaintenanceLog(models.Model):
    maintenance_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='maintenance_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='maintenance_logs')
    event_type = models.CharField(max_length=100)
    description = models.TextField()
    event_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Maintenance {self.event_type} on {self.event_date} for UAV {self.uav}"


# Wartungserinnerungen (MAINTENANCE_REMINDERS)
class MaintenanceReminder(models.Model):
    reminder_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='maintenance_reminders')
    component = models.CharField(max_length=100)
    last_maintenance = models.DateTimeField()
    next_maintenance = models.DateTimeField()
    reminder_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Reminder for {self.component} on UAV {self.uav}"


# Dateien (FILES)
class File(models.Model):
    file_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='files')
    file_path = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"File {self.file_id} for UAV {self.uav}"
