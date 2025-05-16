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
    # Use full UAV serializer for read operations
    uav = UAVSerializer(read_only=True)
    
    # Add a field for write operations (accepting UAV ID)
    uav_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = FlightLog
        fields = '__all__'
        
    def validate_uav_id(self, value):
        # Check if UAV exists and belongs to the current user
        try:
            user = self.context['request'].user
            uav = UAV.objects.get(uav_id=value, user=user)
            return value
        except UAV.DoesNotExist:
            raise serializers.ValidationError(f"UAV with id {value} does not exist or doesn't belong to you")
    
    def create(self, validated_data):
        # Extract the uav_id and get the corresponding UAV object
        uav_id = validated_data.pop('uav_id')
        uav = UAV.objects.get(uav_id=uav_id)
        
        # Create the flight log with the UAV object
        flight_log = FlightLog.objects.create(uav=uav, **validated_data)
        return flight_log

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
    # Use full UAV serializer for frontend compatibility
    uav = UAVSerializer(read_only=True)
    gps_logs = FlightGPSLogSerializer(many=True, read_only=True)
    
    # Add a field for write operations (accepting UAV ID)
    uav_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = FlightLog
        fields = '__all__'
    
    def validate_uav_id(self, value):
        # Check if UAV exists and belongs to the current user
        try:
            user = self.context['request'].user
            uav = UAV.objects.get(uav_id=value, user=user)
            return value
        except UAV.DoesNotExist:
            raise serializers.ValidationError(f"UAV with id {value} does not exist or doesn't belong to you")
    
    def update(self, instance, validated_data):
        # Handle UAV update if uav_id is provided
        if 'uav_id' in validated_data:
            uav_id = validated_data.pop('uav_id')
            uav = UAV.objects.get(uav_id=uav_id)
            instance.uav = uav
        
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

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
