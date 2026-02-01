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
