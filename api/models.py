from django.db import models

class Threat(models.Model):
    source_ip = models.GenericIPAddressField()
    attack_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20) # LOW, HIGH, CRITICAL
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.attack_type} from {self.source_ip}"
