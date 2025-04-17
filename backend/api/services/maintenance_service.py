import os
from ..models import MaintenanceLog, MaintenanceReminder

class MaintenanceService:
    @staticmethod
    def get_maintenance_logs_queryset(user, query_params=None):
        """Get maintenance logs for a user with optional filtering"""
        queryset = MaintenanceLog.objects.filter(user=user)
        
        if query_params and query_params.get('uav'):
            queryset = queryset.filter(uav_id=query_params['uav'])
            
        return queryset
    
    @staticmethod
    def get_maintenance_reminders_queryset(user):
        """Get maintenance reminders for UAVs belonging to a user"""
        return MaintenanceReminder.objects.filter(uav__user=user)
    
    @staticmethod
    def handle_file_update(instance, old_instance):
        """Handle file updates for maintenance logs"""
        if old_instance and old_instance.file and old_instance.file != instance.file:
            if os.path.isfile(old_instance.file.path):
                os.remove(old_instance.file.path)
    
    @staticmethod
    def handle_file_deletion(file_path):
        """Delete a file from the filesystem"""
        if file_path and os.path.isfile(file_path):
            os.remove(file_path)
