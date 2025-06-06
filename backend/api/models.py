from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
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
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

# User settings
class UserSettings(models.Model):
    settings_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='settings')
    preferred_units = models.CharField(max_length=50, blank=True, null=True)
    theme = models.CharField(max_length=50, blank=True, null=True)
    notifications_enabled = models.BooleanField(default=True)
    a1_a3_reminder = models.BooleanField(default=False)
    a2_reminder = models.BooleanField(default=False)
    sts_reminder = models.BooleanField(default=False)
    reminder_months_before = models.IntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.user}"


# UAVs
class UAV(models.Model):
    uav_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uavs')
    drone_name = models.CharField(max_length=255)
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
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
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    custom_attributes = models.JSONField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'drone_name'], name='unique_user_drone_name')
        ]

    def __str__(self):
        return f"{self.drone_name} ({self.serial_number})"


# UAV configuration file upload path
def uav_config_path(instance, filename):
    # Store files under uav_configs/user<user_id>/
    user_id = instance.user.user_id
    return f'uav_configs/user{user_id}/{filename}'

class UAVConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='configurations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uav_configurations')
    name = models.CharField(max_length=255)
    upload_date = models.DateField()
    file = models.FileField(upload_to=uav_config_path)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Handle file replacement on update
        if self.pk:
            from .services.file_service import FileService
            old_instance = UAVConfig.objects.filter(pk=self.pk).first()
            FileService.handle_config_file_update(self, old_instance)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Delete file from storage
        from .services.file_service import FileService
        if self.file:
            FileService.handle_file_deletion(self.file.path)
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return f"Configuration '{self.name}' for UAV {self.uav}"

# Ensure file deletion on bulk delete
@receiver(post_delete, sender=UAVConfig)
def delete_file_on_config_delete(sender, instance, **kwargs):
    from .services.file_service import FileService
    if instance.file:
        FileService.handle_file_deletion(instance.file.path)


# Flight logs
class FlightLog(models.Model):
    # Choices for dropdown fields
    LIGHT_CONDITIONS = [
        ('Day', 'Day'),
        ('Night', 'Night'),
    ]
    
    OPS_CONDITIONS = [
        ('VLOS', 'VLOS'),
        ('BLOS', 'BLOS'),
    ]
    
    PILOT_TYPE = [
        ('PIC', 'PIC'),
        ('Dual', 'Dual'),
        ('Instruction', 'Instruction'),
    ]
    
    flightlog_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='flightlogs')
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='flightlogs')
    departure_place = models.CharField(max_length=255, db_index=True)
    departure_date = models.DateField(db_index=True)
    departure_time = models.TimeField(db_index=True)
    landing_place = models.CharField(max_length=255, db_index=True)
    landing_time = models.TimeField()
    flight_duration = models.IntegerField(db_index=True)  
    takeoffs = models.IntegerField() 
    landings = models.IntegerField()
    light_conditions = models.CharField(max_length=255, choices=LIGHT_CONDITIONS, db_index=True)
    ops_conditions = models.CharField(max_length=255, choices=OPS_CONDITIONS, db_index=True)
    pilot_type = models.CharField(max_length=255, choices=PILOT_TYPE, db_index=True)
    comments = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'departure_date']),
            models.Index(fields=['uav', 'departure_date']),
        ]
    
    def __str__(self):
        return f"FlightLog {self.flightlog_id} for UAV {self.uav}"


class FlightGPSLog(models.Model):
    flight_log = models.ForeignKey('FlightLog', on_delete=models.CASCADE, related_name='gps_logs')
    timestamp = models.BigIntegerField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(null=True, blank=True)
    num_sat = models.IntegerField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True) 
    ground_course = models.FloatField(null=True, blank=True)
    vertical_speed = models.FloatField(null=True, blank=True) 
    pitch = models.FloatField(null=True, blank=True)
    roll = models.FloatField(null=True, blank=True)
    yaw = models.FloatField(null=True, blank=True)
    receiver_battery = models.FloatField(null=True, blank=True)
    current = models.FloatField(null=True, blank=True)  
    capacity = models.FloatField(null=True, blank=True) 
    receiver_quality = models.IntegerField(null=True, blank=True)  
    transmitter_quality = models.IntegerField(null=True, blank=True)  
    transmitter_power = models.IntegerField(null=True, blank=True) 
    aileron = models.FloatField(null=True, blank=True) 
    elevator = models.FloatField(null=True, blank=True)  
    throttle = models.FloatField(null=True, blank=True)  
    rudder = models.FloatField(null=True, blank=True)  

    class Meta:
        ordering = ['timestamp']


# Maintenance log file upload path
def maintenance_log_path(instance, filename):
    # Store files under maint_logs/user<user_id>/
    user_id = instance.user.user_id
    return f'maint_logs/user{user_id}/{filename}'

class MaintenanceLog(models.Model):
    maintenance_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='maintenance_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='maintenance_logs')
    event_type = models.CharField(max_length=100)
    description = models.TextField()
    event_date = models.DateField()
    file = models.FileField(upload_to=maintenance_log_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Handle file replacement on update
        if self.pk:
            from .services.maintenance_service import MaintenanceService
            old_instance = MaintenanceLog.objects.filter(pk=self.pk).first()
            MaintenanceService.handle_file_update(self, old_instance)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Delete file from storage
        from .services.maintenance_service import MaintenanceService
        if self.file:
            MaintenanceService.handle_file_deletion(self.file.path)
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return f"Maintenance {self.event_type} on {self.event_date} for UAV {self.uav}"

# Ensure file deletion on bulk delete
@receiver(post_delete, sender=MaintenanceLog)
def delete_file_on_log_delete(sender, instance, **kwargs):
    from .services.maintenance_service import MaintenanceService
    if instance.file:
        MaintenanceService.handle_file_deletion(instance.file.path)


# Component choices for maintenance reminders
COMPONENT_CHOICES = [
    ('MOTOR', 'Motor'),
    ('PROPELLER', 'Propeller'),
    ('FRAME', 'Frame'),
]

# Maintenance reminders
class MaintenanceReminder(models.Model):
    reminder_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='reminders')
    component = models.CharField(max_length=50, choices=COMPONENT_CHOICES)
    last_maintenance = models.DateField()
    next_maintenance = models.DateField()
    reminder_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Prevent duplicate (uav, component) pairs
        constraints = [
            models.UniqueConstraint(
                fields=['uav', 'component'],
                name='unique_uav_component_reminder'
            )
        ]
    
    def __str__(self):
        return f"Reminder for {self.component} on UAV {self.uav}"


# Files
class File(models.Model):
    file_id = models.AutoField(primary_key=True)
    uav = models.ForeignKey(UAV, on_delete=models.CASCADE, related_name='files')
    file_path = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"File {self.file_id} for UAV {self.uav}"
