from rest_framework import serializers
from .models import User, Aircraft, FlightLog, MaintenanceLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = '__all__'

class FlightLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightLog
        fields = '__all__'

class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = '__all__'
