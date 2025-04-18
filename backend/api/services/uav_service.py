from datetime import datetime
from django.db.models import Q, Sum
from ..models import UAV, FlightLog, MaintenanceReminder
import csv
import io

class UAVService:
    @staticmethod
    def get_uav_queryset(user, query_params=None):
        """Filter UAV queryset based on user and query parameters"""
        queryset = UAV.objects.filter(user=user)
        
        if not query_params:
            return queryset
            
        # Apply filters from query parameters
        params = query_params
        
        # Filter by drone name (partial match)
        if params.get('drone_name'):
            queryset = queryset.filter(drone_name__icontains=params['drone_name'])
            
        # Filter by manufacturer (partial match)
        if params.get('manufacturer'):
            queryset = queryset.filter(manufacturer__icontains=params['manufacturer'])
            
        # Filter by type (partial match)
        if params.get('type'):
            queryset = queryset.filter(type__icontains=params['type'])
            
        # Filter by motors (exact match)
        if params.get('motors'):
            try:
                motors = int(params['motors'])
                queryset = queryset.filter(motors=motors)
            except (ValueError, TypeError):
                pass
                
        # Filter by motor type (partial match)
        if params.get('motor_type'):
            queryset = queryset.filter(motor_type__icontains=params['motor_type'])
            
        # Filter by video system (partial match)
        if params.get('video_system'):
            queryset = queryset.filter(video_system__icontains=params['video_system'])
            
        # Filter by firmware (partial match)
        if params.get('firmware'):
            queryset = queryset.filter(firmware__icontains=params['firmware'])
            
        # Filter by firmware version (partial match)
        if params.get('firmware_version'):
            queryset = queryset.filter(firmware_version__icontains=params['firmware_version'])
            
        # Filter by GPS (partial match)
        if params.get('gps'):
            queryset = queryset.filter(gps__icontains=params['gps'])
            
        # Filter by MAG (partial match)
        if params.get('mag'):
            queryset = queryset.filter(mag__icontains=params['mag'])
            
        # Filter by BARO (partial match)
        if params.get('baro'):
            queryset = queryset.filter(baro__icontains=params['baro'])
            
        # Filter by GYRO (partial match)
        if params.get('gyro'):
            queryset = queryset.filter(gyro__icontains=params['gyro'])
            
        # Filter by ACC (partial match)
        if params.get('acc'):
            queryset = queryset.filter(acc__icontains=params['acc'])

        # Filter by registration number (partial match)
        if params.get('registration_number'):
            queryset = queryset.filter(registration_number__icontains=params['registration_number'])
            
        # Filter by serial number (partial match)
        if params.get('serial_number'):
            queryset = queryset.filter(serial_number__icontains=params['serial_number'])
        
        return queryset

    @staticmethod
    def update_maintenance_reminders(uav, data):
        """Create or update maintenance reminders for a UAV"""
        # Process maintenance reminders
        components = ['props', 'motor', 'frame']
        for component in components:
            maint_date_key = f'{component}_maint_date'
            reminder_date_key = f'{component}_reminder_date'
            
            # Only update if the field is in the data
            if maint_date_key not in data:
                continue
            
            last_maintenance = data[maint_date_key]
            next_maintenance = data.get(reminder_date_key, None)
            
            # If maintenance date is None, we might want to delete any existing reminder
            if last_maintenance is None:
                MaintenanceReminder.objects.filter(uav=uav, component=component).delete()
                continue
            
            # If no next_maintenance date, default to 1 year later
            if next_maintenance is None and last_maintenance is not None:
                next_year = datetime(
                    last_maintenance.year + 1, 
                    last_maintenance.month, 
                    last_maintenance.day
                )
                next_maintenance = next_year
            
            # Create or update reminder
            reminder, created = MaintenanceReminder.objects.update_or_create(
                uav=uav,
                component=component,
                defaults={
                    'last_maintenance': last_maintenance,
                    'next_maintenance': next_maintenance,
                    'reminder_active': True
                }
            )

    @staticmethod
    def enrich_uav_data(uav_data):
        """Add flight statistics to UAV data"""
        if isinstance(uav_data, list):
            # Handle list of UAVs
            for item in uav_data:
                UAVService._add_flight_stats_to_uav(item)
        else:
            # Handle single UAV
            UAVService._add_flight_stats_to_uav(uav_data)
        
        return uav_data
    
    @staticmethod
    def _add_flight_stats_to_uav(uav_data):
        """Helper method to add flight statistics to a single UAV data object"""
        uav_id = uav_data['uav_id']
        uav_data['total_flights'] = FlightLog.objects.filter(uav_id=uav_id).count()
        uav_data['total_flight_hours'] = FlightLogService.get_total_flight_hours(uav_id)
        uav_data['total_flight_time'] = FlightLogService.get_total_flight_hours(uav_id) * 3600  # Convert hours to seconds
        uav_data['total_landings'] = FlightLogService.get_total_landings(uav_id)
        uav_data['total_takeoffs'] = FlightLogService.get_total_takeoffs(uav_id)

    @staticmethod
    def import_uavs_from_csv(csv_file, user):
        """Import UAVs from CSV file"""
        try:
            # Decode the file
            csv_data = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_data))
            
            # Statistics tracking
            success_count = 0
            duplicate_count = 0
            error_count = 0
            errors = []
            duplicate_names = {}
            
            # Get existing UAVs to check for duplicates
            existing_uavs = UAV.objects.filter(user=user).values_list('drone_name', flat=True)
            
            for row in csv_reader:
                try:
                    # Check for required fields
                    if not row.get('DroneName') or not row.get('Type') or not row.get('Motors'):
                        errors.append(f"Missing required field for UAV: {row.get('DroneName', 'Unknown')}")
                        error_count += 1
                        continue
                    
                    # Check for duplicates
                    if row['DroneName'] in existing_uavs:
                        if row['DroneName'] not in duplicate_names:
                            duplicate_names[row['DroneName']] = 0
                        duplicate_names[row['DroneName']] += 1
                        duplicate_count += 1
                        continue
                    
                    # Create UAV object
                    uav = UAV(
                        user=user,
                        drone_name=row.get('DroneName', ''),
                        manufacturer=row.get('Manufacturer', ''),
                        type=row.get('Type', ''),
                        motors=int(row.get('Motors', 1)),
                        motor_type=row.get('MotorType', ''),
                        video=row.get('Video', ''),
                        video_system=row.get('VideoSystem', ''),
                        esc=row.get('ESC', ''),
                        esc_firmware=row.get('ESCFirmware', ''),
                        receiver=row.get('Receiver', ''),
                        receiver_firmware=row.get('ReceiverFirmware', ''),
                        flight_controller=row.get('FlightController', ''),
                        firmware=row.get('Firmware', ''),
                        firmware_version=row.get('FirmwareVersion', ''),
                        gps=row.get('GPS', ''),
                        mag=row.get('MAG', ''),
                        baro=row.get('BARO', ''),
                        gyro=row.get('GYRO', ''),
                        acc=row.get('ACC', ''),
                        registration_number=row.get('RegistrationNumber', ''),
                        serial_number=row.get('SerialNumber', ''),
                        is_active=True
                    )
                    uav.save()
                    success_count += 1
                    existing_uavs = list(existing_uavs) + [uav.drone_name]
                    
                except Exception as e:
                    error_count += 1
                    errors.append(f"Error processing UAV {row.get('DroneName', 'Unknown')}: {str(e)}")
            
            # Create report message
            duplicate_message = ""
            if duplicate_names:
                duplicate_message = "\n\nSkipped UAVs with these names (already exist):"
                for name, count in duplicate_names.items():
                    duplicate_message += f"\n- {name}: {count} UAV(s)"
            
            result = {
                'success_count': success_count,
                'duplicate_count': duplicate_count,
                'error_count': error_count,
                'errors': errors,
                'duplicate_message': duplicate_message,
                'total': success_count + duplicate_count + error_count
            }
            
            return result
            
        except Exception as e:
            return {
                'success_count': 0,
                'duplicate_count': 0,
                'error_count': 1,
                'errors': [f"Failed to process CSV: {str(e)}"],
                'duplicate_message': "",
                'total': 0
            }

class FlightLogService:
    @staticmethod
    def get_flightlog_queryset(user, query_params=None):
        """Filter FlightLog queryset based on user and query parameters"""
        queryset = FlightLog.objects.filter(user=user)
        
        if not query_params:
            return queryset
            
        # Apply filters from query parameters
        params = query_params
        
        # Filter by departure place (partial match)
        if params.get('departure_place'):
            queryset = queryset.filter(departure_place__icontains=params['departure_place'])
            
        # Filter by landing place (partial match)
        if params.get('landing_place'):
            queryset = queryset.filter(landing_place__icontains=params['landing_place'])
            
        # Filter by specific date
        if params.get('departure_date'):
            queryset = queryset.filter(departure_date=params['departure_date'])
        
        # Filter by departure time (exact match)
        if params.get('departure_time'):
            queryset = queryset.filter(departure_time=params['departure_time'])
            
        # Filter by landing time (exact match)
        if params.get('landing_time'):
            queryset = queryset.filter(landing_time=params['landing_time'])
            
        # Filter by flight duration
        if params.get('flight_duration'):
            try:
                duration = int(params['flight_duration'])
                queryset = queryset.filter(flight_duration=duration)
            except (ValueError, TypeError):
                pass
            
        # Filter by takeoffs
        if params.get('takeoffs'):
            try:
                takeoffs = int(params['takeoffs'])
                queryset = queryset.filter(takeoffs=takeoffs)
            except (ValueError, TypeError):
                pass
                
        # Filter by landings
        if params.get('landings'):
            try:
                landings = int(params['landings'])
                queryset = queryset.filter(landings=landings)
            except (ValueError, TypeError):
                pass
            
        # Filter by UAV id
        if params.get('uav'):
            queryset = queryset.filter(uav__uav_id=params['uav'])
            
        # Filter by light conditions
        if params.get('light_conditions'):
            queryset = queryset.filter(light_conditions=params['light_conditions'])
            
        # Filter by ops conditions
        if params.get('ops_conditions'):
            queryset = queryset.filter(ops_conditions=params['ops_conditions'])
            
        # Filter by pilot type
        if params.get('pilot_type'):
            queryset = queryset.filter(pilot_type=params['pilot_type'])
            
        # Text search in comments
        if params.get('comments'):
            queryset = queryset.filter(comments__icontains=params['comments'])
        
        return queryset

    @staticmethod
    def get_total_landings(uav_id):
        """Get total landings for a UAV"""
        return FlightLog.objects.filter(uav_id=uav_id).aggregate(total_landings=Sum('landings'))['total_landings'] or 0

    @staticmethod
    def get_total_takeoffs(uav_id):
        """Get total takeoffs for a UAV"""
        return FlightLog.objects.filter(uav_id=uav_id).aggregate(total_takeoffs=Sum('takeoffs'))['total_takeoffs'] or 0

    @staticmethod
    def get_total_flight_hours(uav_id):
        """Get total flight hours for a UAV"""
        total_seconds = FlightLog.objects.filter(uav_id=uav_id).aggregate(
            total_duration=Sum('flight_duration')
        )['total_duration'] or 0
        return total_seconds / 3600  # Convert seconds to hours

    @staticmethod
    def import_logs_from_csv(csv_file, user):
        """Import flight logs from CSV file"""
        try:
            # Decode the file
            csv_data = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_data))
            
            # Statistics tracking
            success_count = 0
            duplicate_count = 0
            unmapped_count = 0
            error_count = 0
            errors = []
            unmapped_models = {}
            
            # Get all UAVs for this user to map model names
            uav_map = {}
            for uav in UAV.objects.filter(user=user).values('uav_id', 'drone_name'):
                uav_map[uav['drone_name']] = uav['uav_id']
            
            # Get existing logs to check for duplicates
            existing_logs = FlightLog.objects.filter(user=user).values('departure_date', 'departure_time', 'uav_id')
            existing_log_keys = set()
            for log in existing_logs:
                if log['departure_date'] and log['departure_time'] and log['uav_id']:
                    key = f"{log['departure_date']}_{log['departure_time']}_{log['uav_id']}"
                    existing_log_keys.add(key)
            
            for row in csv_reader:
                try:
                    # Check if model name can be mapped to UAV
                    model_name = row.get('ModelName', '')
                    if not model_name or model_name not in uav_map:
                        if model_name:
                            if model_name not in unmapped_models:
                                unmapped_models[model_name] = 0
                            unmapped_models[model_name] += 1
                        unmapped_count += 1
                        continue
                    
                    uav_id = uav_map[model_name]
                    
                    # Parse departure date
                    departure_date = row.get('Date', '')
                    if departure_date and not departure_date.strip().startswith('20'):
                        # Try to reformat date if it's not in YYYY-MM-DD format
                        date_parts = departure_date.split('/')
                        if len(date_parts) == 3:
                            month, day, year = date_parts
                            if len(year) == 4:
                                departure_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    
                    departure_time = row.get('Timestamp-TO', '')
                    landing_time = row.get('Timestamp-LDG', '')
                    
                    # Calculate duration
                    duration = 0
                    if row.get('Duration'):
                        try:
                            duration = round(float(row['Duration']))
                        except (ValueError, TypeError):
                            pass
                    
                    # Determine locations
                    depart_lat = row.get('GPS-Arming-Lat', '')
                    depart_lon = row.get('GPS-Arming-Lon', '')
                    departure_place = 'Unknown'
                    if depart_lat and depart_lon and (float(depart_lat) != 0 or float(depart_lon) != 0):
                        departure_place = f"{depart_lat},{depart_lon}"
                    
                    landing_lat = row.get('GPS-Disarming-Lat', '')
                    landing_lon = row.get('GPS-Disarming-Lon', '')
                    landing_place = 'Unknown'
                    if landing_lat and landing_lon and (float(landing_lat) != 0 or float(landing_lon) != 0):
                        landing_place = f"{landing_lat},{landing_lon}"
                    
                    # Check for duplicate
                    log_key = f"{departure_date}_{departure_time}_{uav_id}"
                    if log_key in existing_log_keys:
                        duplicate_count += 1
                        continue
                    
                    # Create flight log
                    flight_log = FlightLog(
                        user=user,
                        uav_id=uav_id,
                        departure_place=departure_place,
                        departure_date=departure_date,
                        departure_time=departure_time,
                        landing_time=landing_time,
                        landing_place=landing_place,
                        flight_duration=duration,
                        takeoffs=1,
                        landings=1,
                        light_conditions='Day',  # Default
                        ops_conditions='VLOS',   # Default
                        pilot_type='PIC',        # Default
                        comments='Imported from CSV'
                    )
                    flight_log.save()
                    success_count += 1
                    existing_log_keys.add(log_key)
                    
                except Exception as e:
                    error_count += 1
                    errors.append(f"Error processing log: {str(e)}")
            
            # Create report message for unmapped models
            unmapped_message = ""
            if unmapped_models:
                unmapped_message = "\n\nSkipped logs for these unmapped UAV models:"
                for model, count in unmapped_models.items():
                    unmapped_message += f"\n- {model}: {count} log(s)"
            
            result = {
                'success_count': success_count,
                'duplicate_count': duplicate_count,
                'unmapped_count': unmapped_count,
                'error_count': error_count,
                'errors': errors,
                'unmapped_message': unmapped_message,
                'total': success_count + duplicate_count + unmapped_count + error_count
            }
            
            return result
            
        except Exception as e:
            return {
                'success_count': 0,
                'duplicate_count': 0,
                'unmapped_count': 0,
                'error_count': 1,
                'errors': [f"Failed to process CSV: {str(e)}"],
                'unmapped_message': "",
                'total': 0
            }
