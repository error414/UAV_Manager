from django.db.models import Q
from ..models import User, UAV

class AdminService:
    @staticmethod
    def get_user_queryset(admin_user, query_params=None):
        from ..models import User
        # Ensure the requesting user is staff
        if not admin_user.is_staff:
            return User.objects.none()
            
        return User.objects.all()
    
    @staticmethod
    def get_user_uavs(admin_user, user_id, query_params=None):
        from ..models import UAV
        # Ensure the requesting user is staff
        if not admin_user.is_staff:
            return UAV.objects.none()
        
        # If user_id is provided, filter UAVs for that user
        if user_id:
            return UAV.objects.filter(user_id=user_id)
        
        # Otherwise return all UAVs
        return UAV.objects.all()
