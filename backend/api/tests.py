from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import UAV, FlightLog

User = get_user_model()


class UserAuthenticationTests(APITestCase):
    """Tests für Benutzerregistrierung und Login"""
    
    def test_user_registration(self):
        """Test, ob Benutzerregistrierung funktioniert"""
        url = reverse('user-list')
        data = {
            'email': 'newuser@example.com',
            'password': 'securepassword123',
            're_password': 'securepassword123'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Überprüfen, ob der Benutzer erstellt wurde
        self.assertEqual(User.objects.count(), 1)
        user = User.objects.first()
        self.assertEqual(user.email, 'newuser@example.com')
    
    def test_user_login(self):
        """Test, ob Benutzeranmeldung funktioniert"""
        # Benutzer erstellen
        user = User.objects.create_user(
            email='testuser@example.com',
            password='testpassword123'
        )
        
        # JWT-Token anfordern
        url = reverse('jwt-create')  # Passt dies an deine URL-Konfiguration an
        data = {
            'email': 'testuser@example.com',
            'password': 'testpassword123'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)  # Prüft, ob ein Access-Token zurückgegeben wird


class FlightLogModelTests(TestCase):
    """Tests für das FlightLog-Modell"""
    
    def setUp(self):
        # Test-Benutzer anlegen
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpassword'
        )
        
        # Test-UAV anlegen
        self.uav = UAV.objects.create(
            user=self.user,
            drone_name='Test Drone',
            manufacturer='Test Manufacturer',
            type='Quadcopter',
            motors=4,
            serial_number='TEST123456'
        )
    
    def test_create_flight_log(self):
        """Test, ob ein FlightLog-Eintrag erstellt werden kann"""
        log = FlightLog.objects.create(
            user=self.user,
            uav=self.uav,
            departure_place='Test Location',
            departure_date='2025-03-19',
            departure_time='10:00:00',
            landing_place='Test Location',
            landing_time='10:30:00',
            flight_duration=1800,  # 30 Minuten in Sekunden
            takeoffs=1,
            landings=1,
            light_conditions='Day',
            ops_conditions='VLOS',
            pilot_type='PIC',
            comments='Test flight'
        )
        
        self.assertEqual(log.departure_place, 'Test Location')
        self.assertEqual(log.flight_duration, 1800)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.uav, self.uav)
        
    def test_flight_log_string_representation(self):
        """Test der String-Darstellung des FlightLog-Modells"""
        log = FlightLog.objects.create(
            user=self.user,
            uav=self.uav,
            departure_place='Test Location',
            departure_date='2025-03-19',
            departure_time='10:00:00',
            landing_place='Test Location',
            landing_time='10:30:00',
            flight_duration=1800,
            takeoffs=1,
            landings=1,
            light_conditions='Day',
            ops_conditions='VLOS',
            pilot_type='PIC',
            comments='Test flight'
        )
        
        expected_string = f"FlightLog {log.flightlog_id} for UAV {self.uav}"
        self.assertEqual(str(log), expected_string)


class FlightLogAPITests(APITestCase):
    """Tests für die FlightLog API-Endpunkte"""
    
    def setUp(self):
        # Test-Benutzer anlegen
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpassword'
        )
        
        # Test-UAV anlegen
        self.uav = UAV.objects.create(
            user=self.user,
            drone_name='Test Drone',
            manufacturer='Test Manufacturer',
            type='Quadcopter',
            motors=4,
            serial_number='TEST123456'
        )
        
        # Authentifizierung einrichten
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_create_flight_log_api(self):
        """Test, ob über die API ein FlightLog erstellt werden kann"""
        url = reverse('flightlog-list')
        data = {
            'user': self.user.user_id,
            'uav': self.uav.uav_id,
            'departure_place': 'Test Location',
            'departure_date': '2025-03-19',
            'departure_time': '10:00:00',
            'landing_place': 'Test Location',
            'landing_time': '10:30:00',
            'flight_duration': 1800,
            'takeoffs': 1,
            'landings': 1,
            'light_conditions': 'Day',
            'ops_conditions': 'VLOS',
            'pilot_type': 'PIC',
            'comments': 'Test flight'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Überprüfen, ob der Fluglog erstellt wurde
        self.assertEqual(FlightLog.objects.count(), 1)
        log = FlightLog.objects.first()
        self.assertEqual(log.departure_place, 'Test Location')
        self.assertEqual(log.flight_duration, 1800)
    
    def test_get_flight_logs_api(self):
        """Test, ob FlightLogs über die API abgerufen werden können"""
        # Erstelle einige FlightLogs
        FlightLog.objects.create(
            user=self.user,
            uav=self.uav,
            departure_place='Location 1',
            departure_date='2025-03-19',
            departure_time='10:00:00',
            landing_place='Location 1',
            landing_time='10:30:00',
            flight_duration=1800,
            takeoffs=1,
            landings=1,
            light_conditions='Day',
            ops_conditions='VLOS',
            pilot_type='PIC',
            comments='Flight 1'
        )
        
        FlightLog.objects.create(
            user=self.user,
            uav=self.uav,
            departure_place='Location 2',
            departure_date='2025-03-20',
            departure_time='14:00:00',
            landing_place='Location 2',
            landing_time='14:45:00',
            flight_duration=2700,
            takeoffs=1,
            landings=1,
            light_conditions='Night',
            ops_conditions='VLOS',
            pilot_type='PIC',
            comments='Flight 2'
        )
        
        url = reverse('flightlog-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['departure_place'], 'Location 1')
        self.assertEqual(response.data[1]['departure_place'], 'Location 2')
    
    def test_update_flight_log_api(self):
        """Test, ob ein FlightLog über die API aktualisiert werden kann"""
        log = FlightLog.objects.create(
            user=self.user,
            uav=self.uav,
            departure_place='Original Location',
            departure_date='2025-03-19',
            departure_time='10:00:00',
            landing_place='Original Location',
            landing_time='10:30:00',
            flight_duration=1800,
            takeoffs=1,
            landings=1,
            light_conditions='Day',
            ops_conditions='VLOS',
            pilot_type='PIC',
            comments='Original comment'
        )
        
        url = reverse('flightlog-detail', args=[log.flightlog_id])
        update_data = {
            'user': self.user.user_id,
            'uav': self.uav.uav_id,
            'departure_place': 'Updated Location',
            'departure_date': '2025-03-19',
            'departure_time': '10:00:00',
            'landing_place': 'Updated Location',
            'landing_time': '10:30:00',
            'flight_duration': 1800,
            'takeoffs': 1,
            'landings': 1,
            'light_conditions': 'Day',
            'ops_conditions': 'VLOS',
            'pilot_type': 'PIC',
            'comments': 'Updated comment'
        }
        
        response = self.client.put(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Überprüfen, ob der Fluglog aktualisiert wurde
        log.refresh_from_db()
        self.assertEqual(log.departure_place, 'Updated Location')
        self.assertEqual(log.comments, 'Updated comment')
    
    def test_delete_flight_log_api(self):
        """Test, ob ein FlightLog über die API gelöscht werden kann"""
        log = FlightLog.objects.create(
            user=self.user,
            uav=self.uav,
            departure_place='Test Location',
            departure_date='2025-03-19',
            departure_time='10:00:00',
            landing_place='Test Location',
            landing_time='10:30:00',
            flight_duration=1800,
            takeoffs=1,
            landings=1,
            light_conditions='Day',
            ops_conditions='VLOS',
            pilot_type='PIC',
            comments='Test flight'
        )
        
        url = reverse('flightlog-detail', args=[log.flightlog_id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Überprüfen, ob der Fluglog gelöscht wurde
        self.assertEqual(FlightLog.objects.count(), 0)
    

class FlightLogValidationTests(TestCase):
    """Tests für die Validierung von FlightLog-Feldern"""
    
    def setUp(self):
        # Test-Benutzer anlegen
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpassword'
        )
        
        # Test-UAV anlegen
        self.uav = UAV.objects.create(
            user=self.user,
            drone_name='Test Drone',
            manufacturer='Test Manufacturer',
            type='Quadcopter',
            motors=4,
            serial_number='TEST123456'
        )
        
        # Gültiges FlightLog-Objekt für Tests
        self.valid_flight_log_data = {
            'user': self.user,
            'uav': self.uav,
            'departure_place': 'Test Location',
            'departure_date': '2025-03-19',
            'departure_time': '10:00:00',
            'landing_place': 'Test Location',
            'landing_time': '10:30:00',
            'flight_duration': 1800,
            'takeoffs': 1,
            'landings': 1,
            'light_conditions': 'Day',
            'ops_conditions': 'VLOS',
            'pilot_type': 'PIC',
            'comments': 'Test flight'
        }
    
    def test_valid_flight_log(self):
        """Test, ob ein gültiger FlightLog erstellt werden kann"""
        log = FlightLog.objects.create(**self.valid_flight_log_data)
        self.assertEqual(log.departure_place, 'Test Location')
        self.assertEqual(FlightLog.objects.count(), 1)
    
    def test_light_conditions_validation(self):
        """Test der Validierung für light_conditions"""
        from django.core.exceptions import ValidationError
        
        # Gültigen FlightLog erstellen und validieren
        log = FlightLog(**self.valid_flight_log_data)
        try:
            log.full_clean()  # Sollte keine Exception auslösen
            is_valid = True
        except ValidationError:
            is_valid = False
        
        self.assertTrue(is_valid)
        
        # Ungültiges light_conditions testen
        invalid_data = self.valid_flight_log_data.copy()
        invalid_data['light_conditions'] = 'Invalid'
        
        log = FlightLog(**invalid_data)
        try:
            log.full_clean()
            is_valid = True
        except ValidationError:
            is_valid = False
        
        self.assertFalse(is_valid)
    
    def test_ops_conditions_validation(self):
        """Test der Validierung für ops_conditions"""
        from django.core.exceptions import ValidationError
        
        # Gültigen FlightLog erstellen und validieren
        log = FlightLog(**self.valid_flight_log_data)
        try:
            log.full_clean()
            is_valid = True
        except ValidationError:
            is_valid = False
        
        self.assertTrue(is_valid)
        
        # Ungültiges ops_conditions testen
        invalid_data = self.valid_flight_log_data.copy()
        invalid_data['ops_conditions'] = 'Invalid'
        
        log = FlightLog(**invalid_data)
        try:
            log.full_clean()
            is_valid = True
        except ValidationError:
            is_valid = False
        
        self.assertFalse(is_valid)
    
    def test_pilot_type_validation(self):
        """Test der Validierung für pilot_type"""
        from django.core.exceptions import ValidationError
        
        # Gültigen FlightLog erstellen und validieren
        log = FlightLog(**self.valid_flight_log_data)
        try:
            log.full_clean()
            is_valid = True
        except ValidationError:
            is_valid = False
        
        self.assertTrue(is_valid)
        
        # Ungültiges pilot_type testen
        invalid_data = self.valid_flight_log_data.copy()
        invalid_data['pilot_type'] = 'Invalid'
        
        log = FlightLog(**invalid_data)
        try:
            log.full_clean()
            is_valid = True
        except ValidationError:
            is_valid = False
        
        self.assertFalse(is_valid)