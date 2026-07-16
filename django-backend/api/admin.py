from django.contrib import admin
from .models import SuspiciousActivity, BlockedIP, GeneralLog

admin.site.register(SuspiciousActivity)
admin.site.register(BlockedIP)
admin.site.register(GeneralLog)
