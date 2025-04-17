from django.db.models import Q
from ..models import User, UAV
from .uav_service import UAVService

class AdminService:
    @staticmethod
    def get_user_queryset(request_user, query_params=None):
        """Get filtered user queryset for admin operations"""
        # Only staff users can access admin functions
        if not request_user.is_staff:
            return User.objects.none()
            
        queryset = User.objects.all()
        
        if not query_params:
            return queryset
            
        # Apply filters from query parameters
        params = query_params
        
        # Filter by email (partial match)
        if params.get('email'):
            queryset = queryset.filter(email__icontains=params['email'])
            
        # Filter by first name (partial match)
        if params.get('first_name'):
            queryset = queryset.filter(first_name__icontains=params['first_name'])
            
        # Filter by last name (partial match)
        if params.get('last_name'):
            queryset = queryset.filter(last_name__icontains=params['last_name'])
            
        # Filter by phone (partial match)
        if params.get('phone'):
            queryset = queryset.filter(phone__icontains=params['phone'])
            
        # Filter by street (partial match)
        if params.get('street'):
            queryset = queryset.filter(street__icontains=params['street'])
            
        # Filter by zip (partial match)
        if params.get('zip'):
            queryset = queryset.filter(zip__icontains=params['zip'])
            
        # Filter by country (partial match)
        if params.get('country'):
            queryset = queryset.filter(country__icontains=params['country'])
            
        # Filter by city (partial match)
        if params.get('city'):
            queryset = queryset.filter(city__icontains=params['city'])
            
        # Filter by staff status
        if params.get('is_staff'):
            is_staff = params['is_staff'].lower() == 'true'
            queryset = queryset.filter(is_staff=is_staff)
            
        # Filter by active status
        if params.get('is_active'):
            is_active = params['is_active'].lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
            
        return queryset
    
    @staticmethod
    def get_user_uavs(request_user, user_id, query_params=None):
        """Get UAVs for a specific user (admin function)"""
        # Only staff users can access admin functions
        if not request_user.is_staff:
            return UAV.objects.none()
            
        if not user_id:
            return UAV.objects.none()
            
        queryset = UAV.objects.filter(user_id=user_id)
        
        # Apply additional filters if provided
        if query_params and query_params.get('drone_name'):
            queryset = queryset.filter(drone_name__icontains=query_params['drone_name'])
        
        # Additional filters could be applied here
            
        return queryset
