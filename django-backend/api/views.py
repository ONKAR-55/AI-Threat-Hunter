from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncHour
from datetime import timedelta
from django.core.cache import cache
import importlib
import requests
import requests
from .models import Threat, BlockedIP, GeneralLog
from .ai_engine import analyze_traffic

@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_log(request):
    log_data = request.data
    
    is_threat = log_data.get('is_threat', False)
    attack_type = log_data.get('type', "AI Detected Anomaly")
    severity = log_data.get('severity', "HIGH")
    src_ip = log_data.get('src_ip')

    # 1. Pass the log to the AI if not explicitly marked as threat
    if not is_threat:
        is_threat = analyze_traffic(log_data)
        
    location = "Unknown"
    if is_threat and src_ip:
        try:
            res = requests.get(f"http://ip-api.com/json/{src_ip}", timeout=2).json()
            if res.get('status') == 'success':
                location = f"{res.get('city', '')}, {res.get('country', '')}".strip(', ')
                if not location:
                     location = "Local Network"
            else:
                location = "Local Network"
        except Exception:
            location = "Unknown"
    
    # 2. If the AI says it's a threat, save it and alert the dashboard
    if is_threat:
        Threat.objects.create(
            source_ip=src_ip,
            destination_ip=log_data.get('dst_ip'),
            location=location,
            attack_type=attack_type,
            severity=severity
        )
        return Response({"status": "Threat Detected & Logged"})
    
    return Response({"status": "Traffic Safe"})

@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_system_log(request):
    """
    Ingests text logs (e.g., from auth.log) into GeneralLog.
    Expected Payload: {"level": "ERROR", "component": "Auth", "message": "..."}
    """
    data = request.data
    
    GeneralLog.objects.create(
        level=data.get('level', 'INFO'),
        component=data.get('component', 'System'),
        message=data.get('message', '')
    )
    
    return Response({"status": "Log Saved"})

@api_view(['GET'])
def get_threats(request):
    threats = Threat.objects.all().order_by('-timestamp').values()
    return Response(list(threats))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    # Retrieve real system metrics
    try:
        import psutil
        cpu_load = f"{psutil.cpu_percent(interval=0.1)}%"
        net_io = psutil.net_io_counters()

        now = timezone.now().timestamp()
        
        last_time = cache.get('last_time')
        last_recv = cache.get('last_recv')
        last_sent = cache.get('last_sent')

        if last_time and last_recv is not None and last_sent is not None:
            time_diff = now - last_time
            if time_diff > 0:
                recv_rate = int((net_io.packets_recv - last_recv) / time_diff)
                sent_rate = int((net_io.packets_sent - last_sent) / time_diff)
            else:
                recv_rate = 0
                sent_rate = 0
        else:
            recv_rate = 0
            sent_rate = 0

        cache.set('last_time', now, 60)
        cache.set('last_recv', net_io.packets_recv, 60)
        cache.set('last_sent', net_io.packets_sent, 60)

        traffic_in = f"{recv_rate}"
        traffic_out = f"{sent_rate}"
    except Exception as e:
        print(f"Stats Error: {e}")
        cpu_load = "N/A"
        traffic_in = "N/A"
        traffic_out = "N/A"

    # 1. Standard Counts
    stats = {
        "total_threats": Threat.objects.filter(attack_type__icontains='AI').count(),
        "high_severity": Threat.objects.filter(severity='CRITICAL').count(),
        "blocked_ips": BlockedIP.objects.filter(unblocked_at__isnull=True).count(),
        "system_load": cpu_load,
        "traffic_in": traffic_in,
        "traffic_out": traffic_out
    }

    # 2. Chart Data: Attacks & Traffic per Hour (Last 24h)
    import random
    trend_data = []
    for i in range(24, -1, -1):
        hour_time = timezone.now() - timedelta(hours=i)
        hour_str = hour_time.strftime("%H:00")
        
        threats_in_hour = Threat.objects.filter(
            timestamp__year=hour_time.year,
            timestamp__month=hour_time.month,
            timestamp__day=hour_time.day,
            timestamp__hour=hour_time.hour
        ).count()
        
        # Simulate network traffic to provide full graph baseline
        simulated_traffic = (threats_in_hour * random.randint(15, 30)) + random.randint(500, 2000)
        
        trend_data.append({
            "time": hour_str,
            "threats": threats_in_hour,
            "traffic": simulated_traffic
        })

    stats['chart_trend'] = trend_data

    # 3. Chart Data: Attack Types (Pie Chart)
    attack_types = Threat.objects.values('attack_type')\
        .annotate(count=Count('id'))\
        .order_by('-count')[:5] # Top 5 types only

    stats['chart_pie'] = [
        {"name": entry['attack_type'], "value": entry['count']}
        for entry in attack_types
    ]

    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blocked_ips(request):
    # Only return currently blocked IPs
    blocked = BlockedIP.objects.filter(unblocked_at__isnull=True).order_by('-blocked_at')
    data = [{"ip": b.ip_address, "reason": b.reason, "date": b.blocked_at} for b in blocked]
    return Response(data)

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
        "attacks": [{"ip": a.source_ip, "dst_ip": a.destination_ip, "location": a.location, "type": a.attack_type, "date": a.timestamp, "severity": a.severity} for a in attacks],
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
