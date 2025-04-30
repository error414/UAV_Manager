import os
import json
import csv
import zipfile
import tempfile
from io import StringIO
from django.db import transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from datetime import datetime
from ..models import User, UAV, FlightLog, MaintenanceLog, MaintenanceReminder, File, FlightGPSLog, UAVConfig

class ImportService:
    DEBUG = False  # Set to True for debug output

    @staticmethod
    def _get_new_uav_id(user, old_uav_id, uav_mapping, data):
        # Hilfsfunktion zur Ermittlung der neuen UAV-ID
        if old_uav_id is not None and old_uav_id in uav_mapping:
            return uav_mapping[old_uav_id]
        elif 'drone_name' in data:
            drone_name = data.get('drone_name')
            matching_uavs = UAV.objects.filter(user=user, drone_name=drone_name)
            if matching_uavs.exists():
                return matching_uavs.first().uav_id
        else:
            existing_uavs = UAV.objects.filter(user=user)
            if existing_uavs.exists():
                return existing_uavs.first().uav_id
        return None

    @staticmethod
    def _remove_conflict_fields(data, fields):
        for field in fields:
            data.pop(field, None)

    @staticmethod
    def _save_file_to_storage(model_instance, file_name, file_content, path_func):
        new_path = path_func(model_instance, file_name)
        saved_path = default_storage.save(new_path, ContentFile(file_content))
        return saved_path

    @staticmethod
    def import_user_data(user, zip_file):
        """
        Import drone data (UAVs, flight logs, maintenance logs, reminders) from a ZIP file
        
        Parameters:
        - user: User object
        - zip_file: Django UploadedFile object
        """
        # Create temp directory to extract files
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                result = {
                    'success': True,
                    'details': {
                        'uavs_imported': 0,
                        'uav_configs_imported': 0,
                        'flight_logs_imported': 0,
                        'maintenance_logs_imported': 0,
                        'maintenance_reminders_imported': 0,
                        'errors': []
                    }
                }
                
                # Write the uploaded file to a temporary file
                temp_zip = os.path.join(temp_dir, 'uploaded_data.zip')
                with open(temp_zip, 'wb') as f:
                    # If it's a Django UploadedFile object
                    if hasattr(zip_file, 'read'):
                        f.write(zip_file.read())
                    # If it's already a file path
                    elif isinstance(zip_file, str) and os.path.exists(zip_file):
                        with open(zip_file, 'rb') as src:
                            f.write(src.read())
                    else:
                        raise ValueError("Invalid zip file provided")
                
                # Now extract from the temporary file
                with zipfile.ZipFile(temp_zip, 'r') as z:
                    z.extractall(temp_dir)
                
                # Import UAVs
                uav_mapping = {}  # To store old_id -> new_id mapping
                uavs_path = os.path.join(temp_dir, 'uavs', 'uavs.json')
                if os.path.exists(uavs_path):
                    try:
                        with transaction.atomic():
                            imported_count = ImportService._import_uavs(user, uavs_path, uav_mapping)
                            result['details']['uavs_imported'] = imported_count
                    except Exception as e:
                        result['details']['errors'].append(f"UAVs import error: {str(e)}")
                
                # Import UAV configuration files
                uav_configs_path = os.path.join(temp_dir, 'uav_configs', 'uav_configs.json')
                if os.path.exists(uav_configs_path):
                    try:
                        with transaction.atomic():
                            imported_count = ImportService._import_uav_configs(
                                user, uav_configs_path, uav_mapping, temp_dir
                            )
                            result['details']['uav_configs_imported'] = imported_count
                    except Exception as e:
                        result['details']['errors'].append(f"UAV configuration files import error: {str(e)}")
                
                # Import flight logs
                flight_logs_path = os.path.join(temp_dir, 'flight_logs', 'flight_logs.json')
                if os.path.exists(flight_logs_path):
                    try:
                        with transaction.atomic():
                            flight_log_mapping = {}  # To store old_id -> new_id mapping
                            imported_count = ImportService._import_flight_logs(
                                user, flight_logs_path, uav_mapping, flight_log_mapping
                            )
                            result['details']['flight_logs_imported'] = imported_count
                            
                            # Import GPS data for flight logs
                            gps_dir = os.path.join(temp_dir, 'flight_logs', 'gps_data')
                            if os.path.exists(gps_dir):
                                ImportService._import_gps_data(gps_dir, flight_log_mapping)
                    except Exception as e:
                        result['details']['errors'].append(f"Flight logs import error: {str(e)}")
                
                # Import maintenance logs
                maintenance_logs_path = os.path.join(temp_dir, 'maintenance_logs', 'maintenance_logs.json')
                if os.path.exists(maintenance_logs_path):
                    try:
                        with transaction.atomic():
                            imported_count = ImportService._import_maintenance_logs(
                                user, maintenance_logs_path, uav_mapping, temp_dir
                            )
                            result['details']['maintenance_logs_imported'] = imported_count
                    except Exception as e:
                        result['details']['errors'].append(f"Maintenance logs import error: {str(e)}")
                
                # Import maintenance reminders
                reminders_path = os.path.join(temp_dir, 'maintenance_reminders', 'reminders.json')
                if os.path.exists(reminders_path):
                    try:
                        with transaction.atomic():
                            imported_count = ImportService._import_maintenance_reminders(
                                user, reminders_path, uav_mapping
                            )
                            result['details']['maintenance_reminders_imported'] = imported_count
                    except Exception as e:
                        result['details']['errors'].append(f"Maintenance reminders import error: {str(e)}")
                
                # Check overall success
                if result['details']['errors']:
                    result['success'] = False
                    result['message'] = "Import completed with errors"
                else:
                    # Format import message in the style "Import successful! Imported: X, Y, and Z."
                    import_parts = []
                    
                    if result['details']['uavs_imported'] > 0:
                        import_parts.append(f"{result['details']['uavs_imported']} UAVs")
                    
                    if result['details']['uav_configs_imported'] > 0:
                        import_parts.append(f"{result['details']['uav_configs_imported']} UAV configuration files")
                    
                    if result['details']['flight_logs_imported'] > 0:
                        import_parts.append(f"{result['details']['flight_logs_imported']} flight logs")
                    
                    if result['details']['maintenance_logs_imported'] > 0:
                        import_parts.append(f"{result['details']['maintenance_logs_imported']} maintenance logs")
                    
                    if result['details']['maintenance_reminders_imported'] > 0:
                        import_parts.append(f"{result['details']['maintenance_reminders_imported']} maintenance reminders")
                    
                    if len(import_parts) > 0:
                        # Format the message with commas and "and" before the last item
                        if len(import_parts) == 1:
                            result['message'] = f"Import successful! Imported: {import_parts[0]}."
                        else:
                            last_item = import_parts.pop()
                            result['message'] = f"Import successful! Imported: {', '.join(import_parts)}, and {last_item}."
                    else:
                        result['message'] = "Import successful but no new data was added."
                
                # Bereinige leere Verzeichnisse, die während des Imports erstellt wurden
                ImportService._cleanup_empty_directories(settings.MEDIA_ROOT)
                
                return result
                
            except Exception as e:
                return {
                    'success': False,
                    'message': f"Import failed: {str(e)}",
                    'details': {'errors': [str(e)]}
                }
    
    @staticmethod
    def _cleanup_empty_directories(path):
        """Entferne rekursiv alle leeren Verzeichnisse unter dem angegebenen Pfad"""
        for root, dirs, files in os.walk(path, topdown=False):
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                # Prüfe, ob Verzeichnis leer ist (keine Dateien und keine Unterverzeichnisse)
                if not os.listdir(dir_path):
                    try:
                        os.rmdir(dir_path)
                    except OSError:
                        # Ignoriere Fehler, falls das Verzeichnis inzwischen gefüllt wurde
                        pass

    @staticmethod
    def _import_uavs(user, uavs_path, uav_mapping):
        """Import UAVs from JSON file and return mapping of old->new IDs"""
        with open(uavs_path, 'r') as f:
            uavs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        
        for uav_data in uavs_data:
            old_id = uav_data.get('uav_id')
            
            # Entferne Felder, die Konflikte verursachen könnten
            ImportService._remove_conflict_fields(uav_data, [
                'uav_id', 'props_maint_date', 'motor_maint_date', 'frame_maint_date',
                'props_reminder_date', 'motor_reminder_date', 'frame_reminder_date'
            ])
            uav_data['user'] = user
            
            # Erstelle immer ein neues UAV
            try:
                new_uav = UAV.objects.create(**uav_data)
                # Mapping immer auf das neue UAV setzen
                if old_id:
                    uav_mapping[old_id] = new_uav.uav_id
                imported_count += 1
            except TypeError as e:
                # Falls weitere unerwartete Felder vorhanden sind, entferne sie und versuche es erneut
                error_msg = str(e)
                if "got unexpected keyword" in error_msg:
                    import re
                    match = re.search(r"unexpected keyword '(\w+)'", error_msg)
                    if match:
                        field_name = match.group(1)
                        uav_data.pop(field_name, None)
                        new_uav = UAV.objects.create(**uav_data)
                        if old_id:
                            uav_mapping[old_id] = new_uav.uav_id
                        imported_count += 1
                else:
                    raise  # Re-raise if it's not about unexpected keywords
        
        return imported_count

    @staticmethod
    def _import_flight_logs(user, logs_path, uav_mapping, flight_log_mapping):
        """Import flight logs from JSON file"""
        with open(logs_path, 'r') as f:
            logs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for log_data in logs_data:
            try:
                old_id = log_data.get('flightlog_id')
                old_uav_id = log_data.get('uav_id') or log_data.get('uav')
                new_uav_id = ImportService._get_new_uav_id(user, old_uav_id, uav_mapping, log_data)
                
                if new_uav_id is None:
                    errors.append(f"No suitable UAV found for flight log {old_id}")
                    continue
                
                # Get necessary fields to check for existing flight logs
                departure_date = log_data.get('departure_date')
                departure_time = log_data.get('departure_time')
                departure_place = log_data.get('departure_place')
                
                # Check if a similar flight log already exists
                existing_logs = FlightLog.objects.filter(
                    user=user,
                    uav_id=new_uav_id,
                    departure_date=departure_date
                )
                
                if departure_time:
                    existing_logs = existing_logs.filter(departure_time=departure_time)
                    
                if departure_place:
                    existing_logs = existing_logs.filter(departure_place=departure_place)
                
                if existing_logs.exists():
                    # Add to mapping so GPS data can still reference it
                    if old_id:
                        flight_log_mapping[old_id] = existing_logs.first().flightlog_id
                    
                    skipped_count += 1
                    continue
                
                # Prepare data for creation
                ImportService._remove_conflict_fields(log_data, [
                    'flightlog_id', 'uav', 'created_at', 'gps_logs'
                ])
                log_data['uav_id'] = new_uav_id
                log_data['user'] = user
                
                # Create new flight log
                new_log = FlightLog.objects.create(**log_data)
                
                # Add to mapping
                if old_id:
                    flight_log_mapping[old_id] = new_log.flightlog_id
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing flight log: {str(e)}")
        
        return imported_count

    @staticmethod
    def _import_gps_data(gps_dir, flight_log_mapping):
        """Import GPS data for flight logs"""
        for filename in os.listdir(gps_dir):
            if filename.endswith('_gps.json'):
                # Extract flight log ID from filename (flight_X_gps.json)
                try:
                    parts = filename.split('_')
                    old_flight_id = int(parts[1])
                except (IndexError, ValueError):
                    continue
                
                # Skip if flight log wasn't imported
                if old_flight_id not in flight_log_mapping:
                    continue
                
                new_flight_id = flight_log_mapping[old_flight_id]
                flight_log = FlightLog.objects.get(flightlog_id=new_flight_id)
                
                # Import GPS points
                with open(os.path.join(gps_dir, filename), 'r') as f:
                    gps_data = json.load(f)
                
                for point in gps_data:
                    # Remove fields that would cause conflicts
                    point.pop('id', None)
                    point.pop('flight_log', None)
                    FlightGPSLog.objects.create(flight_log=flight_log, **point)

    @staticmethod
    def _import_maintenance_logs(user, logs_path, uav_mapping, temp_dir):
        """Import maintenance logs from JSON file"""
        with open(logs_path, 'r') as f:
            logs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        files_dir = os.path.join(temp_dir, 'maintenance_logs', 'files')
        
        # Import from maintenance_service for consistency
        from .maintenance_service import MaintenanceService
        
        for log_data in logs_data:
            try:
                old_maintenance_id = log_data.get('maintenance_id')
                old_uav_id = log_data.get('uav_id') or (log_data['uav'].get('uav_id') if isinstance(log_data.get('uav'), dict) else log_data.get('uav'))
                new_uav_id = ImportService._get_new_uav_id(user, old_uav_id, uav_mapping, log_data)
                
                if new_uav_id is None:
                    errors.append(f"No suitable UAV found for maintenance log {old_maintenance_id}")
                    continue
                
                # Check if a similar maintenance log already exists
                event_type = log_data.get('event_type')
                event_date = log_data.get('event_date')
                description = log_data.get('description')
                
                existing_logs = MaintenanceLog.objects.filter(
                    user=user,
                    uav_id=new_uav_id,
                    event_date=event_date,
                    event_type=event_type
                )
                
                if description:
                    existing_logs = existing_logs.filter(description=description)
                
                if existing_logs.exists():
                    skipped_count += 1
                    continue
                
                # Remove fields that would cause conflicts
                ImportService._remove_conflict_fields(log_data, ['maintenance_id', 'uav'])
                file_path = log_data.pop('file', None)
                log_data['uav_id'] = new_uav_id
                log_data['user'] = user
                
                # Create maintenance log with no file first
                new_log = MaintenanceLog.objects.create(**log_data)
                
                # Handle file if present
                if file_path and files_dir:
                    file_name = os.path.basename(file_path)
                    full_path = os.path.join(files_dir, file_name)
                    
                    if os.path.exists(full_path):
                        with open(full_path, 'rb') as f:
                            file_content = f.read()
                        
                        from ..models import maintenance_log_path
                        saved_path = ImportService._save_file_to_storage(new_log, file_name, file_content, maintenance_log_path)
                        new_log.file = saved_path
                        new_log.save()
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing maintenance log: {str(e)}")
        
        return imported_count

    @staticmethod
    def _import_maintenance_reminders(user, reminders_path, uav_mapping):
        """Import maintenance reminders from JSON file"""
        with open(reminders_path, 'r') as f:
            reminders_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for reminder_data in reminders_data:
            try:
                old_reminder_id = reminder_data.get('reminder_id')
                old_uav_id = reminder_data.get('uav_id') or (reminder_data['uav'].get('uav_id') if isinstance(reminder_data.get('uav'), dict) else reminder_data.get('uav'))
                new_uav_id = ImportService._get_new_uav_id(user, old_uav_id, uav_mapping, reminder_data)
                
                if new_uav_id is None:
                    errors.append(f"No suitable UAV found for reminder {old_reminder_id}")
                    continue
                
                # Check if a similar reminder already exists
                component = reminder_data.get('component')
                next_maintenance = reminder_data.get('next_maintenance')
                
                existing_reminders = MaintenanceReminder.objects.filter(
                    uav_id=new_uav_id,
                    component=component
                )
                
                if next_maintenance:
                    existing_reminders = existing_reminders.filter(next_maintenance=next_maintenance)
                
                if existing_reminders.exists():
                    skipped_count += 1
                    continue
                
                # Remove fields that would cause conflicts
                ImportService._remove_conflict_fields(reminder_data, ['reminder_id', 'uav'])
                reminder_data['uav_id'] = new_uav_id
                
                # Create new reminder
                MaintenanceReminder.objects.create(**reminder_data)
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing maintenance reminder: {str(e)}")
        
        return imported_count

    @staticmethod
    def _import_uav_configs(user, configs_path, uav_mapping, temp_dir):
        """Import UAV configuration files from JSON file"""
        with open(configs_path, 'r') as f:
            configs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        files_dir = os.path.join(temp_dir, 'uav_configs', 'files')
        
        for config_data in configs_data:
            try:
                old_config_id = config_data.get('config_id')
                old_uav_id = config_data.get('uav_id') or (config_data['uav'].get('uav_id') if isinstance(config_data.get('uav'), dict) else config_data.get('uav'))
                new_uav_id = ImportService._get_new_uav_id(user, old_uav_id, uav_mapping, config_data)
                
                if new_uav_id is None:
                    errors.append(f"No suitable UAV found for configuration {old_config_id}")
                    continue
                
                # Check if a similar configuration already exists
                config_name = config_data.get('name')
                upload_date = config_data.get('upload_date')
                
                existing_configs = UAVConfig.objects.filter(
                    user=user,
                    uav_id=new_uav_id,
                    name=config_name
                )
                
                if upload_date:
                    existing_configs = existing_configs.filter(upload_date=upload_date)
                
                if existing_configs.exists():
                    skipped_count += 1
                    continue
                
                # Remove fields that would cause conflicts
                ImportService._remove_conflict_fields(config_data, ['config_id', 'uav'])
                file_path = config_data.pop('file', None)
                config_data['uav_id'] = new_uav_id
                config_data['user'] = user
                
                # Create configuration entry with no file first
                new_config = UAVConfig.objects.create(**config_data)
                
                # Handle file if present
                if file_path and files_dir:
                    file_name = os.path.basename(file_path)
                    full_path = os.path.join(files_dir, file_name)
                    
                    if os.path.exists(full_path):
                        with open(full_path, 'rb') as f:
                            file_content = f.read()
                            
                        # Generate appropriate path for the UAV config file
                        from ..models import uav_config_path
                        saved_path = ImportService._save_file_to_storage(new_config, file_name, file_content, uav_config_path)
                        
                        # Update config with the actual path returned by storage
                        new_config.file = saved_path
                        new_config.save()
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing UAV configuration: {str(e)}")
        
        return imported_count
