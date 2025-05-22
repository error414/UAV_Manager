import csv
from datetime import datetime
from django.db.models import Q, Sum, Count, Value, IntegerField
from django.db.models.functions import Coalesce
from ..models import UAV, FlightLog, MaintenanceReminder

class UAVService:
    @staticmethod
    def get_uav_queryset(user, query_params=None):
        """Filter UAV queryset based on user and query parameters"""
        queryset = UAV.objects.filter(user=user)

        # Annotate *before* filtering on aggregated values
        # Use Coalesce to handle cases where there are no flight logs (Sum would be None)
        queryset = queryset.annotate(
            total_takeoffs_agg=Coalesce(Sum('flightlogs__takeoffs'), Value(0), output_field=IntegerField()),
            total_landings_agg=Coalesce(Sum('flightlogs__landings'), Value(0), output_field=IntegerField())
        )

        # Add filtering if needed
        if query_params:
            if 'is_active' in query_params:
                is_active = query_params.get('is_active').lower() == 'true'
                queryset = queryset.filter(is_active=is_active)
            
            # Filter by drone name (partial match)
            if query_params.get('drone_name'):
                queryset = queryset.filter(drone_name__icontains=query_params['drone_name'])
            
            # Filter by manufacturer (partial match)
            if query_params.get('manufacturer'):
                queryset = queryset.filter(manufacturer__icontains=query_params['manufacturer'])
            
            # Filter by type (partial match)
            if query_params.get('type'):
                queryset = queryset.filter(type__icontains=query_params['type'])
            
            # Filter by motors (exact match)
            if query_params.get('motors'):
                try:
                    motors = int(query_params['motors'])
                    queryset = queryset.filter(motors=motors)
                except (ValueError, TypeError):
                    pass
            
            # Filter by motor type (partial match)
            if query_params.get('motor_type'):
                queryset = queryset.filter(motor_type__icontains=query_params['motor_type'])
            
            # Filter by video system (partial match)
            if query_params.get('video_system'):
                queryset = queryset.filter(video_system__icontains=query_params['video_system'])
            
            # Filter by firmware (partial match)
            if query_params.get('firmware'):
                queryset = queryset.filter(firmware__icontains=query_params['firmware'])
            
            # Filter by firmware version (partial match)
            if query_params.get('firmware_version'):
                queryset = queryset.filter(firmware_version__icontains=query_params['firmware_version'])
            
            # Filter by GPS (partial match)
            if query_params.get('gps'):
                queryset = queryset.filter(gps__icontains=query_params['gps'])
            
            # Filter by MAG (partial match)
            if query_params.get('mag'):
                queryset = queryset.filter(mag__icontains=query_params['mag'])
            
            # Filter by BARO (partial match)
            if query_params.get('baro'):
                queryset = queryset.filter(baro__icontains=query_params['baro'])
            
            # Filter by GYRO (partial match)
            if query_params.get('gyro'):
                queryset = queryset.filter(gyro__icontains=query_params['gyro'])
            
            # Filter by ACC (partial match)
            if query_params.get('acc'):
                queryset = queryset.filter(acc__icontains=query_params['acc'])

            # Filter by registration number (partial match)
            if query_params.get('registration_number'):
                queryset = queryset.filter(registration_number__icontains=query_params['registration_number'])
            
            # Filter by serial number (partial match)
            if query_params.get('serial_number'):
                queryset = queryset.filter(serial_number__icontains=query_params['serial_number'])

            # Filter by total_takeoffs (exact match on annotated value)
            if query_params.get('total_takeoffs'):
                try:
                    takeoffs_val = int(query_params['total_takeoffs'])
                    queryset = queryset.filter(total_takeoffs_agg=takeoffs_val)
                except (ValueError, TypeError):
                    pass # Ignore if not a valid integer

            # Filter by total_landings (exact match on annotated value)
            if query_params.get('total_landings'):
                try:
                    landings_val = int(query_params['total_landings'])
                    queryset = queryset.filter(total_landings_agg=landings_val)
                except (ValueError, TypeError):
                    pass # Ignore if not a valid integer
        
        return queryset

    @staticmethod
    def update_maintenance_reminders(uav, data):
        """Create or update maintenance reminders for a UAV"""
        components = ['props', 'motor', 'frame']
        
        for component in components:
            maint_date_key = f'{component}_maint_date'
            reminder_date_key = f'{component}_reminder_date'
            active_key = f'{component}_reminder_active'
            
            if maint_date_key in data and data[maint_date_key]:
                # Update or create die Wartungserinnerung
                MaintenanceReminder.objects.update_or_create(
                    uav=uav,
                    component=component,
                    defaults={
                        'last_maintenance': data[maint_date_key],
                        'next_maintenance': data.get(reminder_date_key) or data[maint_date_key],
                        'reminder_active': data.get(active_key, False)
                    }
                )

    @staticmethod
    def enrich_uav_data(uav_data):
        """Add flight statistics to UAV data."""
        if isinstance(uav_data, list):
            # For a list of UAVs
            for uav in uav_data:
                uav_id = uav['uav_id']
                stats = FlightLogService.get_flight_stats_for_uav(uav_id)
                uav.update(stats)
            return uav_data
        else:
            # For a single UAV
            uav_id = uav_data['uav_id']
            stats = FlightLogService.get_flight_stats_for_uav(uav_id)
            uav_data.update(stats)
            return uav_data

    @staticmethod
    def import_uavs_from_csv(csv_file, user):
        """Import UAVs from CSV file"""
        results = {
            'total': 0,
            'success_count': 0,
            'duplicate_count': 0,
            'error_count': 0,
            'errors': [],
            'duplicate_message': ''
        }
        
        try:
            csv_text = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(csv_text.splitlines())
            
            duplicates = []
            
            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for human-readable row numbers
                results['total'] += 1
                
                try:
                    # Check for required fields
                    required_fields = ['drone_name', 'type', 'motors']
                    for field in required_fields:
                        if not row.get(field):
                            raise ValueError(f"Missing required field: {field}")
                    
                    # Check for duplicate drone_name
                    drone_name = row.get('drone_name')
                    serial_number = row.get('serial_number', '')
                    
                    # Check if drone with same name already exists
                    existing_uav = UAV.objects.filter(user=user, drone_name=drone_name).first()
                    if existing_uav:
                        results['duplicate_count'] += 1
                        duplicates.append(drone_name)
                        continue
                    
                    # Convert motors to int
                    try:
                        motors = int(row.get('motors', 0))
                    except ValueError:
                        motors = 0
                    
                    # Create UAV object with all fields from CSV
                    uav = UAV(
                        user=user,
                        drone_name=drone_name,
                        manufacturer=row.get('manufacturer', ''),
                        type=row.get('type', ''),
                        motors=motors,
                        motor_type=row.get('motor_type', ''),
                        video=row.get('video', ''),
                        video_system=row.get('video_system', ''),
                        esc=row.get('esc', ''),
                        esc_firmware=row.get('esc_firmware', ''),
                        receiver=row.get('receiver', ''),
                        receiver_firmware=row.get('receiver_firmware', ''),
                        flight_controller=row.get('flight_controller', ''),
                        firmware=row.get('firmware', ''),
                        firmware_version=row.get('firmware_version', ''),
                        gps=row.get('gps', ''),
                        mag=row.get('mag', ''),
                        baro=row.get('baro', ''),
                        gyro=row.get('gyro', ''),
                        acc=row.get('acc', ''),
                        registration_number=row.get('registration_number', ''),
                        serial_number=serial_number,
                    )
                    uav.save()
                    results['success_count'] += 1
                    
                except Exception as e:
                    results['error_count'] += 1
                    results['errors'].append(f"Row {row_num}: {str(e)}")
            
            if duplicates:
                results['duplicate_message'] = f"Duplicates found with drone names: {', '.join(duplicates)}"
                
            return results
        except Exception as e:
            results['error_count'] += 1
            results['errors'].append(f"Error processing file: {str(e)}")
            return results


class FlightLogService:
    @staticmethod
    def get_flightlog_queryset(user, query_params=None):
        """Filter FlightLog queryset based on user and query parameters"""
        # Admin-Override: Wenn user.is_staff und 'user' in query_params, dann nach dieser User-ID filtern
        if query_params and hasattr(user, 'is_staff') and user.is_staff and query_params.get('user'):
            queryset = FlightLog.objects.filter(user_id=query_params['user'])
        else:
            queryset = FlightLog.objects.filter(user=user)
        
        # Add filtering if needed
        if query_params:
            # UAV filter - already implemented
            uav_id = query_params.get('uav')
            if uav_id:
                queryset = queryset.filter(uav_id=uav_id)
            
            # Date range filters - already implemented
            date_from = query_params.get('date_from')
            if date_from:
                queryset = queryset.filter(departure_date__gte=date_from)
                
            date_to = query_params.get('date_to')
            if date_to:
                queryset = queryset.filter(departure_date__lte=date_to)
            
            # Add filtering for each field in the flight log
            
            # Text fields (case-insensitive partial match)
            for field in ['departure_place', 'landing_place', 'comments']:
                value = query_params.get(field)
                if value:
                    queryset = queryset.filter(**{f"{field}__icontains": value})
            
            # Time fields - use more flexible matching for time fields
            for field in ['departure_time', 'landing_time']:
                value = query_params.get(field)
                if value:
                    # Add flexible time matching - look for times that contain this value
                    queryset = queryset.filter(**{f"{field}__contains": value})
            
            # Exact match fields for non-time fields
            for field in ['light_conditions', 'ops_conditions', 'pilot_type']:
                value = query_params.get(field)
                if value:
                    queryset = queryset.filter(**{field: value})
            
            # Numeric fields
            for field in ['flight_duration', 'takeoffs', 'landings']:
                value = query_params.get(field)
                if value and value.isdigit():
                    queryset = queryset.filter(**{field: int(value)})
            
            # Date field - departure_date - use more flexible matching for dates
            departure_date = query_params.get('departure_date')
            if departure_date:
                try:
                    # If it's a complete date, use exact match
                    if len(departure_date) == 10 and departure_date.count('-') == 2:
                        queryset = queryset.filter(departure_date=departure_date)
                    # If it looks like a year (4 digits), match by year
                    elif len(departure_date) == 4 and departure_date.isdigit():
                        queryset = queryset.filter(departure_date__year=int(departure_date))
                    # If it looks like a year-month (YYYY-MM)
                    elif len(departure_date) == 7 and departure_date.count('-') == 1:
                        year, month = departure_date.split('-')
                        if year.isdigit() and month.isdigit():
                            queryset = queryset.filter(
                                departure_date__year=int(year),
                                departure_date__month=int(month)
                            )
                    # Otherwise use a contains search on the string representation
                    else:
                        queryset = queryset.filter(departure_date__contains=departure_date)
                except Exception:
                    # If any error occurs, use a simple contains filter as fallback
                    queryset = queryset.filter(departure_date__contains=departure_date)
            
        return queryset
        
    @staticmethod
    def get_flight_stats_for_uav(uav_id):
        """Get flight statistics for a UAV"""
        flight_stats = FlightLog.objects.filter(uav_id=uav_id).aggregate(
            total_flights=Count('flightlog_id'),
            total_flight_time=Sum('flight_duration'),
            total_takeoffs=Sum('takeoffs'),
            total_landings=Sum('landings')
        )
        
        # Handle None values
        stats = {
            'total_flights': flight_stats['total_flights'] or 0,
            'total_flight_time': flight_stats['total_flight_time'] or 0,
            'total_takeoffs': flight_stats['total_takeoffs'] or 0,
            'total_landings': flight_stats['total_landings'] or 0
        }
        
        return stats
    
    @staticmethod
    def import_logs_from_csv(csv_file, user):
        """Import flight logs from CSV file"""
        results = {
            'total': 0,
            'success_count': 0,
            'duplicate_count': 0,
            'unmapped_count': 0,
            'error_count': 0,
            'errors': [],
            'unmapped_message': '',
            'duplicate_message': ''  # Initialize this key
        }
        
        unmapped_uavs = set()
        duplicate_entries = []
        
        try:
            csv_text = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(csv_text.splitlines())
            
            for row_num, row in enumerate(csv_reader, start=2):
                results['total'] += 1
                
                try:
                    # Try to find the UAV
                    uav_identifier = (
                        row.get('uav_serial', '') or
                        row.get('drone_name', '') or
                        row.get('ModelName', '')
                    )
                    
                    uav = None
                    if uav_identifier:
                        # Try to match by serial or name
                        uav = UAV.objects.filter(
                            user=user,
                            serial_number=uav_identifier
                        ).first() or UAV.objects.filter(
                            user=user,
                            drone_name=uav_identifier
                        ).first()
                    
                    if not uav:
                        results['unmapped_count'] += 1
                        unmapped_uavs.add(uav_identifier)
                        continue

                    # Map CSV fields to FlightLog fields
                    # Compose departure_place and landing_place from GPS fields if available
                    if row.get('GPS-Arming-Lat') and row.get('GPS-Arming-Lon'):
                        gps_departure = f"{row.get('GPS-Arming-Lat')},{row.get('GPS-Arming-Lon')}"
                        if gps_departure == "0.000000,0.000000":
                            departure_place = "Unknown"
                        else:
                            departure_place = gps_departure
                    else:
                        departure_place = row.get('departure_place', '') or row.get('Arming', '')
                    if row.get('GPS-Disarming-Lat') and row.get('GPS-Disarming-Lon'):
                        gps_landing = f"{row.get('GPS-Disarming-Lat')},{row.get('GPS-Disarming-Lon')}"
                        if gps_landing == "0.000000,0.000000":
                            landing_place = "Unknown"
                        else:
                            landing_place = gps_landing
                    else:
                        landing_place = row.get('landing_place', '') or row.get('Disarming', '')
                    
                    # Parse date and time values properly to ensure correct comparison
                    departure_date_str = row.get('departure_date') or row.get('Date')
                    departure_time_str = row.get('departure_time') or row.get('Timestamp-TO')
                    landing_time_str = row.get('landing_time') or row.get('Timestamp-LDG')
                    
                    if not departure_date_str or not departure_time_str:
                        raise ValueError("Missing required date or departure time")
                    
                    # Duration in CSV is float seconds, FlightLog expects int seconds
                    duration_val = row.get('flight_duration') or row.get('Duration')
                    try:
                        flight_duration = int(float(duration_val)) if duration_val else 0
                    except Exception:
                        flight_duration = 0
                    
                    # Check if a flight log with the same date, time, and UAV already exists
                    try:
                        existing_log = FlightLog.objects.filter(
                            user=user,
                            uav=uav,
                            departure_date=departure_date_str,
                            departure_time=departure_time_str
                        ).first()

                        if existing_log:
                            # Skip this row as it's a duplicate
                            results['duplicate_count'] += 1
                            duplicate_info = f"{uav.drone_name} - {departure_date_str} {departure_time_str}"
                            duplicate_entries.append(duplicate_info)
                            continue
                    except Exception as e:
                        # If there's an error in the duplicate check, log it and continue with import
                        results['errors'].append(f"Row {row_num}: Error checking for duplicates: {str(e)}")

                    # Create flight log with parsed values
                    flight_log = FlightLog(
                        user=user,
                        uav=uav,
                        departure_place=departure_place,
                        landing_place=landing_place,
                        departure_date=departure_date_str,
                        departure_time=departure_time_str,
                        landing_time=landing_time_str,
                        flight_duration=flight_duration,  # Now flight_duration is defined
                        takeoffs=int(row.get('takeoffs', 1)),
                        landings=int(row.get('landings', 1)),
                        light_conditions=row.get('light_conditions', 'Day'),
                        ops_conditions=row.get('ops_conditions', 'VLOS'),
                        pilot_type=row.get('pilot_type', 'PIC'),
                        comments=row.get('comments', '')
                    )
                    
                    flight_log.save()
                    results['success_count'] += 1
                    
                except Exception as e:
                    results['error_count'] += 1
                    results['errors'].append(f"Row {row_num}: {str(e)}")
            
            if unmapped_uavs:
                results['unmapped_message'] = f"Could not map UAVs with identifiers: {', '.join(unmapped_uavs)}"
            
            if duplicate_entries:
                # Add the first few duplicates to the message (limit to avoid overly long messages)
                max_display = 5
                display_entries = duplicate_entries[:max_display]
                additional = len(duplicate_entries) - max_display
                
                duplicate_msg = f"Skipped {len(duplicate_entries)} duplicate entries: {', '.join(display_entries)}"
                if additional > 0:
                    duplicate_msg += f" and {additional} more"
                results['duplicate_message'] = duplicate_msg
                
            return results
        except Exception as e:
            results['error_count'] += 1
            results['errors'].append(f"Error processing file: {str(e)}")
            return results


