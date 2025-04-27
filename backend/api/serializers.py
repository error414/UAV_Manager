from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseDjoserUserSerializer
from django.contrib.auth import get_user_model
from .models import UserSettings, UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File, FlightGPSLog, UAVConfig
from datetime import datetime

User = get_user_model()

class CustomUserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('email', 'password', 're_password')

    def create(self, validated_data):
        validated_data.pop('re_password', None)
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'first_name', 'last_name', 'phone', 
            'street', 'zip', 'city', 'country', 'company', 
            'drone_ops_nb', 'pilot_license_nb', 'a1_a3', 'a2', 'sts',
            'is_active', 'is_staff', 'created_at', 'updated_at'  # Make sure is_staff is included here
        ]
        read_only_fields = ['user_id', 'created_at', 'updated_at']

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = '__all__'

class UAVSerializer(serializers.ModelSerializer):
    # Add fields for maintenance dates that aren't in the model
    props_maint_date = serializers.DateField(required=False, allow_null=True)
    motor_maint_date = serializers.DateField(required=False, allow_null=True)
    frame_maint_date = serializers.DateField(required=False, allow_null=True)
    props_reminder_date = serializers.DateField(required=False, allow_null=True)
    motor_reminder_date = serializers.DateField(required=False, allow_null=True)
    frame_reminder_date = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = UAV
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Get the maintenance reminder data for this UAV
        reminders = MaintenanceReminder.objects.filter(uav=instance)
        
        # Add maintenance date fields from reminders
        for reminder in reminders:
            component = reminder.component
            if component in ['props', 'motor', 'frame']:
                representation[f'{component}_maint_date'] = reminder.last_maintenance.strftime('%Y-%m-%d')
                representation[f'{component}_reminder_date'] = reminder.next_maintenance.strftime('%Y-%m-%d')
        
        return representation

class FlightLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightLog
        fields = '__all__'

class FlightGPSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightGPSLog
        fields = [
            'timestamp', 'latitude', 'longitude', 'altitude', 'num_sat', 'speed', 'ground_course',
            'vertical_speed', 'pitch', 'roll', 'yaw', 'receiver_battery', 'current', 'capacity',
            'receiver_quality', 'transmitter_quality', 'transmitter_power',
            'aileron', 'elevator', 'throttle', 'rudder'
        ]
        
class FlightLogWithGPSSerializer(serializers.ModelSerializer):
    gps_logs = FlightGPSLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = FlightLog
        fields = '__all__'

class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = '__all__'  # Ensure 'file' is included
        extra_kwargs = {
            'uav': {'required': True},  # Ensure UAV is required
            'event_type': {'required': True},
            'description': {'required': True},
            'event_date': {'required': True},
            'user': {'read_only': True},  # Make user field read-only
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if instance.file and request:
            representation['file'] = request.build_absolute_uri(instance.file.url)
        return representation

class MaintenanceReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceReminder
        fields = '__all__'

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = '__all__'

class UAVConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = UAVConfig
        fields = '__all__'
        extra_kwargs = {
            'uav': {'required': True},
            'name': {'required': True},
            'upload_date': {'required': True},
            'user': {'read_only': True},
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if instance.file and request:
            representation['file'] = request.build_absolute_uri(instance.file.url)
        return representation
