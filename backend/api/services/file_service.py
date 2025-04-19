class FileService:
    @staticmethod
    def get_files_queryset(user, query_params=None):
        from ..models import File
        # Return all files for this user
        return File.objects.filter(uav__user=user)
