from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseDjoserUserSerializer
from django.contrib.auth import get_user_model
from .models import UserSettings, UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File

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
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
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
        instance.save()
        return instance

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = '__all__'

class UAVSerializer(serializers.ModelSerializer):
    class Meta:
        model = UAV
        fields = '__all__'

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
