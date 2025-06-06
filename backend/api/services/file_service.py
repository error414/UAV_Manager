import os
from django.conf import settings
from django.db.models import Q

class FileService:
    # Directory name for UAV configs
    UAV_CONFIGS_DIR = 'uav_configs'
    
    @staticmethod
    def get_files_queryset(user, query_params=None):
        from ..models import File
        
        if query_params is None:
            query_params = {}
            
        queryset = File.objects.filter(uav__user=user)
        
        # Optional filter by UAV
        uav_id = query_params.get('uav')
        if uav_id:
            queryset = queryset.filter(uav_id=uav_id)
            
        return queryset
    
    @staticmethod
    def get_config_files_queryset(user, query_params=None):
        from ..models import UAVConfig
        
        if query_params is None:
            query_params = {}
            
        queryset = UAVConfig.objects.filter(user=user)
        
        # Optional filter by UAV
        uav_id = query_params.get('uav')
        if uav_id:
            queryset = queryset.filter(uav_id=uav_id)
            
        # Optional filter by name
        name = query_params.get('name')
        if name:
            queryset = queryset.filter(name__icontains=name)
        
        return queryset
    
    @staticmethod
    def ensure_upload_directory_exists():
        # Ensure main upload directory exists
        upload_dir = os.path.join(settings.MEDIA_ROOT, FileService.UAV_CONFIGS_DIR)
        if not os.path.exists(upload_dir):
            try:
                os.makedirs(upload_dir, exist_ok=True)
            except OSError as e:
                print(f"Error creating upload directory {upload_dir}: {e}")
    
    @staticmethod
    def ensure_user_upload_directory_exists(user_id):
        # Ensure user-specific upload directory exists
        FileService.ensure_upload_directory_exists()
        
        user_upload_dir = os.path.join(settings.MEDIA_ROOT, FileService.UAV_CONFIGS_DIR, str(user_id))
        if not os.path.exists(user_upload_dir):
            try:
                os.makedirs(user_upload_dir, exist_ok=True)
                print(f"Created user directory: {user_upload_dir}")
            except OSError as e:
                print(f"Error creating user upload directory {user_upload_dir}: {e}")
    
    @staticmethod
    def handle_config_file_update(instance, old_instance):
        # Remove old file if replaced
        user_id = instance.user.user_id
        FileService.ensure_user_upload_directory_exists(user_id)
        
        if old_instance and old_instance.file and instance.file != old_instance.file:
            FileService.handle_file_deletion(old_instance.file.path)
    
    @staticmethod
    def handle_file_deletion(file_path):
        # Remove file from filesystem if it exists
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
                print(f"Deleted file: {file_path}")
            else:
                print(f"File not found for deletion: {file_path}")
        except (ValueError, OSError) as e:
            print(f"Error deleting file {file_path}: {str(e)}")
