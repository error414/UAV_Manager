from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.exceptions import PermissionDenied
from ..models import User, UAV

class AdminService:
    @staticmethod
    def ensure_staff_user(user):
        """Ensure the user has staff permissions"""
        if not user.is_staff:
            raise PermissionDenied("You do not have permission to perform this action.")
            
    @staticmethod
    def check_object_owner(user, obj):
        """Check if user is the owner of the object"""
        if not hasattr(obj, 'user'):
            raise AttributeError("Object has no user attribute")
            
        if obj.user != user and not user.is_staff:
            raise PermissionDenied("You do not have permission to access this object.")
    
    @staticmethod
    def get_object_if_owner(user, model_class, object_id, lookup_field='pk'):
        """Get object if user is owner or staff, raise 404 if not found or no permission"""
        try:
            if lookup_field == 'pk':
                obj = model_class.objects.get(pk=object_id)
            else:
                obj = model_class.objects.get(**{lookup_field: object_id})
            
            # For FlightLog, check user field directly
            if hasattr(obj, 'user'):
                if obj.user != user and not user.is_staff:
                    raise model_class.DoesNotExist()
            # For other models that might have user through relationships
            elif hasattr(obj, 'uav') and hasattr(obj.uav, 'user'):
                if obj.uav.user != user and not user.is_staff:
                    raise model_class.DoesNotExist()
            
            return obj
        except ObjectDoesNotExist:
            raise model_class.DoesNotExist()

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
