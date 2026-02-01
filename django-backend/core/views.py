from django.http import JsonResponse

def home(request):
    return JsonResponse({
        "status": "online",
        "message": "AI Threat Hunter API is running",
        "endpoints": {
            "admin": "/admin/",
            "ingest_log": "/api/ingest-log/",
            "websocket": "/ws/alerts/"
        }
    })
