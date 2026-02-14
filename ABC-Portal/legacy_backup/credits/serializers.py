from rest_framework import serializers
from .models import CreditRequest, AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

class CreditRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='application.student.username', read_only=True)
    internship_title = serializers.CharField(source='application.internship.title', read_only=True)
    logs = AuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = CreditRequest
        fields = '__all__'
