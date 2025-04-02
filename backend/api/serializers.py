from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseDjoserUserSerializer
from django.contrib.auth import get_user_model
from .models import UserSettings, UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File
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

class UserSerializer(BaseDjoserUserSerializer):
    class Meta(BaseDjoserUserSerializer.Meta):
        model = User
        fields = (
            'user_id', 'email', 'first_name', 'last_name', 'phone', 'street', 'zip',
            'city', 'country', 'company', 'drone_ops_nb', 'pilot_license_nb',
            'a1_a3', 'a2', 'sts', 'created_at', 'updated_at'
        )
        extra_kwargs = {
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'phone': {'required': False, 'allow_blank': True},
            'street': {'required': False, 'allow_blank': True},
            'zip': {'required': False, 'allow_blank': True},
            'city': {'required': False, 'allow_blank': True},
            'country': {'required': False, 'allow_blank': True},
        }
    
    def update(self, instance, validated_data):
        # Update only the fields sent by the client (as allowed by FIELDS_TO_UPDATE)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.street = validated_data.get('street', instance.street)
        instance.zip = validated_data.get('zip', instance.zip)
        instance.city = validated_data.get('city', instance.city)
        instance.country = validated_data.get('country', instance.country)
        # Add missing fields
        instance.company = validated_data.get('company', instance.company)
        instance.drone_ops_nb = validated_data.get('drone_ops_nb', instance.drone_ops_nb)
        instance.pilot_license_nb = validated_data.get('pilot_license_nb', instance.pilot_license_nb)
        # Also ensure license dates can be updated
        instance.a1_a3 = validated_data.get('a1_a3', instance.a1_a3)
        instance.a2 = validated_data.get('a2', instance.a2)
        instance.sts = validated_data.get('sts', instance.sts)
        instance.save()
        return instance

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

class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = '__all__'

class MaintenanceReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceReminder
        fields = '__all__'

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = '__all__'
