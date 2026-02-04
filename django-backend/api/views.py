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
            destination_ip=log_data.get('dst_ip'),
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
    # Only return currently blocked IPs
    blocked = BlockedIP.objects.filter(unblocked_at__isnull=True).order_by('-blocked_at')
    data = [{"ip": b.ip_address, "reason": b.reason, "date": b.blocked_at} for b in blocked]
    return Response(data)

from django.utils import timezone

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unblock_ip(request):
    ip = request.data.get('ip')
    if not ip:
        return Response({"error": "IP is required"}, status=400)
    
    # Find active blocks for this IP
    blocks = BlockedIP.objects.filter(ip_address=ip, unblocked_at__isnull=True)
    if not blocks.exists():
        return Response({"error": "IP is not currently blocked"}, status=404)
    
    # Mark them as unblocked
    for b in blocks:
        b.unblocked_at = timezone.now()
        b.status = 'UNBLOCKED'
        b.save()
        
    return Response({"status": f"IP {ip} has been unblocked."})

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

from .models import GeneralLog

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_logs(request):
    # 1. Attack History
    attacks = Threat.objects.all().order_by('-timestamp')[:50] # Last 50 attacks
    
    # 2. Block History (Includes Active AND Unblocked)
    blocks = BlockedIP.objects.all().order_by('-blocked_at')[:50]
    
    # 3. System Logs
    logs = GeneralLog.objects.all().order_by('-timestamp')[:100]

    return Response({
        "attacks": [{"ip": a.source_ip, "type": a.attack_type, "date": a.timestamp, "severity": a.severity} for a in attacks],
        "blocks": [{"ip": b.ip_address, "reason": b.reason, "date": b.blocked_at, "status": b.status} for b in blocks],
        "logs": [{"time": l.timestamp, "level": l.level, "source": l.component, "msg": l.message} for l in logs]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_history(request):
    """
    Clears history based on category: 'attacks', 'blocks', 'logs'
    """
    category = request.data.get('type') # Frontend sends 'attacks', 'blocks', 'logs' or 'ALL'
    
    deleted_count = 0
    
    if category == 'attacks' or category == 'THREAT':
        count, _ = Threat.objects.all().delete()
        deleted_count = count
        
    elif category == 'blocks' or category == 'BLOCKED':
        count, _ = BlockedIP.objects.all().delete()
        deleted_count = count

    elif category == 'logs':
        count, _ = GeneralLog.objects.all().delete()
        deleted_count = count
        
    elif category == 'ALL':
        c1, _ = Threat.objects.all().delete()
        c2, _ = BlockedIP.objects.all().delete()
        c3, _ = GeneralLog.objects.all().delete()
        deleted_count = c1 + c2 + c3
        
    else:
        return Response({"error": "Invalid category"}, status=400)
        
    return Response({"status": f"Cleared {deleted_count} records."})
