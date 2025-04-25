import os
from django.conf import settings

class MaintenanceService:
    # Directory constant to ensure consistency across the application
    # Remove "uploads/" prefix since it's already in MEDIA_ROOT
    MAINTENANCE_LOGS_DIR = 'maint_logs'
    
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
        # Ensure the upload directory exists
        user_id = instance.user.user_id
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        
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
    
    @staticmethod
    def ensure_upload_directory_exists():
        """Ensure that the upload directory for maintenance logs exists"""
        # Create the main directory
        upload_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR)
        if not os.path.exists(upload_dir):
            try:
                os.makedirs(upload_dir, exist_ok=True)
            except OSError as e:
                print(f"Error creating upload directory {upload_dir}: {e}")
        
        # When called without a specific user ID, ensure the base directory exists
        # Individual user directories will be created by ensure_user_upload_directory_exists
    
    @staticmethod
    def ensure_user_upload_directory_exists(user_id):
        """Ensure that the user-specific upload directory exists"""
        # First make sure main directory exists
        MaintenanceService.ensure_upload_directory_exists()
        
        # Then create the user-specific directory - use absolute path
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
        Get the standardized path for a maintenance log file
        
        This should be used by any code that needs to store maintenance files
        to ensure consistency across the application.
        """
        # Ensure directory exists first
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        
        # Return path using the MAINTENANCE_LOGS_DIR constant
        relative_path = f'{MaintenanceService.MAINTENANCE_LOGS_DIR}/{user_id}/{filename}'
        
        # Make sure Django doesn't try to further resolve/modify this path
        return relative_path.replace('\\', '/')  # Use forward slashes for paths
        
    @staticmethod
    def import_maintenance_file(user_id, file_obj, filename=None):
        """
        Import a maintenance file and save it to the correct location
        
        Args:
            user_id: The user ID to associate the file with
            file_obj: The file object to save
            filename: Optional custom filename, uses original filename if not provided
            
        Returns:
            The relative path where the file was saved
        """
        # Use the original filename if none provided
        if not filename:
            filename = file_obj.name
            
        # Ensure user directory exists
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        
        # Create absolute directory path where file should be saved
        user_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR, str(user_id))
        
        # Create absolute file path
        abs_file_path = os.path.join(user_dir, filename)
        
        # Actually save the file to the user's directory
        with open(abs_file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
        
        # Return the relative path to store in the database using the MAINTENANCE_LOGS_DIR constant
        rel_path = f'{MaintenanceService.MAINTENANCE_LOGS_DIR}/{user_id}/{filename}'
        print(f"File saved to: {abs_file_path}")
        
        return rel_path.replace('\\', '/')  # Use forward slashes for paths
