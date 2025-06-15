import os
import json
import zipfile
import tempfile
from django.db import transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from ..models import UAV, FlightLog, MaintenanceLog, MaintenanceReminder, FlightGPSLog, UAVConfig

class ImportService:
    @staticmethod
    def _get_new_uav_id(user, old_uav_id, uav_mapping, data):
        # Helper to resolve new UAV ID from old ID or drone name
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
        # Remove fields that may cause conflicts on model creation
        for field in fields:
            data.pop(field, None)

    @staticmethod
    def _save_file_to_storage(model_instance, file_name, file_content, path_func):
        # Save file to storage using model's path function
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
        # Use temp directory for extraction
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
                
                # Write uploaded file to temp file
                temp_zip = os.path.join(temp_dir, 'uploaded_data.zip')
                with open(temp_zip, 'wb') as f:
                    # Handle Django UploadedFile or file path
                    if hasattr(zip_file, 'read'):
                        f.write(zip_file.read())
                    elif isinstance(zip_file, str) and os.path.exists(zip_file):
                        with open(zip_file, 'rb') as src:
                            f.write(src.read())
                    else:
                        raise ValueError("Invalid zip file provided")
                
                # Extract ZIP
                with zipfile.ZipFile(temp_zip, 'r') as z:
                    z.extractall(temp_dir)
                
                # UAV import
                uav_mapping = {}  # old_id -> new_id
                uavs_path = os.path.join(temp_dir, 'uavs', 'uavs.json')
                if os.path.exists(uavs_path):
                    try:
                        with transaction.atomic():
                            imported_count = ImportService._import_uavs(user, uavs_path, uav_mapping)
                            result['details']['uavs_imported'] = imported_count
                    except Exception as e:
                        result['details']['errors'].append(f"UAVs import error: {str(e)}")
                
                # UAV config import
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
                
                # Flight log import
                flight_logs_path = os.path.join(temp_dir, 'flight_logs', 'flight_logs.json')
                if os.path.exists(flight_logs_path):
                    try:
                        with transaction.atomic():
                            flight_log_mapping = {}  # old_id -> new_id
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
                
                # Maintenance log import
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
                
                # Maintenance reminder import
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
                
                # Compose result message
                if result['details']['errors']:
                    result['success'] = False
                    result['message'] = "Import completed with errors"
                else:
                    # Compose message like "Import successful! Imported: X, Y, and Z."
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
                        if len(import_parts) == 1:
                            result['message'] = f"Import successful! Imported: {import_parts[0]}."
                        else:
                            last_item = import_parts.pop()
                            result['message'] = f"Import successful! Imported: {', '.join(import_parts)}, and {last_item}."
                    else:
                        result['message'] = "Import successful but no new data was added."
                
                # Remove empty directories created during import
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
        """Recursively remove all empty directories under the given path."""
        for root, dirs, files in os.walk(path, topdown=False):
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                # Remove directory if empty
                if not os.listdir(dir_path):
                    try:
                        os.rmdir(dir_path)
                    except OSError:
                        pass  # Ignore if directory is no longer empty

    @staticmethod
    def _import_uavs(user, uavs_path, uav_mapping):
        """Import UAVs from JSON and return old->new ID mapping."""
        with open(uavs_path, 'r') as f:
            uavs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        
        for uav_data in uavs_data:
            old_id = uav_data.get('uav_id')
            
            drone_name = uav_data.get('drone_name')
            manufacturer = uav_data.get('manufacturer')
            serial_number = uav_data.get('serial_number')
            
            # Prefer match by serial number if available
            existing_uav = None
            if serial_number and serial_number.strip():
                existing_uav = UAV.objects.filter(
                    user=user, 
                    serial_number=serial_number
                ).first()
            
            # Fallback: match by drone name and manufacturer
            if not existing_uav:
                existing_uavs = UAV.objects.filter(
                    user=user, 
                    drone_name=drone_name
                )
                
                if manufacturer:
                    existing_uavs = existing_uavs.filter(manufacturer=manufacturer)
                    
                existing_uav = existing_uavs.first()
            
            if existing_uav:
                # Add mapping for reference in logs
                if old_id:
                    uav_mapping[old_id] = existing_uav.uav_id
                    
                skipped_count += 1
                continue
            
            # Extract maintenance reminder fields before removing them
            maintenance_data = {}
            maintenance_fields = [
                'props_maint_date', 'motor_maint_date', 'frame_maint_date',
                'props_reminder_date', 'motor_reminder_date', 'frame_reminder_date',
                'props_reminder_active', 'motor_reminder_active', 'frame_reminder_active'
            ]
            
            for field in maintenance_fields:
                if field in uav_data:
                    maintenance_data[field] = uav_data[field]
            
            # Remove fields that may cause conflicts
            ImportService._remove_conflict_fields(uav_data, [
                'uav_id', 'props_maint_date', 'motor_maint_date', 'frame_maint_date',
                'props_reminder_date', 'motor_reminder_date', 'frame_reminder_date',
                'props_reminder_active', 'motor_reminder_active', 'frame_reminder_active'
            ])
            uav_data['user'] = user
            
            try:
                new_uav = UAV.objects.create(**uav_data)
                
                # Create maintenance reminders if present
                if maintenance_data:
                    from .uav_service import UAVService
                    UAVService.update_maintenance_reminders(new_uav, maintenance_data)
                
                if old_id:
                    uav_mapping[old_id] = new_uav.uav_id
                
                imported_count += 1
            except TypeError as e:
                error_msg = str(e)
                if "got unexpected keyword" in error_msg:
                    import re
                    match = re.search(r"unexpected keyword '(\w+)'", error_msg)
                    if match:
                        field_name = match.group(1)
                        uav_data.pop(field_name, None)
                        new_uav = UAV.objects.create(**uav_data)
                        
                        if maintenance_data:
                            from .uav_service import UAVService
                            UAVService.update_maintenance_reminders(new_uav, maintenance_data)
                        
                        if old_id:
                            uav_mapping[old_id] = new_uav.uav_id
                        
                        imported_count += 1
                else:
                    raise
        
        return imported_count

    @staticmethod
    def _import_flight_logs(user, logs_path, uav_mapping, flight_log_mapping):
        """Import flight logs from JSON file."""
        with open(logs_path, 'r') as f:
            logs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for log_data in logs_data:
            try:
                old_id = log_data.get('flightlog_id')
                old_uav_id = log_data.get('uav_id') or (log_data['uav'].get('uav_id') if isinstance(log_data.get('uav'), dict) else log_data.get('uav'))
                new_uav_id = ImportService._get_new_uav_id(user, old_uav_id, uav_mapping, log_data)
                
                if new_uav_id is None:
                    errors.append(f"No suitable UAV found for flight log {old_id}")
                    continue
                
                departure_date = log_data.get('departure_date')
                departure_time = log_data.get('departure_time')
                departure_place = log_data.get('departure_place')
                
                # Check for existing log with same UAV, date, and optionally time/place
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
                    if old_id:
                        flight_log_mapping[old_id] = existing_logs.first().flightlog_id
                    
                    skipped_count += 1
                    continue
                
                ImportService._remove_conflict_fields(log_data, [
                    'flightlog_id', 'uav', 'created_at', 'gps_logs'
                ])
                log_data['uav_id'] = new_uav_id
                log_data['user'] = user
                
                new_log = FlightLog.objects.create(**log_data)
                
                if old_id:
                    flight_log_mapping[old_id] = new_log.flightlog_id
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing flight log: {str(e)}")
        
        return imported_count

    @staticmethod
    def _import_gps_data(gps_dir, flight_log_mapping):
        """Import GPS data for flight logs."""
        for filename in os.listdir(gps_dir):
            if filename.endswith('_gps.json'):
                try:
                    parts = filename.split('_')
                    old_flight_id = int(parts[1])
                except (IndexError, ValueError):
                    continue
                
                # Skip if flight log was not imported
                if old_flight_id not in flight_log_mapping:
                    continue
                
                new_flight_id = flight_log_mapping[old_flight_id]
                flight_log = FlightLog.objects.get(flightlog_id=new_flight_id)
                
                with open(os.path.join(gps_dir, filename), 'r') as f:
                    gps_data = json.load(f)
                
                for point in gps_data:
                    point.pop('id', None)
                    point.pop('flight_log', None)
                    FlightGPSLog.objects.create(flight_log=flight_log, **point)

    @staticmethod
    def _import_maintenance_logs(user, logs_path, uav_mapping, temp_dir):
        """Import maintenance logs from JSON file."""
        with open(logs_path, 'r') as f:
            logs_data = json.load(f)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        files_dir = os.path.join(temp_dir, 'maintenance_logs', 'files')
        
        for log_data in logs_data:
            try:
                old_maintenance_id = log_data.get('maintenance_id')
                old_uav_id = log_data.get('uav_id') or (log_data['uav'].get('uav_id') if isinstance(log_data.get('uav'), dict) else log_data.get('uav'))
                new_uav_id = ImportService._get_new_uav_id(user, old_uav_id, uav_mapping, log_data)
                
                if new_uav_id is None:
                    errors.append(f"No suitable UAV found for maintenance log {old_maintenance_id}")
                    continue
                
                event_type = log_data.get('event_type')
                event_date = log_data.get('event_date')
                description = log_data.get('description')
                
                # Check for existing log with same UAV, date, event type, and description
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
                
                ImportService._remove_conflict_fields(log_data, ['maintenance_id', 'uav'])
                file_path = log_data.pop('file', None)
                log_data['uav_id'] = new_uav_id
                log_data['user'] = user
                
                # Create log without file first
                new_log = MaintenanceLog.objects.create(**log_data)
                
                # Attach file if present
                if file_path and files_dir:
                    file_name = os.path.basename(file_path)
                    
                    # Try multiple possible locations for the file
                    possible_paths = [
                        os.path.join(files_dir, file_name),
                        os.path.join(temp_dir, file_path.lstrip('/')),
                    ]
                    
                    file_found = False
                    for full_path in possible_paths:
                        if os.path.exists(full_path):
                            with open(full_path, 'rb') as f:
                                file_content = f.read()
                            
                            from ..models import maintenance_log_path
                            saved_path = ImportService._save_file_to_storage(new_log, file_name, file_content, maintenance_log_path)
                            new_log.file = saved_path
                            new_log.save()
                            file_found = True
                            break
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing maintenance log: {str(e)}")
        
        return imported_count

    @staticmethod
    def _import_maintenance_reminders(user, reminders_path, uav_mapping):
        """Import maintenance reminders from JSON file."""
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
                
                component = reminder_data.get('component')
                next_maintenance = reminder_data.get('next_maintenance')
                
                # Check for existing reminder with same UAV, component, and next maintenance
                existing_reminders = MaintenanceReminder.objects.filter(
                    uav_id=new_uav_id,
                    component=component
                )
                
                if next_maintenance:
                    existing_reminders = existing_reminders.filter(next_maintenance=next_maintenance)
                
                if existing_reminders.exists():
                    skipped_count += 1
                    continue
                
                ImportService._remove_conflict_fields(reminder_data, ['reminder_id', 'uav'])
                reminder_data['uav_id'] = new_uav_id
                
                MaintenanceReminder.objects.create(**reminder_data)
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing maintenance reminder: {str(e)}")
        
        return imported_count

    @staticmethod
    def _import_uav_configs(user, configs_path, uav_mapping, temp_dir):
        """Import UAV configuration files from JSON file."""
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
                
                config_name = config_data.get('name')
                upload_date = config_data.get('upload_date')
                
                # Check for existing config with same UAV, name, and upload date
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
                
                ImportService._remove_conflict_fields(config_data, ['config_id', 'uav'])
                file_path = config_data.pop('file', None)
                config_data['uav_id'] = new_uav_id
                config_data['user'] = user
                
                new_config = UAVConfig.objects.create(**config_data)
                
                # Attach file if present
                if file_path and files_dir:
                    file_name = os.path.basename(file_path)
                    full_path = os.path.join(files_dir, file_name)
                    
                    if os.path.exists(full_path):
                        with open(full_path, 'rb') as f:
                            file_content = f.read()
                            
                        from ..models import uav_config_path
                        saved_path = ImportService._save_file_to_storage(new_config, file_name, file_content, uav_config_path)
                        
                        new_config.file = saved_path
                        new_config.save()
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing UAV configuration: {str(e)}")
        
        return imported_count

    @staticmethod
    def validate_upload_file(file, required_extension):
        """
        Validates an uploaded file
        Returns (is_valid, error_message)
        """
        if not file:
            return False, "No file provided"
        
        if not file.name.lower().endswith(required_extension.lower()):
            return False, f"File must be a {required_extension.upper()} file"
        
        return True, None