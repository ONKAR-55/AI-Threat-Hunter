from django.urls import path
from . import views

urlpatterns = [
    path('ingest-log/', views.ingest_log, name='ingest_log'),
    path('threats/', views.get_threats, name='get_threats'),
    path('stats/', views.dashboard_stats, name='dashboard_stats'),
    path('blocked/', views.get_blocked_ips, name='get_blocked_ips'),
    path('block-ip/', views.block_ip, name='block_ip'),
]
