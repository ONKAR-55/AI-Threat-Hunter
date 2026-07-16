from django.http import JsonResponse

def home(request):
    return JsonResponse({
        "status": "online",
        "message": "SOC-GUARD Suspicious Activity Monitoring API is running",
        "endpoints": {
            "admin": "/admin/",
            "ingest_log": "/api/ingest-log/",
            "ingest_packet_stats": "/api/ingest-packet-stats/",
            "websocket": "/ws/alerts/"
        }
    })
