import os
from django.conf import settings
from django.core.mail import send_mail

class MaintenanceService:
    # Directory name for maintenance logs (relative to MEDIA_ROOT)
    MAINTENANCE_LOGS_DIR = 'maint_logs'
    
    @staticmethod
    def get_maintenance_logs_queryset(user, query_params=None):
        from ..models import MaintenanceLog
        queryset = MaintenanceLog.objects.filter(user=user)
        
        # Filter by UAV if provided
        uav_id = query_params.get('uav') if query_params else None
        if uav_id:
            queryset = queryset.filter(uav_id=uav_id)
            
        return queryset

    @staticmethod
    def get_maintenance_reminders_queryset(user):
        from ..models import MaintenanceReminder
        return MaintenanceReminder.objects.filter(uav__user=user)

    @staticmethod
    def handle_file_update(instance, old_instance):
        user_id = instance.user.user_id
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        
        # Delete old file if replaced
        if old_instance and old_instance.file and instance.file != old_instance.file:
            MaintenanceService.handle_file_deletion(old_instance.file.path)

    @staticmethod
    def handle_file_deletion(file_path):
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except (FileNotFoundError, PermissionError):
                # Re-raise with original traceback
                raise
    
    @staticmethod
    def ensure_upload_directory_exists():
        """Create base directory for maintenance logs if missing."""
        upload_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR)
        if not os.path.exists(upload_dir):
            try:
                os.makedirs(upload_dir, exist_ok=True)
            except OSError:
                raise

    @staticmethod
    def ensure_user_upload_directory_exists(user_id):
        """Create user-specific directory if missing."""
        MaintenanceService.ensure_upload_directory_exists()
        user_upload_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR, str(user_id))
        if not os.path.exists(user_upload_dir):
            try:
                os.makedirs(user_upload_dir, exist_ok=True)
            except OSError:
                raise
    
    @staticmethod
    def get_maintenance_file_path(user_id, filename):
        """
        Return relative path for a maintenance log file.
        """
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        relative_path = f'{MaintenanceService.MAINTENANCE_LOGS_DIR}/{user_id}/{filename}'
        return relative_path.replace('\\', '/')
        
    @staticmethod
    def import_maintenance_file(user_id, file_obj, filename=None):
        """
        Save uploaded file to user directory.
        Returns relative path for DB storage.
        """
        if not filename:
            filename = file_obj.name
        MaintenanceService.ensure_user_upload_directory_exists(user_id)
        user_dir = os.path.join(settings.MEDIA_ROOT, MaintenanceService.MAINTENANCE_LOGS_DIR, str(user_id))
        abs_file_path = os.path.join(user_dir, filename)
        with open(abs_file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
        rel_path = f'{MaintenanceService.MAINTENANCE_LOGS_DIR}/{user_id}/{filename}'
        return rel_path.replace('\\', '/')
    
    @staticmethod
    def check_maintenance_reminders():
        """
        Check for maintenance reminders that are due and send email notifications.
        This method is called by the cronjob.
        """
        from django.utils import timezone
        from ..models import MaintenanceReminder
        
        today = timezone.now().date()
        
        # Find all active reminders that are due (next_maintenance <= today)
        due_reminders = MaintenanceReminder.objects.filter(
            reminder_active=True,
            next_maintenance__lte=today
        ).select_related('uav', 'uav__user')
        
        # Group by user to send one email per user
        user_reminders = {}
        for reminder in due_reminders:
            user = reminder.uav.user
            if user not in user_reminders:
                user_reminders[user] = []
            user_reminders[user].append(reminder)
        
        # Send emails
        for user, reminders in user_reminders.items():
            MaintenanceService.send_maintenance_reminder_email(user, reminders)
        
        return len(user_reminders)
    
    @staticmethod
    def send_maintenance_reminder_email(user, reminders):
        """Send email reminder about maintenance due"""
        try:
            subject = "Reminder: UAV Maintenance Due"
            
            message_lines = [
                f"Hello {user.first_name or user.email},",
                "",
                "This is a reminder that maintenance is due for the following UAVs:",
                ""
            ]
            
            for reminder in reminders:
                # Convert component code to display name
                component_display = dict([
                    ('MOTOR', 'Motor'),
                    ('PROPELLER', 'Propeller'), 
                    ('FRAME', 'Frame')
                ]).get(reminder.component, reminder.component)
                
                message_lines.append(
                    f"• {reminder.uav.drone_name} - {component_display} maintenance due on {reminder.next_maintenance}"
                )
            
            message_lines.extend([
                "",
                "Please log into UAV Manager to update your maintenance records.",
                f"{settings.FRONTEND_URL}",
                "",
                "Best regards,",
                "The UAV Manager Team"
            ])
            
            message = "\n".join(message_lines)
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception:
            raise
