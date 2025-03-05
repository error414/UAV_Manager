from rest_framework import generics
from .models import (
    UAV,
    FlightLog,
    MaintenanceLog,
    MaintenanceReminder,
    File,
    User,
    UserSettings
)
from .serializers import (
    UAVSerializer,
    FlightLogSerializer,
    MaintenanceLogSerializer,
    MaintenanceReminderSerializer,
    FileSerializer,
    UserSerializer,
    UserSettingsSerializer
)

# Endpunkte für UAVs (USERS besitzt UAVs)
class UAVListCreateView(generics.ListCreateAPIView):
    queryset = UAV.objects.all()
    serializer_class = UAVSerializer

class UAVDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = UAV.objects.all()
    serializer_class = UAVSerializer

# Endpunkte für Fluglogs
class FlightLogListCreateView(generics.ListCreateAPIView):
    queryset = FlightLog.objects.all()
    serializer_class = FlightLogSerializer

class FlightLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FlightLog.objects.all()
    serializer_class = FlightLogSerializer

# Endpunkte für Wartungsprotokolle
class MaintenanceLogListCreateView(generics.ListCreateAPIView):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer

class MaintenanceLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer

# Endpunkte für Wartungserinnerungen
class MaintenanceReminderListCreateView(generics.ListCreateAPIView):
    queryset = MaintenanceReminder.objects.all()
    serializer_class = MaintenanceReminderSerializer

class MaintenanceReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceReminder.objects.all()
    serializer_class = MaintenanceReminderSerializer

# Endpunkte für Dateien
class FileListCreateView(generics.ListCreateAPIView):
    queryset = File.objects.all()
    serializer_class = FileSerializer

class FileDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = File.objects.all()
    serializer_class = FileSerializer

# Optional: Endpunkte für Benutzer und Benutzereinstellungen
class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class UserSettingsListCreateView(generics.ListCreateAPIView):
    queryset = UserSettings.objects.all()
    serializer_class = UserSettingsSerializer

class UserSettingsDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = UserSettings.objects.all()
    serializer_class = UserSettingsSerializer
