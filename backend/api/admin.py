from django.contrib import admin
from .models import User, UserSettings, UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'first_name', 'last_name', 'email')

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ('settings_id', 'user', 'preferred_units', 'theme')

@admin.register(UAV)
class UAVAdmin(admin.ModelAdmin):
    list_display = ('uav_id', 'drone_name', 'manufacturer', 'serial_number')

@admin.register(FlightLog)
class FlightLogAdmin(admin.ModelAdmin):
    list_display = ('flightlog_id', 'user', 'uav', 'departure_place', 'landing_place')

@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ('maintenance_id', 'event_type', 'event_date', 'uav')

@admin.register(MaintenanceReminder)
class MaintenanceReminderAdmin(admin.ModelAdmin):
    list_display = ('reminder_id', 'component', 'next_maintenance', 'reminder_active')

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('file_id', 'uav', 'file_type', 'file_path')
