from django.urls import path
from . import views

urlpatterns = [
    # Fluggeräte
    path('aircrafts/', views.AircraftListCreateView.as_view(), name='aircraft-list'),
    path('aircrafts/<int:pk>/', views.AircraftDetailView.as_view(), name='aircraft-detail'),

    # Flugstunden
    path('flightlogs/', views.FlightLogListCreateView.as_view(), name='flightlog-list'),
    path('flightlogs/<int:pk>/', views.FlightLogDetailView.as_view(), name='flightlog-detail'),

    # Wartungsprotokolle
    path('maintenance/', views.MaintenanceLogListCreateView.as_view(), name='maintenance-list'),
    path('maintenance/<int:pk>/', views.MaintenanceLogDetailView.as_view(), name='maintenance-detail'),
]
