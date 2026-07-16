from django.db import models

class SuspiciousActivity(models.Model):
    source_ip = models.GenericIPAddressField()
    destination_ip = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=150, default="Unknown", blank=True)
    attack_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20) # LOW, HIGH, CRITICAL
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_threat'
        verbose_name = 'Suspicious Activity'
        verbose_name_plural = 'Suspicious Activities'

    def __str__(self):
        return f"{self.attack_type} from {self.source_ip}"

# Backward-compatibility alias
Threat = SuspiciousActivity

from django.contrib.auth.models import User

class BlockedIP(models.Model):
    ip_address = models.GenericIPAddressField()
    reason = models.CharField(max_length=200, blank=True)
    blocked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    blocked_at = models.DateTimeField(auto_now_add=True)
    
    # NEW FIELDS FOR HISTORY
    status = models.CharField(max_length=20, default='ACTIVE') # ACTIVE, UNBLOCKED
    unblocked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.ip_address} ({self.status})"

class GeneralLog(models.Model):
    LOG_LEVELS = [('INFO', 'Info'), ('WARNING', 'Warning'), ('ERROR', 'Error')]
    
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=10, choices=LOG_LEVELS)
    component = models.CharField(max_length=50) # e.g., "Network", "Auth", "System"
    message = models.TextField()

    def __str__(self):
        return f"{self.timestamp} - {self.message}"
