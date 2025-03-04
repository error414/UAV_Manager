from rest_framework import generics
from .models import Aircraft, FlightLog, MaintenanceLog
from .serializers import AircraftSerializer, FlightLogSerializer, MaintenanceLogSerializer

# Endpunkt für Fluggeräte (Aircraft)
class AircraftListCreateView(generics.ListCreateAPIView):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer

class AircraftDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer

# Endpunkt für Flugstunden (FlightLog)
class FlightLogListCreateView(generics.ListCreateAPIView):
    queryset = FlightLog.objects.all()
    serializer_class = FlightLogSerializer

class FlightLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FlightLog.objects.all()
    serializer_class = FlightLogSerializer

# Endpunkt für Wartungsprotokolle (MaintenanceLog)
class MaintenanceLogListCreateView(generics.ListCreateAPIView):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer

class MaintenanceLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
