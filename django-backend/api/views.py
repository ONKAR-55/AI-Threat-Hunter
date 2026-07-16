from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncHour
from datetime import timedelta
from django.core.cache import cache
import requests
from .models import SuspiciousActivity, BlockedIP, GeneralLog

@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_log(request):
    log_data = request.data
    
    attack_type = log_data.get('type', "Anomaly")
    severity = log_data.get('severity', "HIGH")
    src_ip = log_data.get('src_ip')
    dst_ip = log_data.get('dst_ip')

    location = "Unknown"
    if src_ip:
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
    
    # Save it directly to the database (No AI inference here)
    SuspiciousActivity.objects.create(
        source_ip=src_ip,
        destination_ip=dst_ip,
        location=location,
        attack_type=attack_type,
        severity=severity
    )
    return Response({"status": "Suspicious Activity Logged", "location": location})

@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_packet_stats(request):
    """
    Ingests live packet count statistics by protocol and direction (in vs out)
    from the native network sniffer.
    Payload format: {"in": {"TCP": 10, "UDP": 5...}, "out": {"TCP": 8...}}
    """
    data = request.data
    if data and isinstance(data, dict):
        cache.set('packet_stats_in', data.get('in', {}), 120)
        cache.set('packet_stats_out', data.get('out', {}), 120)
    return Response({"status": "Stats updated"})

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
def get_suspicious(request):
    activities = SuspiciousActivity.objects.all().order_by('-timestamp').values()
    return Response(list(activities))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    recv_rate = 0
    sent_rate = 0
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
                recv_rate = 10
                sent_rate = 0
        else:
            recv_rate = 30
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
    suspicious_count = SuspiciousActivity.objects.count()
    stats = {
        "total_threats": suspicious_count, # Backwards compatibility alias
        "total_suspicious": suspicious_count,
        "high_severity": SuspiciousActivity.objects.filter(severity='CRITICAL').count(),
        "blocked_ips": BlockedIP.objects.filter(unblocked_at__isnull=True).count(),
        "system_load": cpu_load,
        "traffic_in": traffic_in,
        "traffic_out": traffic_out
    }

    # 2. Chart Data: Suspicious Activities & Traffic per Hour (Last 24h)
    trend_data = []
    
    for i in range(24, -1, -1):
        hour_time = timezone.now() - timedelta(hours=i)
        hour_str = hour_time.strftime("%H:00")
        
        suspicious_in_hour = SuspiciousActivity.objects.filter(
            timestamp__year=hour_time.year,
            timestamp__month=hour_time.month,
            timestamp__day=hour_time.day,
            timestamp__hour=hour_time.hour
        ).count()
        
        real_traffic = recv_rate + sent_rate if (recv_rate > 0 or sent_rate > 0) else 0

        trend_data.append({
            "time": hour_str,
            "threats": suspicious_in_hour,
            "suspicious": suspicious_in_hour,
            "traffic": int(real_traffic) if i == 0 else 0
        })

    stats['chart_trend'] = trend_data

    # 3. Chart Data: 2 Donut Charts for Packet Types Receiving (in) & Sending (out)
    default_pie_in = [
        {"name": "TCP", "value": 450},
        {"name": "UDP", "value": 180},
        {"name": "HTTP/S", "value": 320},
        {"name": "FTP", "value": 40},
        {"name": "ICMP", "value": 15},
        {"name": "DNS", "value": 90}
    ]
    default_pie_out = [
        {"name": "TCP", "value": 310},
        {"name": "UDP", "value": 140},
        {"name": "HTTP/S", "value": 280},
        {"name": "FTP", "value": 10},
        {"name": "ICMP", "value": 5},
        {"name": "DNS", "value": 75}
    ]

    raw_in = cache.get('packet_stats_in')
    raw_out = cache.get('packet_stats_out')

    if raw_in and isinstance(raw_in, dict) and len(raw_in) > 0:
        stats['chart_pie_in'] = [{"name": k, "value": v} for k, v in raw_in.items() if v > 0]
    else:
        stats['chart_pie_in'] = default_pie_in

    if raw_out and isinstance(raw_out, dict) and len(raw_out) > 0:
        stats['chart_pie_out'] = [{"name": k, "value": v} for k, v in raw_out.items() if v > 0]
    else:
        stats['chart_pie_out'] = default_pie_out

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
    # 1. Suspicious Activity History
    attacks = SuspiciousActivity.objects.all().order_by('-timestamp')[:50] # Last 50 activities
    
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
    Clears history based on category: 'attacks', 'suspicious', 'blocks', 'logs'
    """
    category = request.data.get('type') # Frontend sends 'attacks', 'blocks', 'logs' or 'ALL'
    
    deleted_count = 0
    
    if category in ['attacks', 'THREAT', 'suspicious', 'SUSPICIOUS']:
        count, _ = SuspiciousActivity.objects.all().delete()
        deleted_count = count
        
    elif category == 'blocks' or category == 'BLOCKED':
        count, _ = BlockedIP.objects.all().delete()
        deleted_count = count

    elif category == 'logs':
        count, _ = GeneralLog.objects.all().delete()
        deleted_count = count
        
    elif category == 'ALL':
        c1, _ = SuspiciousActivity.objects.all().delete()
        c2, _ = BlockedIP.objects.all().delete()
        c3, _ = GeneralLog.objects.all().delete()
        deleted_count = c1 + c2 + c3
        
    else:
        return Response({"error": "Invalid category"}, status=400)
        
    return Response({"status": f"Cleared {deleted_count} records."})
