import os
import json
import csv
import zipfile
import tempfile
from datetime import datetime
from io import StringIO
from django.conf import settings
from django.http import HttpResponse
from ..models import UAV, FlightLog, MaintenanceLog, MaintenanceReminder, FlightGPSLog, UAVConfig
from ..serializers import (UAVSerializer, FlightLogSerializer, 
                         MaintenanceLogSerializer, MaintenanceReminderSerializer, 
                         FlightGPSLogSerializer)

class ExportService:
    @staticmethod
    def export_user_data(user):
        """
        Export drone data (UAVs, flight logs, maintenance logs) as a ZIP file
        that can be imported by other users.
        """
        # Create a temporary file for the ZIP
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
            temp_filename = temp_file.name
        
        try:
            # Create ZIP file
            with zipfile.ZipFile(temp_filename, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Export UAVs and related data
                ExportService._export_uavs(zip_file, user)
                
                # Export UAV configuration files
                ExportService._export_uav_configs(zip_file, user)
                
                # Export flight logs
                ExportService._export_flight_logs(zip_file, user)
                
                # Export maintenance logs and attached files
                ExportService._export_maintenance_logs(zip_file, user)
                
                # Export maintenance reminders
                ExportService._export_maintenance_reminders(zip_file, user)
            
            # Read the ZIP file content
            with open(temp_filename, 'rb') as f:
                zip_content = f.read()
            
            # Delete the temporary file
            os.unlink(temp_filename)
            
            # Generate file name for the download
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"dronelogbook_export_{timestamp}.zip"
            
            # Create the HTTP response with the ZIP file
            response = HttpResponse(zip_content, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        
        except Exception as e:
            # Make sure to clean up the temporary file in case of error
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
            raise e
    
    @staticmethod
    def _export_uavs(zip_file, user):
        """Export UAVs as JSON and CSV"""
        uavs = UAV.objects.filter(user=user)
        if not uavs.exists():
            return
        
        # Export as JSON
        uavs_data = UAVSerializer(uavs, many=True).data
        json_content = json.dumps(uavs_data, indent=2)
        zip_file.writestr('uavs/uavs.json', json_content)
        
        # Export as CSV
        if uavs.exists():
            output = StringIO()
            writer = csv.writer(output)
            
            # Write header row
            header = [
                'uav_id', 'drone_name', 'manufacturer', 'type', 'motors', 
                'motor_type', 'video', 'video_system', 'esc', 'esc_firmware',
                'receiver', 'receiver_firmware', 'flight_controller', 'firmware',
                'firmware_version', 'gps', 'mag', 'baro', 'gyro', 'acc',
                'registration_number', 'serial_number', 'is_active'
            ]
            writer.writerow(header)
            
            # Write data rows
            for uav in uavs:
                row = [
                    uav.uav_id, uav.drone_name, uav.manufacturer, uav.type, uav.motors,
                    uav.motor_type, uav.video, uav.video_system, uav.esc, uav.esc_firmware,
                    uav.receiver, uav.receiver_firmware, uav.flight_controller, uav.firmware,
                    uav.firmware_version, uav.gps, uav.mag, uav.baro, uav.gyro, uav.acc,
                    uav.registration_number, uav.serial_number, uav.is_active
                ]
                writer.writerow(row)
            
            zip_file.writestr('uavs/uavs.csv', output.getvalue())
    
    @staticmethod
    def _export_uav_configs(zip_file, user):
        """Export UAV configuration files as JSON and CSV with the actual files"""
        uav_configs = UAVConfig.objects.filter(user=user)
        if not uav_configs.exists():
            return
        
        # Export as JSON
        try:
            from ..serializers import UAVConfigSerializer
            configs_data = UAVConfigSerializer(uav_configs, many=True).data
            json_content = json.dumps(configs_data, indent=2)
            zip_file.writestr('uav_configs/uav_configs.json', json_content)
        except ImportError:
            # Simplified serialization if UAVConfigSerializer is not available
            configs_data = [{
                'config_id': config.config_id,
                'uav_id': config.uav_id,
                'name': config.name,
                'upload_date': config.upload_date.isoformat(),
                'file': config.file.name if config.file else None
            } for config in uav_configs]
            json_content = json.dumps(configs_data, indent=2)
            zip_file.writestr('uav_configs/uav_configs.json', json_content)
        
        # Export as CSV
        if uav_configs.exists():
            output = StringIO()
            writer = csv.writer(output)
            
            # Write header row
            header = [
                'config_id', 'uav_id', 'drone_name', 'name', 
                'upload_date', 'file_path'
            ]
            writer.writerow(header)
            
            # Write data rows
            for config in uav_configs:
                file_path = config.file.name if config.file else ''
                row = [
                    config.config_id, config.uav_id, config.uav.drone_name, 
                    config.name, config.upload_date, file_path
                ]
                writer.writerow(row)
                
                # Include the actual file if it exists
                if config.file and os.path.exists(config.file.path):
                    file_name = os.path.basename(config.file.name)
                    zip_file.write(config.file.path, f'uav_configs/files/{file_name}')
            
            zip_file.writestr('uav_configs/uav_configs.csv', output.getvalue())
    
    @staticmethod
    def _export_flight_logs(zip_file, user):
        """Export flight logs as JSON and CSV"""
        flight_logs = FlightLog.objects.filter(user=user)
        if not flight_logs.exists():
            return
        
        # Export as JSON
        logs_data = []
        for log in flight_logs:
            log_dict = FlightLogSerializer(log).data
            # UAV-Details ergänzen
            log_dict['uav_id'] = log.uav.uav_id if log.uav else None
            log_dict['uav_drone_name'] = log.uav.drone_name if log.uav else None
            log_dict['uav_manufacturer'] = log.uav.manufacturer if log.uav else None
            log_dict['uav_type'] = log.uav.type if log.uav else None
            logs_data.append(log_dict)
        json_content = json.dumps(logs_data, indent=2)
        zip_file.writestr('flight_logs/flight_logs.json', json_content)
        
        # Export as CSV
        if flight_logs.exists():
            output = StringIO()
            writer = csv.writer(output)
            
            # Write header row
            header = [
                'flightlog_id', 'uav_id', 'uav_drone_name', 'uav_manufacturer', 'uav_type',
                'departure_place', 'departure_date', 'departure_time', 'landing_place', 'landing_time', 'flight_duration',
                'takeoffs', 'landings', 'light_conditions', 'ops_conditions', 'pilot_type', 'comments'
            ]
            writer.writerow(header)
            
            # Write data rows
            for log in flight_logs:
                row = [
                    log.flightlog_id,
                    log.uav.uav_id if log.uav else None,
                    log.uav.drone_name if log.uav else None,
                    log.uav.manufacturer if log.uav else None,
                    log.uav.type if log.uav else None,
                    log.departure_place, log.departure_date, log.departure_time, log.landing_place, log.landing_time,
                    log.flight_duration, log.takeoffs, log.landings, log.light_conditions, log.ops_conditions,
                    log.pilot_type, log.comments
                ]
                writer.writerow(row)
            
            zip_file.writestr('flight_logs/flight_logs.csv', output.getvalue())
            
            # Export GPS logs for each flight log
            for log in flight_logs:
                gps_logs = FlightGPSLog.objects.filter(flight_log=log)
                if gps_logs.exists():
                    gps_data = FlightGPSLogSerializer(gps_logs, many=True).data
                    gps_json = json.dumps(gps_data, indent=2)
                    zip_file.writestr(f'flight_logs/gps_data/flight_{log.flightlog_id}_gps.json', gps_json)
    
    @staticmethod
    def _export_maintenance_logs(zip_file, user):
        """Export maintenance logs as JSON and CSV with associated files"""
        maint_logs = MaintenanceLog.objects.filter(user=user)
        if not maint_logs.exists():
            return
        
        # Export as JSON
        logs_data = MaintenanceLogSerializer(maint_logs, many=True).data
        json_content = json.dumps(logs_data, indent=2)
        zip_file.writestr('maintenance_logs/maintenance_logs.json', json_content)
        
        # Export as CSV
        if maint_logs.exists():
            output = StringIO()
            writer = csv.writer(output)
            
            # Write header row
            header = [
                'maintenance_id', 'uav_id', 'drone_name', 'event_type', 
                'description', 'event_date', 'file_path'
            ]
            writer.writerow(header)
            
            # Write data rows
            for log in maint_logs:
                file_path = log.file.name if log.file else ''
                row = [
                    log.maintenance_id, log.uav_id, log.uav.drone_name, 
                    log.event_type, log.description, log.event_date, file_path
                ]
                writer.writerow(row)
                
                # Include the actual file if it exists
                if log.file and os.path.exists(log.file.path):
                    file_name = os.path.basename(log.file.name)
                    zip_file.write(log.file.path, f'maintenance_logs/files/{file_name}')
            
            zip_file.writestr('maintenance_logs/maintenance_logs.csv', output.getvalue())
    
    @staticmethod
    def _export_maintenance_reminders(zip_file, user):
        """Export maintenance reminders as JSON and CSV"""
        reminders = MaintenanceReminder.objects.filter(uav__user=user)
        if not reminders.exists():
            return
        
        # Export as JSON
        reminders_data = MaintenanceReminderSerializer(reminders, many=True).data
        json_content = json.dumps(reminders_data, indent=2)
        zip_file.writestr('maintenance_reminders/reminders.json', json_content)
        
        # Export as CSV
        if reminders.exists():
            output = StringIO()
            writer = csv.writer(output)
            
            # Write header row
            header = [
                'reminder_id', 'uav_id', 'drone_name', 'component', 
                'last_maintenance', 'next_maintenance', 'reminder_active'
            ]
            writer.writerow(header)
            
            # Write data rows
            for reminder in reminders:
                row = [
                    reminder.reminder_id, reminder.uav_id, reminder.uav.drone_name,
                    reminder.component, reminder.last_maintenance,
                    reminder.next_maintenance, reminder.reminder_active
                ]
                writer.writerow(row)
            
            zip_file.writestr('maintenance_reminders/reminders.csv', output.getvalue())
