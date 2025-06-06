import os
from django.conf import settings

class MaintenanceService:
    # Directory name for maintenance logs (relative to MEDIA_ROOT)
    MAINTENANCE_LOGS_DIR = 'maint_logs'
    
    @staticmethod
    def get_maintenance_logs_queryset(user, query_params=None):
        from ..models import MaintenanceLog
        queryset = MaintenanceLog.objects.filter(user=user)
        
        # Filter by UAV if provided
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
        user_id = instance.user.user_id
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        
        # Delete old file if replaced
        if old_instance and old_instance.file and instance.file != old_instance.file:
            MaintenanceService.handle_file_deletion(old_instance.file.path)

    @staticmethod
    def handle_file_deletion(file_path):
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except (FileNotFoundError, PermissionError) as e:
                # Log error, do not raise
                print(f"Error deleting file {file_path}: {e}")
    
    @staticmethod
    def ensure_upload_directory_exists():
        """Create base directory for maintenance logs if missing."""
        upload_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR)
        if not os.path.exists(upload_dir):
            try:
                os.makedirs(upload_dir, exist_ok=True)
            except OSError as e:
                print(f"Error creating upload directory {upload_dir}: {e}")
        # User directories are created separately

    @staticmethod
    def ensure_user_upload_directory_exists(user_id):
        """Create user-specific directory if missing."""
        MaintenanceService.ensure_upload_directory_exists()
        user_upload_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR, str(user_id))
        if not os.path.exists(user_upload_dir):
            try:
                os.makedirs(user_upload_dir, exist_ok=True)
                print(f"Created user directory: {user_upload_dir}")
            except OSError as e:
                print(f"Error creating user upload directory {user_upload_dir}: {e}")
    
    @staticmethod
    def get_maintenance_file_path(user_id, filename):
        """
        Return relative path for a maintenance log file.
        """
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        relative_path = f'{MaintenanceService.MAINTENANCE_LOGS_DIR}/{user_id}/{filename}'
        return relative_path.replace('\\', '/')
        
    @staticmethod
    def import_maintenance_file(user_id, file_obj, filename=None):
        """
        Save uploaded file to user directory.
        Returns relative path for DB storage.
        """
        if not filename:
            filename = file_obj.name
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        user_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR, str(user_id))
        abs_file_path = os.path.join(user_dir, filename)
        with open(abs_file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
        rel_path = f'{MaintenanceService.MAINTENANCE_LOGS_DIR}/{user_id}/{filename}'
        print(f"File saved to: {abs_file_path}")
        return rel_path.replace('\\', '/')
