from django.db.models import Q
from ..models import User, UAV

class AdminService:
    @staticmethod
    def get_user_queryset(admin_user, query_params=None):
        from ..models import User
        # Only staff users can access user queryset
        if not admin_user.is_staff:
            return User.objects.none()
        
        queryset = User.objects.all()
        
        if query_params:
            # Filter by text fields (case-insensitive)
            text_filters = ['email', 'first_name', 'last_name', 'phone', 'street', 'zip', 'city', 'country']
            for field in text_filters:
                if field in query_params and query_params[field]:
                    queryset = queryset.filter(**{f"{field}__icontains": query_params[field]})
            
            # Filter by boolean fields
            bool_filters = ['is_staff', 'is_active']
            for field in bool_filters:
                if field in query_params and query_params[field]:
                    value = query_params[field].lower() == 'true'
                    queryset = queryset.filter(**{field: value})
        
        return queryset
    
    @staticmethod
    def get_user_uavs(admin_user, user_id, query_params=None):
        from ..models import UAV
        # Only staff users can access UAV queryset
        if not admin_user.is_staff:
            return UAV.objects.none()
        
        if user_id:
            return UAV.objects.filter(user_id=user_id)
        
        return UAV.objects.all()
