from django.db import transaction

class GPSService:
    @staticmethod
    def get_gps_logs(flight_log):
        """Retrieve GPS logs for a flight"""
        from ..models import FlightGPSLog
        return FlightGPSLog.objects.filter(flight_log=flight_log)
    
    @staticmethod
    @transaction.atomic
    def save_gps_data(flight_log, gps_data):
        """Save GPS data for a flight, replacing any existing data"""
        from ..models import FlightGPSLog
        
        # Clear existing GPS data for this flight
        FlightGPSLog.objects.filter(flight_log=flight_log).delete()
        
        # Process and save new GPS data
        gps_logs = []
        
        for point in gps_data:
            gps_log = FlightGPSLog(
                flight_log=flight_log,
                timestamp=point.get('timestamp', 0),
                latitude=point.get('latitude'),
                longitude=point.get('longitude'),
                altitude=point.get('altitude'),
                num_sat=point.get('num_sat'),
                speed=point.get('speed'),
                ground_course=point.get('ground_course')
            )
            gps_logs.append(gps_log)
        
        if gps_logs:
            FlightGPSLog.objects.bulk_create(gps_logs)
            return len(gps_logs)
        
        return 0
    
    @staticmethod
    @transaction.atomic
    def delete_gps_data(flight_log):
        """Delete all GPS data for a flight"""
        from ..models import FlightGPSLog
        
        deleted_count, _ = FlightGPSLog.objects.filter(flight_log=flight_log).delete()
        return deleted_count
