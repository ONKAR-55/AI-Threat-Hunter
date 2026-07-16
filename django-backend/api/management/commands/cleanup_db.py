from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import SuspiciousActivity, GeneralLog

class Command(BaseCommand):
    help = 'Deletes logs and suspicious activities older than 24 hours to keep the dashboard snappy.'

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(hours=24)
        del_suspicious, _ = SuspiciousActivity.objects.filter(timestamp__lt=cutoff).delete()
        del_logs, _ = GeneralLog.objects.filter(timestamp__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {del_suspicious} suspicious activities and {del_logs} logs older than 24 hours.'))
