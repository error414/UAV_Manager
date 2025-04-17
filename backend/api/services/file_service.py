from ..models import File, UAV
import os

class FileService:
    @staticmethod
    def get_files_queryset(user, query_params=None):
        """Get files queryset with optional filtering"""
        queryset = File.objects.filter(uav__user=user)
        
        if query_params:
            uav_id = query_params.get('uav_id')
            if uav_id:
                queryset = queryset.filter(uav_id=uav_id)
                
            file_type = query_params.get('file_type')
            if file_type:
                queryset = queryset.filter(file_type=file_type)
        
        return queryset
    
    @staticmethod
    def handle_file_upload(file_data, uav, description=''):
        """Handle file upload process"""
        # This method would contain logic for storing files, 
        # validating file types, etc.
        file_path = FileService._store_file(file_data)
        file_type = os.path.splitext(file_data.name)[1][1:]
        
        return File.objects.create(
            uav=uav,
            file_path=file_path,
            file_type=file_type,
            description=description
        )
    
    @staticmethod
    def _store_file(file_data):
        """Internal method to handle file storage"""
        # This would contain actual file storage logic
        # For now it's a placeholder
        return f"files/{file_data.name}"
    
    @staticmethod
    def handle_file_deletion(file_id):
        """Handle file deletion process"""
        try:
            file = File.objects.get(file_id=file_id)
            # Delete actual file from storage
            if os.path.exists(file.file_path):
                os.remove(file.file_path)
            # Delete database record
            file.delete()
            return True
        except File.DoesNotExist:
            return False
