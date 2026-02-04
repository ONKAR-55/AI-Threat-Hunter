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
    
    return Response({
        "total_threats": Threat.objects.count(),
        "high_severity": Threat.objects.filter(severity='CRITICAL').count(),
        "blocked_ips": BlockedIP.objects.count(),
        "traffic_in": traffic_in,
        "traffic_out": traffic_out
    })

from .models import BlockedIP

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blocked_ips(request):
    blocked = BlockedIP.objects.all().order_by('-blocked_at')
    data = [{"ip": b.ip_address, "reason": b.reason, "date": b.blocked_at} for b in blocked]
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_ip(request):
    ip = request.data.get('ip')
    reason = request.data.get('reason', 'Manual Block')
    
    if not ip:
        return Response({"error": "IP is required"}, status=400)
    
    # 1. Save to Database
    BlockedIP.objects.create(ip_address=ip, reason=reason, blocked_by=request.user)
    
    return Response({"status": f"IP {ip} has been blocked."})
