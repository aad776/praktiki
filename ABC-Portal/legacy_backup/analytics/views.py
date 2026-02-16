import csv
import io
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from credits.models import CreditRequest
from django.db.models import Sum

# For PDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

# For Charts
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

class ExportCSV(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'institute':
            return Response({"error": "Unauthorized"}, status=403)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="credits_registry.csv"'

        writer = csv.writer(response)
        writer.writerow(['Student', 'Internship', 'Policy', 'Hours', 'Credits', 'Status', 'Date'])

        credits = CreditRequest.objects.all()
        for c in credits:
            writer.writerow([
                c.application.student.username,
                c.application.internship.title,
                c.policy,
                c.total_hours,
                c.calculated_credits,
                c.status,
                c.updated_at.strftime("%Y-%m-%d")
            ])

        return response

class ExportPDF(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'institute':
            return Response({"error": "Unauthorized"}, status=403)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(Paragraph("Institute Credit Report", styles['Title']))
        elements.append(Paragraph("ABC Credits Internship Portal", styles['Heading2']))
        
        # Summary
        total_credits = CreditRequest.objects.filter(status='APPROVED').aggregate(total=Sum('calculated_credits'))['total'] or 0
        ugc_credits = CreditRequest.objects.filter(status='APPROVED', policy='UGC').aggregate(total=Sum('calculated_credits'))['total'] or 0
        aicte_credits = CreditRequest.objects.filter(status='APPROVED', policy='AICTE').aggregate(total=Sum('calculated_credits'))['total'] or 0
        
        elements.append(Paragraph(f"Total Approved Credits: {total_credits}", styles['Normal']))
        elements.append(Paragraph(f"UGC Credits: {ugc_credits}", styles['Normal']))
        elements.append(Paragraph(f"AICTE Credits: {aicte_credits}", styles['Normal']))
        elements.append(Paragraph(" ", styles['Normal'])) # Spacer

        # Table Data
        data = [['Student', 'Policy', 'Credits', 'Status']]
        credits = CreditRequest.objects.all().order_by('-updated_at')[:20] # Last 20 records
        for c in credits:
            data.append([
                c.application.student.username,
                c.policy,
                str(c.calculated_credits),
                c.status
            ])

        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(t)

        doc.build(elements)
        buffer.seek(0)
        return HttpResponse(buffer, content_type='application/pdf')

class ExportChart(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'institute':
            return Response({"error": "Unauthorized"}, status=403)

        # Data preparation
        ugc_credits = CreditRequest.objects.filter(status='APPROVED', policy='UGC').aggregate(total=Sum('calculated_credits'))['total'] or 0
        aicte_credits = CreditRequest.objects.filter(status='APPROVED', policy='AICTE').aggregate(total=Sum('calculated_credits'))['total'] or 0

        policies = ['UGC', 'AICTE']
        values = [ugc_credits, aicte_credits]

        # Plotting
        plt.figure(figsize=(6, 4))
        plt.bar(policies, values, color=['blue', 'green'])
        plt.title('Credit Distribution by Policy')
        plt.xlabel('Policy')
        plt.ylabel('Total Credits')
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        plt.close()

        return HttpResponse(buffer, content_type='image/png')
