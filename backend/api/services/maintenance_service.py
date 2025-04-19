import os

class MaintenanceService:
    @staticmethod
    def get_maintenance_logs_queryset(user, query_params=None):
        from ..models import MaintenanceLog
        queryset = MaintenanceLog.objects.filter(user=user)
        
        # Add filtering by UAV if specified
        uav_id = query_params.get('uav') if query_params else None
        if uav_id:
            queryset = queryset.filter(uav_id=uav_id)
            
        return queryset

    @staticmethod
    def get_maintenance_reminders_queryset(user):
        from ..models import MaintenanceReminder
        return MaintenanceReminder.objects.filter(uav__user=user)

    @staticmethod
    def handle_file_update(instance, old_instance):
        # If there was an old file and it's changed, delete the old one
        if old_instance and old_instance.file and instance.file != old_instance.file:
            MaintenanceService.handle_file_deletion(old_instance.file.path)

    @staticmethod
    def handle_file_deletion(file_path):
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except (FileNotFoundError, PermissionError) as e:
                # Log the error but don't raise an exception
                print(f"Error deleting file {file_path}: {e}")
