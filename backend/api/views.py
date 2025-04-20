# backend/api/views.py
from rest_framework import generics, permissions, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File, User, UserSettings, FlightGPSLog
)
from .serializers import (
    UAVSerializer, FlightLogSerializer, MaintenanceLogSerializer, FlightGPSLogSerializer,
    MaintenanceReminderSerializer, FileSerializer, UserSerializer, UserSettingsSerializer,
    FlightLogWithGPSSerializer
)

# Import the services
from .services.uav_service import UAVService, FlightLogService
from .services.maintenance_service import MaintenanceService
from .services.admin_service import AdminService
from .services.user_service import UserService
from .services.file_service import FileService
from .services.gps_service import GPSService

# Pagination for UAVs
class UAVPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Endpunkte für UAVs (USERS besitzt UAVs)
class UAVListCreateView(generics.ListCreateAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = UAVPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['drone_name', 'manufacturer', 'type', 'motors', 'registration_number', 'created_at']
    ordering = ['drone_name']  # Default sorting
    
    def get_queryset(self):
        return UAVService.get_uav_queryset(self.request.user, self.request.query_params)
    
    def perform_create(self, serializer):
        uav = serializer.save(user=self.request.user)
        UAVService.update_maintenance_reminders(uav, serializer.validated_data)
    
    # Modify the list method to correctly handle paginated responses
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Check if pagination is needed
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = serializer.data
            
            # Add flight statistics to each UAV using the service
            response_data = UAVService.enrich_uav_data(response_data)
            
            return self.get_paginated_response(response_data)
        
        # If no pagination, use the original implementation
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Add flight statistics to each UAV using the service
        response_data = UAVService.enrich_uav_data(response_data)
        
        return Response(response_data)

class UAVDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UAV.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        uav = serializer.save()
        UAVService.update_maintenance_reminders(uav, serializer.validated_data)
    
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        
        # Use the service to add flight statistics to the response data
        response.data = UAVService.enrich_uav_data(response.data)
        
        return response

# Paginierung für FlightLogs
class FlightLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Endpunkte für Fluglogs
class FlightLogListCreateView(generics.ListCreateAPIView):
    serializer_class = FlightLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FlightLogPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['departure_date', 'departure_time', 'landing_time', 'flight_duration']
    ordering = ['-departure_date', '-departure_time']  # Default sorting - newest first
    
    def get_queryset(self):
        return FlightLogService.get_flightlog_queryset(
            self.request.user, 
            self.request.query_params
        )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class FlightLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FlightLogWithGPSSerializer  # Updated to include GPS logs
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FlightLog.objects.filter(user=self.request.user)

# Add a new view for handling GPS data upload
class FlightGPSDataUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, flightlog_id):
        try:
            flight_log = FlightLog.objects.get(flightlog_id=flightlog_id, user=request.user)
        except FlightLog.DoesNotExist:
            return Response({"detail": "Flight log not found"}, status=status.HTTP_404_NOT_FOUND)
        
        gps_data = request.data.get('gps_data', [])
        points_saved = GPSService.save_gps_data(flight_log, gps_data)
        
        if points_saved > 0:
            return Response({"detail": f"Successfully uploaded {points_saved} GPS points"}, 
                           status=status.HTTP_201_CREATED)
        
        return Response({"detail": "No valid GPS data provided"}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, flightlog_id):
        try:
            flight_log = FlightLog.objects.get(flightlog_id=flightlog_id, user=request.user)
        except FlightLog.DoesNotExist:
            return Response({"detail": "Flight log not found"}, status=status.HTTP_404_NOT_FOUND)
        
        gps_logs = GPSService.get_gps_logs(flight_log)
        serializer = FlightGPSLogSerializer(gps_logs, many=True)
        
        return Response(serializer.data)
    
    def delete(self, request, flightlog_id):
        try:
            flight_log = FlightLog.objects.get(flightlog_id=flightlog_id, user=request.user)
        except FlightLog.DoesNotExist:
            return Response({"detail": "Flight log not found"}, status=status.HTTP_404_NOT_FOUND)
        
        deleted_count = GPSService.delete_gps_data(flight_log)
        
        return Response({
            "detail": f"Successfully deleted {deleted_count} GPS points",
            "deleted_count": deleted_count
        }, status=status.HTTP_200_OK)

# Endpunkte für Wartungsprotokolle
class MaintenanceLogListCreateView(generics.ListCreateAPIView):
    serializer_class = MaintenanceLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MaintenanceService.get_maintenance_logs_queryset(
            self.request.user,
            self.request.query_params
        )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class MaintenanceLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MaintenanceLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MaintenanceLog.objects.filter(user=self.request.user)

# Endpunkte für Wartungserinnerungen
class MaintenanceReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = MaintenanceReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MaintenanceService.get_maintenance_reminders_queryset(self.request.user)

class MaintenanceReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MaintenanceReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MaintenanceReminder.objects.filter(uav__user=self.request.user)

# Endpunkte für Dateien
class FileListCreateView(generics.ListCreateAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FileService.get_files_queryset(self.request.user, self.request.query_params)

class FileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FileService.get_files_queryset(self.request.user)

# Angepasste Endpunkte für Benutzer und Benutzereinstellungen
class UserListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Gibt nur das aktuell authentifizierte Benutzerobjekt zurück
        return User.objects.filter(pk=self.request.user.pk)

# Der Benutzer kann nur sein eigenes Profil abrufen, aktualisieren oder löschen.
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Gibt immer das aktuell authentifizierte Benutzerobjekt zurück
        return self.request.user

# Endpunkte für Benutzereinstellungen
class UserSettingsListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserService.get_user_settings(self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserSettingsDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserService.get_user_settings(self.request.user)

# Pagination for Admin Users
class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Admin-specific views
class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AdminUserPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['email', 'first_name', 'last_name', 'created_at']
    ordering = ['email']  # Default sorting
    
    def get_queryset(self):
        return AdminService.get_user_queryset(
            self.request.user,
            self.request.query_params
        )
    
    def list(self, request, *args, **kwargs):
        # Check if user is staff
        if not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only staff users can access this view
        if not self.request.user.is_staff:
            return User.objects.none()
        return User.objects.all()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        # Additional check for staff status
        if not request.user.is_staff:
            self.permission_denied(
                request,
                message="You do not have permission to perform this action.",
                code=status.HTTP_403_FORBIDDEN
            )

# Admin UAV views
class AdminUAVListView(generics.ListAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = UAVPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['drone_name', 'manufacturer', 'type', 'motors', 'registration_number', 'created_at']
    ordering = ['drone_name']  # Default sorting
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        return AdminService.get_user_uavs(
            self.request.user,
            user_id,
            self.request.query_params
        )
    
    def list(self, request, *args, **kwargs):
        # Check if user is staff
        if not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = serializer.data
            
            # Add flight statistics to each UAV
            response_data = UAVService.enrich_uav_data(response_data)
            
            return self.get_paginated_response(response_data)
        
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Add flight statistics to each UAV
        response_data = UAVService.enrich_uav_data(response_data)
        
        return Response(response_data)

class AdminUAVDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only staff users can access this view
        if not self.request.user.is_staff:
            return UAV.objects.none()
        return UAV.objects.all()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        # Additional check for staff status
        if not request.user.is_staff:
            self.permission_denied(
                request,
                message="You do not have permission to perform this action.",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def perform_update(self, serializer):
        uav = serializer.save()
        UAVService.update_maintenance_reminders(uav, serializer.validated_data)
    
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        
        # Use the service to add flight statistics to the response data
        response.data = UAVService.enrich_uav_data(response.data)
        
        return response

class UAVImportView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        csv_file = request.FILES['file']
        
        # Check if file is CSV
        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Process the CSV file using UAVService
        import_results = UAVService.import_uavs_from_csv(csv_file, request.user)
        
        # Create response
        response_data = {
            'success': import_results['error_count'] == 0,
            'message': f"Successfully imported {import_results['success_count']} of {import_results['total']} UAVs. "
                      f"Skipped {import_results['duplicate_count']} duplicates.",
            'details': {
                'success_count': import_results['success_count'],
                'duplicate_count': import_results['duplicate_count'],
                'error_count': import_results['error_count'],
                'duplicate_message': import_results['duplicate_message']
            }
        }
        
        if import_results['errors']:
            response_data['details']['errors'] = import_results['errors']
            
        return Response(response_data)


class FlightLogImportView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        csv_file = request.FILES['file']
        
        # Check if file is CSV
        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Process the CSV file using FlightLogService
        import_results = FlightLogService.import_logs_from_csv(csv_file, request.user)
        
        # Create response
        response_data = {
            'success': import_results['error_count'] == 0,
            'message': f"Successfully imported {import_results['success_count']} of {import_results['total']} logs. "
                      f"Skipped {import_results['duplicate_count']} duplicates and {import_results['unmapped_count']} logs with unmapped UAVs.",
            'details': {
                'success_count': import_results['success_count'],
                'duplicate_count': import_results['duplicate_count'],
                'unmapped_count': import_results['unmapped_count'],
                'error_count': import_results['error_count'],
                'unmapped_message': import_results['unmapped_message'],
                'duplicate_message': import_results.get('duplicate_message', '')
            }
        }
        
        if import_results['errors']:
            response_data['details']['errors'] = import_results['errors']
            
        return Response(response_data)