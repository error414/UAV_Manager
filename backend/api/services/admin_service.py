from django.db.models import Q
from ..models import User, UAV

class AdminService:
    @staticmethod
    def get_user_queryset(admin_user, query_params=None):
        from ..models import User
        # Ensure the requesting user is staff
        if not admin_user.is_staff:
            return User.objects.none()
        
        # Start with all users
        queryset = User.objects.all()
        
        # Apply filters if query parameters exist
        if query_params:
            # Text-based filters (case-insensitive contains)
            text_filters = ['email', 'first_name', 'last_name', 'phone', 'street', 'zip', 'city', 'country']
            for field in text_filters:
                if field in query_params and query_params[field]:
                    queryset = queryset.filter(**{f"{field}__icontains": query_params[field]})
            
            # Boolean filters
            bool_filters = ['is_staff', 'is_active']
            for field in bool_filters:
                if field in query_params and query_params[field]:
                    # Convert string 'true'/'false' to boolean
                    value = query_params[field].lower() == 'true'
                    queryset = queryset.filter(**{field: value})
        
        return queryset
    
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
