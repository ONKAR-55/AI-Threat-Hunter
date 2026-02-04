from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Threat

@receiver(post_save, sender=Threat)
def broadcast_threat(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "dashboard_users",
            {
                "type": "send_alert",
                "message": {
                    "id": instance.id,
                    "ip": instance.source_ip,
                    "dst_ip": instance.destination_ip,
                    "type": instance.attack_type,
                    "severity": instance.severity,
                    "time": str(instance.timestamp)
                }
            }
        )
