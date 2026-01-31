from django.urls import path
from . import views

urlpatterns = [
    path('ingest-log/', views.ingest_log, name='ingest_log'),
]
