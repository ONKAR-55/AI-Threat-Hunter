from django.urls import path
from . import views

urlpatterns = [
    path('ingest-log/', views.ingest_log, name='ingest_log'),
    path('threats/', views.get_threats, name='get_threats'),
    path('stats/', views.dashboard_stats, name='dashboard_stats'),
]
