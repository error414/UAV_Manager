import csv
from datetime import datetime
from django.db.models import Q, Sum, Count
from ..models import UAV, FlightLog, MaintenanceReminder

class UAVService:
    @staticmethod
    def get_uav_queryset(user, query_params=None):
        """Filter UAV queryset based on user and query parameters"""
        queryset = UAV.objects.filter(user=user)
        
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
        
        return queryset

    @staticmethod
    def update_maintenance_reminders(uav, data):
        """Create or update maintenance reminders for a UAV"""
        components = ['props', 'motor', 'frame']
        
        for component in components:
            maint_date_key = f'{component}_maint_date'
            reminder_date_key = f'{component}_reminder_date'
            
            if maint_date_key in data and data[maint_date_key]:
                # Update or create the maintenance reminder
                reminder, created = MaintenanceReminder.objects.update_or_create(
                    uav=uav,
                    component=component,
                    defaults={
                        'last_maintenance': data[maint_date_key],
                        'next_maintenance': data.get(reminder_date_key) or data[maint_date_key],
                        'reminder_active': True
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
                    
                    # Check for duplicates
                    serial_number = row.get('serial_number')
                    if serial_number:
                        existing_uav = UAV.objects.filter(user=user, serial_number=serial_number).first()
                        if existing_uav:
                            results['duplicate_count'] += 1
                            duplicates.append(serial_number)
                            continue
                    
                    # Convert motors to int
                    try:
                        motors = int(row.get('motors', 0))
                    except ValueError:
                        motors = 0
                    
                    # Create UAV object
                    uav = UAV(
                        user=user,
                        drone_name=row.get('drone_name', ''),
                        manufacturer=row.get('manufacturer', ''),
                        type=row.get('type', ''),
                        motors=motors,
                        motor_type=row.get('motor_type', ''),
                        registration_number=row.get('registration_number', ''),
                        serial_number=serial_number,
                    )
                    uav.save()
                    results['success_count'] += 1
                    
                except Exception as e:
                    results['error_count'] += 1
                    results['errors'].append(f"Row {row_num}: {str(e)}")
            
            if duplicates:
                results['duplicate_message'] = f"Duplicates found with serial numbers: {', '.join(duplicates)}"
                
            return results
        except Exception as e:
            results['error_count'] += 1
            results['errors'].append(f"Error processing file: {str(e)}")
            return results


class FlightLogService:
    @staticmethod
    def get_flightlog_queryset(user, query_params=None):
        """Filter FlightLog queryset based on user and query parameters"""
        queryset = FlightLog.objects.filter(user=user)
        
        # Add filtering if needed
        if query_params:
            uav_id = query_params.get('uav')
            if uav_id:
                queryset = queryset.filter(uav_id=uav_id)
                
            date_from = query_params.get('date_from')
            if date_from:
                queryset = queryset.filter(departure_date__gte=date_from)
                
            date_to = query_params.get('date_to')
            if date_to:
                queryset = queryset.filter(departure_date__lte=date_to)
        
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
            'unmapped_message': ''
        }
        
        unmapped_uavs = set()
        
        try:
            csv_text = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(csv_text.splitlines())
            
            for row_num, row in enumerate(csv_reader, start=2):
                results['total'] += 1
                
                try:
                    # Try to find the UAV
                    uav_identifier = row.get('uav_serial', '') or row.get('drone_name', '')
                    
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
                    
                    # Create flight log
                    flight_log = FlightLog(
                        user=user,
                        uav=uav,
                        departure_place=row.get('departure_place', ''),
                        landing_place=row.get('landing_place', ''),
                        departure_date=row.get('departure_date'),
                        departure_time=row.get('departure_time'),
                        landing_time=row.get('landing_time'),
                        flight_duration=int(row.get('flight_duration', 0)),
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
                
            return results
        except Exception as e:
            results['error_count'] += 1
            results['errors'].append(f"Error processing file: {str(e)}")
            return results
