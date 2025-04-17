from datetime import datetime
from django.db.models import Q, Sum
from ..models import UAV, FlightLog, MaintenanceReminder

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
