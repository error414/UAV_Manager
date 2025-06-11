# backend/api/views.py
from rest_framework import generics, permissions, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied

from .models import (
    UAV, FlightLog, MaintenanceLog, MaintenanceReminder, User, UAVConfig
)
from .serializers import (
    UAVSerializer, FlightLogSerializer, MaintenanceLogSerializer, FlightGPSLogSerializer,
    MaintenanceReminderSerializer, FileSerializer, UserSerializer, UserSettingsSerializer,
    FlightLogWithGPSSerializer, UAVConfigSerializer
)

# Import the services
from .services.uav_service import UAVService, FlightLogService
from .services.maintenance_service import MaintenanceService
from .services.admin_service import AdminService
from .services.user_service import UserService
from .services.file_service import FileService
from .services.gps_service import GPSService
from .services.export_service import ExportService
from .services.import_service import ImportService
from .services.pagination_service import PaginationService

# Pagination for UAVs
class UAVPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# UAV endpoints (UAVs are owned by USERS)
class UAVListCreateView(generics.ListCreateAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = UAVPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['drone_name', 'manufacturer', 'type', 'motors', 'registration_number', 'created_at']
    ordering = ['drone_name']  # Default ordering
    
    def get_queryset(self):
        return UAVService.get_uav_queryset(self.request.user, self.request.query_params)
    
    def perform_create(self, serializer):
        uav = serializer.save(user=self.request.user)
        UAVService.update_maintenance_reminders(uav, serializer.validated_data)
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Use PaginationService for consistent pagination with UAV enrichment
        return PaginationService.paginate_with_enrichment(
            self, queryset, request, UAVService.enrich_uav_data
        )

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
        response.data = UAVService.enrich_uav_data(response.data)
        return response

# UAV metadata endpoint
class UAVMetaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UAV.objects.filter(user=request.user)
        min_id = qs.order_by('uav_id').values_list('uav_id', flat=True).first()
        max_id = qs.order_by('-uav_id').values_list('uav_id', flat=True).first()
        return Response({'minId': min_id, 'maxId': max_id})

# Pagination for FlightLogs
class FlightLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Flight log endpoints
class FlightLogListCreateView(generics.ListCreateAPIView):
    serializer_class = FlightLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FlightLogPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['departure_date', 'departure_time', 'landing_time', 'flight_duration']
    ordering = ['-departure_date', '-departure_time']  # Default: newest first
    
    def get_queryset(self):
        return FlightLogService.get_flightlog_queryset(
            self.request.user, 
            self.request.query_params
        )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Use PaginationService for consistent error handling
        page, error_response = PaginationService.paginate_queryset_safely(self, queryset, request)
        if error_response:
            return error_response
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class FlightLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FlightLogWithGPSSerializer  # Includes GPS logs
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FlightLog.objects.filter(user=self.request.user)

# Endpoint for uploading and managing GPS data
class FlightGPSDataUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, flightlog_id):
        try:
            flight_log = AdminService.get_object_if_owner(
                user=request.user,
                model_class=FlightLog,
                object_id=flightlog_id
            )
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
            flight_log = AdminService.get_object_if_owner(
                user=request.user,
                model_class=FlightLog,
                object_id=flightlog_id
            )
        except FlightLog.DoesNotExist:
            return Response({"detail": "Flight log not found"}, status=status.HTTP_404_NOT_FOUND)
        
        gps_logs = GPSService.get_gps_logs(flight_log)
        serializer = FlightGPSLogSerializer(gps_logs, many=True)
        
        return Response(serializer.data)
    
    def delete(self, request, flightlog_id):
        try:
            flight_log = AdminService.get_object_if_owner(
                user=request.user,
                model_class=FlightLog,
                object_id=flightlog_id
            )
        except FlightLog.DoesNotExist:
            return Response({"detail": "Flight log not found"}, status=status.HTTP_404_NOT_FOUND)
        
        deleted_count = GPSService.delete_gps_data(flight_log)
        
        return Response({
            "detail": f"Successfully deleted {deleted_count} GPS points",
            "deleted_count": deleted_count
        }, status=status.HTTP_200_OK)

# Flight log metadata endpoint
class FlightLogMetaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = FlightLog.objects.filter(user=request.user)
        min_id = qs.order_by('flightlog_id').values_list('flightlog_id', flat=True).first()
        max_id = qs.order_by('-flightlog_id').values_list('flightlog_id', flat=True).first()
        return Response({'minId': min_id, 'maxId': max_id})

# Maintenance log endpoints
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

# Maintenance reminder endpoints
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

# File endpoints
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

# User endpoints (only returns the authenticated user)
class UserListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Returns only the currently authenticated user object
        return User.objects.filter(pk=self.request.user.pk)

# User can only access their own profile
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Always returns the currently authenticated user object
        return self.request.user

# User settings endpoints
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

# Pagination for admin user list
class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Admin endpoints
class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AdminUserPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['email', 'first_name', 'last_name', 'created_at']
    ordering = ['email']  # Default ordering
    
    def get_queryset(self):
        return AdminService.get_user_queryset(
            self.request.user,
            self.request.query_params
        )
    
    def list(self, request, *args, **kwargs):
        try:
            AdminService.ensure_staff_user(request.user)
            return super().list(request, *args, **kwargs)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        try:
            AdminService.ensure_staff_user(self.request.user)
            return User.objects.all()
        except PermissionDenied:
            return User.objects.none()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        try:
            AdminService.ensure_staff_user(request.user)
        except PermissionDenied as e:
            self.permission_denied(
                request,
                message=str(e),
                code=status.HTTP_403_FORBIDDEN
            )

# Admin UAV endpoints
class AdminUAVListView(generics.ListAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = UAVPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['drone_name', 'manufacturer', 'type', 'motors', 'registration_number', 'created_at']
    ordering = ['drone_name']  # Default ordering
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        return AdminService.get_user_uavs(
            self.request.user,
            user_id,
            self.request.query_params
        )
    
    def list(self, request, *args, **kwargs):
        try:
            AdminService.ensure_staff_user(request.user)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Use PaginationService for consistent pagination with UAV enrichment
        return PaginationService.paginate_with_enrichment(
            self, queryset, request, UAVService.enrich_uav_data
        )

class AdminUAVDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        try:
            AdminService.ensure_staff_user(self.request.user)
            return UAV.objects.all()
        except PermissionDenied:
            return UAV.objects.none()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        try:
            AdminService.ensure_staff_user(request.user)
        except PermissionDenied as e:
            self.permission_denied(
                request,
                message=str(e),
                code=status.HTTP_403_FORBIDDEN
            )
    
    def perform_update(self, serializer):
        uav = serializer.save()
        UAVService.update_maintenance_reminders(uav, serializer.validated_data)
    
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
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

# Add this new view for exporting user data
class UserDataExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            response = ExportService.export_user_data(request.user)
            return response
        except Exception as e:
            return Response(
                {"detail": f"Error exporting data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Add this new view for importing user data
class UserDataImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response(
                {"detail": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        zip_file = request.FILES['file']
        
        # Check if file is ZIP
        if not zip_file.name.lower().endswith('.zip'):
            return Response(
                {"detail": "File must be a ZIP archive"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Process the import
            result = ImportService.import_user_data(request.user, zip_file)
            
            # Return appropriate response based on result
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {"detail": f"Error importing data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# UAV configuration endpoints
class UAVConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = UAVConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        uav_id = self.request.query_params.get('uav')
        queryset = UAVConfig.objects.filter(user=self.request.user)
        if uav_id:
            queryset = queryset.filter(uav_id=uav_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UAVConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UAVConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UAVConfig.objects.filter(user=self.request.user)