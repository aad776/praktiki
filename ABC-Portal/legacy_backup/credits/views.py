from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CreditRequest, AuditLog
from .serializers import CreditRequestSerializer

class CreditRequestViewSet(viewsets.ModelViewSet):
    queryset = CreditRequest.objects.all()
    serializer_class = CreditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return CreditRequest.objects.filter(application__student=user)
        elif user.role == 'institute':
            return CreditRequest.objects.all()
        # Admin can see all
        return CreditRequest.objects.all()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        if request.user.role != 'institute':
            return Response({"error": "Only institute can approve"}, status=403)
        
        credit_request = self.get_object()
        credit_request.status = 'APPROVED'
        credit_request.institute_remarks = request.data.get('remarks', '')
        credit_request.save()

        AuditLog.objects.create(
            credit_request=credit_request,
            action_by=request.user,
            action="Approved",
            remarks=credit_request.institute_remarks
        )
        return Response({"status": "Approved"})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        if request.user.role != 'institute':
            return Response({"error": "Only institute can reject"}, status=403)
        
        credit_request = self.get_object()
        credit_request.status = 'REJECTED'
        credit_request.institute_remarks = request.data.get('remarks', '')
        credit_request.save()

        AuditLog.objects.create(
            credit_request=credit_request,
            action_by=request.user,
            action="Rejected",
            remarks=credit_request.institute_remarks
        )
        return Response({"status": "Rejected"})
