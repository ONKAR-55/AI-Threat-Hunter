from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Threat
from .ai_engine import analyze_traffic

@api_view(['POST'])
def ingest_log(request):
    log_data = request.data
    
    # 1. Pass the log to the AI
    is_threat = analyze_traffic(log_data)
    
    # 2. If the AI says it's a threat, save it and alert the dashboard
    if is_threat:
        Threat.objects.create(
            source_ip=log_data.get('src_ip'),
            attack_type="AI Detected Anomaly", # You can refine this
            severity="HIGH"
        )
        return Response({"status": "Threat Detected & Logged"})
    
    return Response({"status": "Traffic Safe"})
@api_view(['GET'])
def get_threats(request):
    threats = Threat.objects.all().order_by('-timestamp').values()
    return Response(list(threats))

from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    # Dummy data for traffic (until we build the traffic logger)
    traffic_in = "1.2 GB"
    traffic_out = "450 MB"
    
    # Check if BlockedIP model exists, otherwise return 0
    blocked_ips_count = 0
    # if 'BlockedIP' in globals():
    #     blocked_ips_count = BlockedIP.objects.count()
    
    return Response({
        "total_threats": Threat.objects.count(),
        "high_severity": Threat.objects.filter(severity='CRITICAL').count(),
        "blocked_ips": blocked_ips_count,
        "traffic_in": traffic_in,
        "traffic_out": traffic_out
    })
