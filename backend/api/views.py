# backend/api/views.py
from rest_framework import generics, permissions, filters
from datetime import datetime
from django.http import JsonResponse
from rest_framework.decorators import api_view
from django.db import models
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from .models import (
    UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File, User, UserSettings
)
from .serializers import (
    UAVSerializer, FlightLogSerializer, MaintenanceLogSerializer,
    MaintenanceReminderSerializer, FileSerializer, UserSerializer, UserSettingsSerializer
)

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
        queryset = UAV.objects.filter(user=self.request.user)
        
        # Apply filters from query parameters
        params = self.request.query_params
        
        # Filter by drone name (partial match)
        if params.get('drone_name'):
            queryset = queryset.filter(drone_name__icontains=params['drone_name'])
            
        # Filter by manufacturer (partial match)
        if params.get('manufacturer'):
            queryset = queryset.filter(manufacturer__icontains=params['manufacturer'])
            
        # Filter by type (partial match)
        if params.get('type'):
            queryset = queryset.filter(type__icontains=params['type'])
            
        # Filter by motors (exact match)
        if params.get('motors'):
            try:
                motors = int(params['motors'])
                queryset = queryset.filter(motors=motors)
            except (ValueError, TypeError):
                pass
                
        # Filter by motor type (partial match)
        if params.get('motor_type'):
            queryset = queryset.filter(motor_type__icontains=params['motor_type'])
            
        # Filter by video system (partial match)
        if params.get('video_system'):
            queryset = queryset.filter(video_system__icontains=params['video_system'])
            
        # Filter by firmware (partial match)
        if params.get('firmware'):
            queryset = queryset.filter(firmware__icontains=params['firmware'])
            
        # Filter by firmware version (partial match)
        if params.get('firmware_version'):
            queryset = queryset.filter(firmware_version__icontains=params['firmware_version'])
            
        # Filter by GPS (partial match)
        if params.get('gps'):
            queryset = queryset.filter(gps__icontains=params['gps'])
            
        # Filter by MAG (partial match)
        if params.get('mag'):
            queryset = queryset.filter(mag__icontains=params['mag'])
            
        # Filter by BARO (partial match)
        if params.get('baro'):
            queryset = queryset.filter(baro__icontains=params['baro'])
            
        # Filter by GYRO (partial match)
        if params.get('gyro'):
            queryset = queryset.filter(gyro__icontains=params['gyro'])
            
        # Filter by ACC (partial match)
        if params.get('acc'):
            queryset = queryset.filter(acc__icontains=params['acc'])

        # Filter by registration number (partial match)
        if params.get('registration_number'):
            queryset = queryset.filter(registration_number__icontains=params['registration_number'])
            
        # Filter by serial number (partial match)
        if params.get('serial_number'):
            queryset = queryset.filter(serial_number__icontains=params['serial_number'])
        
        return queryset
    
    def perform_create(self, serializer):
        uav = serializer.save(user=self.request.user)
        self._update_maintenance_reminders(uav, serializer.validated_data)
    
    def _update_maintenance_reminders(self, uav, data):
        # Process maintenance reminders
        components = ['props', 'motor', 'frame']
        for component in components:
            maint_date_key = f'{component}_maint_date'
            reminder_date_key = f'{component}_reminder_date'
            
            # Skip if no maintenance date is provided
            if maint_date_key not in data or data[maint_date_key] is None:
                continue
            
            last_maintenance = data[maint_date_key]
            next_maintenance = data.get(reminder_date_key, None)
            
            # If no next_maintenance date, default to 1 year later
            if next_maintenance is None and last_maintenance is not None:
                next_year = datetime(
                    last_maintenance.year + 1, 
                    last_maintenance.month, 
                    last_maintenance.day
                )
                next_maintenance = next_year
            
            # Create or update reminder
            if last_maintenance:
                # Check if a reminder for this component already exists
                reminder, created = MaintenanceReminder.objects.update_or_create(
                    uav=uav,
                    component=component,
                    defaults={
                        'last_maintenance': last_maintenance,
                        'next_maintenance': next_maintenance,
                        'reminder_active': True
                    }
                )
    
    # Modify the list method to correctly handle paginated responses
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Check if pagination is needed
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = serializer.data
            
            # Add flight statistics to each UAV
            for uav_data in response_data:
                uav_id = uav_data['uav_id']
                uav_data['total_flights'] = FlightLog.objects.filter(uav_id=uav_id).count()
                uav_data['total_flight_hours'] = FlightLog.get_total_flight_hours(uav_id)
                uav_data['total_flight_time'] = FlightLog.get_total_flight_hours(uav_id) * 3600  # Convert hours to seconds
                uav_data['total_landings'] = FlightLog.get_total_landings(uav_id)
                uav_data['total_takeoffs'] = FlightLog.get_total_takeoffs(uav_id)
            
            return self.get_paginated_response(response_data)
        
        # If no pagination, use the original implementation
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Add flight statistics to each UAV
        for uav_data in response_data:
            uav_id = uav_data['uav_id']
            uav_data['total_flights'] = FlightLog.objects.filter(uav_id=uav_id).count()
            uav_data['total_flight_hours'] = FlightLog.get_total_flight_hours(uav_id)
            uav_data['total_flight_time'] = FlightLog.get_total_flight_hours(uav_id) * 3600  # Convert hours to seconds
            uav_data['total_landings'] = FlightLog.get_total_landings(uav_id)
            uav_data['total_takeoffs'] = FlightLog.get_total_takeoffs(uav_id)
        
        return Response(response_data)

class UAVDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UAVSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UAV.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        uav = serializer.save()
        self._update_maintenance_reminders(uav, serializer.validated_data)
    
    def _update_maintenance_reminders(self, uav, data):
        # Process maintenance reminders
        components = ['props', 'motor', 'frame']
        for component in components:
            maint_date_key = f'{component}_maint_date'
            reminder_date_key = f'{component}_reminder_date'
            
            # Only update if the field is in the data
            if maint_date_key not in data:
                continue
            
            last_maintenance = data[maint_date_key]
            next_maintenance = data.get(reminder_date_key, None)
            
            # If maintenance date is None, we might want to delete any existing reminder
            if last_maintenance is None:
                MaintenanceReminder.objects.filter(uav=uav, component=component).delete()
                continue
            
            # If no next_maintenance date, default to 1 year later
            if next_maintenance is None and last_maintenance is not None:
                next_year = datetime(
                    last_maintenance.year + 1, 
                    last_maintenance.month, 
                    last_maintenance.day
                )
                next_maintenance = next_year
            
            # Create or update reminder
            reminder, created = MaintenanceReminder.objects.update_or_create(
                uav=uav,
                component=component,
                defaults={
                    'last_maintenance': last_maintenance,
                    'next_maintenance': next_maintenance,
                    'reminder_active': True
                }
            )
    
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        uav_id = self.get_object().uav_id
        
        # Fügt alle Flugstatistiken hinzu, die auch in der list-Methode vorhanden sind
        response.data['total_flights'] = FlightLog.objects.filter(uav_id=uav_id).count()
        response.data['total_flight_hours'] = FlightLog.get_total_flight_hours(uav_id)
        response.data['total_flight_time'] = FlightLog.get_total_flight_hours(uav_id) * 3600  # Konvertiert Stunden in Sekunden
        response.data['total_landings'] = FlightLog.get_total_landings(uav_id)
        response.data['total_takeoffs'] = FlightLog.get_total_takeoffs(uav_id)
        
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
    ordering = ['-departure_date', '-departure_time']  # Default sorting
    
    def get_queryset(self):
        queryset = FlightLog.objects.filter(user=self.request.user)
        
        # Apply filters from query parameters
        params = self.request.query_params
        
        # Add debug logging
        print(f"Filter parameters received: {params}")
        
        # Filter by departure place (partial match)
        if params.get('departure_place'):
            queryset = queryset.filter(departure_place__icontains=params['departure_place'])
            
        # Filter by landing place (partial match)
        if params.get('landing_place'):
            queryset = queryset.filter(landing_place__icontains=params['landing_place'])
            
        # Filter by specific date
        if params.get('departure_date'):
            queryset = queryset.filter(departure_date=params['departure_date'])
        
        # Filter by departure time (exact match)
        if params.get('departure_time'):
            queryset = queryset.filter(departure_time=params['departure_time'])
            
        # Filter by landing time (exact match)
        if params.get('landing_time'):
            queryset = queryset.filter(landing_time=params['landing_time'])
            
        # Filter by flight duration
        if params.get('flight_duration'):
            try:
                duration = int(params['flight_duration'])
                queryset = queryset.filter(flight_duration=duration)
            except (ValueError, TypeError):
                pass
            
        # Filter by takeoffs
        if params.get('takeoffs'):
            try:
                takeoffs = int(params['takeoffs'])
                queryset = queryset.filter(takeoffs=takeoffs)
            except (ValueError, TypeError):
                pass
                
        # Filter by landings
        if params.get('landings'):
            try:
                landings = int(params['landings'])
                queryset = queryset.filter(landings=landings)
            except (ValueError, TypeError):
                pass
            
        # Filter by UAV id
        if params.get('uav'):
            queryset = queryset.filter(uav__uav_id=params['uav'])
            
        # Filter by light conditions
        if params.get('light_conditions'):
            queryset = queryset.filter(light_conditions=params['light_conditions'])
            
        # Filter by ops conditions
        if params.get('ops_conditions'):
            queryset = queryset.filter(ops_conditions=params['ops_conditions'])
            
        # Filter by pilot type
        if params.get('pilot_type'):
            queryset = queryset.filter(pilot_type=params['pilot_type'])
            
        # Text search in comments
        if params.get('comments'):
            queryset = queryset.filter(comments__icontains=params['comments'])
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class FlightLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FlightLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FlightLog.objects.filter(user=self.request.user)

# Endpunkte für Wartungsprotokolle
class MaintenanceLogListCreateView(generics.ListCreateAPIView):
    serializer_class = MaintenanceLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        uav_id = self.request.query_params.get('uav')
        queryset = MaintenanceLog.objects.filter(user=self.request.user)
        if uav_id:
            queryset = queryset.filter(uav_id=uav_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)  # Automatically set the user field

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
        # Filter reminders for UAVs that belong to the current user
        return MaintenanceReminder.objects.filter(uav__user=self.request.user)

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
        return File.objects.filter(uav__user=self.request.user)

class FileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return File.objects.filter(uav__user=self.request.user)

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
        return UserSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserSettingsDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserSettings.objects.filter(user=self.request.user)