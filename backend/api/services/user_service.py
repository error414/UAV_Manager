from ..models import User, UserSettings

class UserService:
    @staticmethod
    def get_user_profile(user):
        """Get a user's profile data"""
        return User.objects.filter(pk=user.pk).first()
    
    @staticmethod
    def get_user_settings(user):
        """Get settings for a specific user"""
        return UserSettings.objects.filter(user=user)
    
    @staticmethod
    def update_user_settings(user, settings_data):
        """Create or update user settings"""
        settings, created = UserSettings.objects.get_or_create(user=user)
        for key, value in settings_data.items():
            setattr(settings, key, value)
        settings.save()
        return settings
