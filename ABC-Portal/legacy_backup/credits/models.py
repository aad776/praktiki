from django.db import models
from django.conf import settings
from internships.models import Application

class CreditRequest(models.Model):
    POLICY_CHOICES = (
        ('UGC', 'UGC (30h = 1 Credit)'),
        ('AICTE', 'AICTE (40h = 1 Credit)'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ASSIGNED', 'Assigned'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('REVOKED', 'Revoked'),
    )

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='credit_request')
    policy = models.CharField(max_length=10, choices=POLICY_CHOICES)
    total_hours = models.IntegerField()
    calculated_credits = models.FloatField(editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    institute_remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calculate credits based on policy
        if self.policy == 'UGC':
            self.calculated_credits = round(self.total_hours / 30, 2)
        elif self.policy == 'AICTE':
            self.calculated_credits = round(self.total_hours / 40, 2)
        else:
            self.calculated_credits = 0.0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.application.student} - {self.calculated_credits} Credits ({self.status})"

class AuditLog(models.Model):
    credit_request = models.ForeignKey(CreditRequest, on_delete=models.CASCADE, related_name='logs')
    action_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50) # e.g., "Approved", "Rejected"
    timestamp = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.action} on {self.credit_request} by {self.action_by}"
