from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import CustomAuthToken, StudentDashboard, CompanyDashboard, InstituteDashboard
from internships.views import InternshipViewSet, ApplicationViewSet
from credits.views import CreditRequestViewSet
from analytics.views import ExportCSV, ExportPDF, ExportChart

router = DefaultRouter()
router.register(r'internships', InternshipViewSet)
router.register(r'applications', ApplicationViewSet)
router.register(r'credit-requests', CreditRequestViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login/', CustomAuthToken.as_view()),
    path('api/dashboard/student/', StudentDashboard.as_view()),
    path('api/dashboard/company/', CompanyDashboard.as_view()),
    path('api/dashboard/institute/', InstituteDashboard.as_view()),
    path('api/export/csv/', ExportCSV.as_view()),
    path('api/export/pdf/', ExportPDF.as_view()),
    path('api/export/chart/', ExportChart.as_view()),
]
