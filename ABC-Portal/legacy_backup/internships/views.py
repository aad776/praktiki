from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Internship, Application
from .serializers import InternshipSerializer, ApplicationSerializer
from credits.models import CreditRequest

class InternshipViewSet(viewsets.ModelViewSet):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company':
            return Internship.objects.filter(company=user)
        return Internship.objects.filter(is_active=True)

class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Application.objects.filter(student=user)
        elif user.role == 'company':
            return Application.objects.filter(internship__company=user)
        return Application.objects.all()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete_internship(self, request, pk=None):
        application = self.get_object()
        if request.user != application.internship.company:
            return Response({"error": "Only the company can mark completion"}, status=403)
        
        hours = request.data.get('hours')
        policy = request.data.get('policy', 'UGC') # Default to UGC if not specified, but maybe should be explicit

        if not hours:
            return Response({"error": "Hours are required"}, status=400)
        
        try:
            hours = int(hours)
        except (ValueError, TypeError):
             return Response({"error": "Invalid hours"}, status=400)
        
        application.status = 'completed'
        application.completed_hours = hours
        application.save()

        # Create Credit Request
        CreditRequest.objects.create(
            application=application,
            policy=policy,
            total_hours=hours,
            status='ASSIGNED' # Ready for Institute review
        )
        
        return Response({"status": "Internship marked completed and credits assigned"})
