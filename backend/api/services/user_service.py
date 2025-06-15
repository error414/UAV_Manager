from ..models import User, UserSettings
from datetime import datetime
from django.conf import settings
from django.core.mail import send_mail

class UserService:
    @staticmethod
    def get_user_profile(user):
        # Returns the user's profile instance
        return User.objects.filter(pk=user.pk).first()
    
    @staticmethod
    def get_user_settings(user):
        from ..models import UserSettings
        return UserSettings.objects.filter(user=user)
    
    @staticmethod
    def update_user_settings(user, settings_data):
        # Create or update user settings
        settings, created = UserSettings.objects.get_or_create(user=user)
        today = datetime.now().date()
        if ('a1_a3_reminder' in settings_data and settings_data['a1_a3_reminder']):
            if not user.a1_a3 or user.a1_a3 <= today:
                settings_data['a1_a3_reminder'] = False
        if ('a2_reminder' in settings_data and settings_data['a2_reminder']):
            if not user.a2 or user.a2 <= today:
                settings_data['a2_reminder'] = False
        if ('sts_reminder' in settings_data and settings_data['sts_reminder']):
            if not user.sts or user.sts <= today:
                settings_data['sts_reminder'] = False
        for key, value in settings_data.items():
            setattr(settings, key, value)
        settings.save()
        return settings
    
    @staticmethod
    def check_license_expiry():
        # Check licenses expiring soon and send reminders
        today = datetime.now().date()
        
        settings_with_reminders = UserSettings.objects.filter(
            notifications_enabled=True
        ).select_related('user')
        
        for setting in settings_with_reminders:
            user = setting.user
            reminder_days = setting.reminder_months_before * 30  # Approximate months to days
            
            # A1/A3 license check
            if setting.a1_a3_reminder and user.a1_a3:
                expiry_date = user.a1_a3
                days_until_expiry = (expiry_date - today).days
                
                if 0 < days_until_expiry <= reminder_days:
                    UserService.send_license_reminder(
                        user, "A1/A3", expiry_date, days_until_expiry
                    )
            
            # A2 license check
            if setting.a2_reminder and user.a2:
                expiry_date = user.a2
                days_until_expiry = (expiry_date - today).days
                
                if 0 < days_until_expiry <= reminder_days:
                    UserService.send_license_reminder(
                        user, "A2", expiry_date, days_until_expiry
                    )
            
            # STS license check
            if setting.sts_reminder and user.sts:
                expiry_date = user.sts
                days_until_expiry = (expiry_date - today).days
                
                if 0 < days_until_expiry <= reminder_days:
                    UserService.send_license_reminder(
                        user, "STS", expiry_date, days_until_expiry
                    )
    
    @staticmethod
    def send_license_reminder(user, license_type, expiry_date, days_left):
        # Sends email reminder about license expiration
        subject = f"Reminder: Your {license_type} license expires soon"
        message = f"""
        Hello {user.first_name},
        
        This is a reminder that your {license_type} license will expire on {expiry_date} ({days_left} days from now).
        
        Please make sure to renew your license before it expires.
        
        Best regards,
        The DroneLogbook Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],  
            fail_silently=False,
        )
