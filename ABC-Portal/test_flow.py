import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'abc_portal.settings')
django.setup()

from users.models import User
from internships.models import Internship, Application
from credits.models import CreditRequest
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

def test_full_flow():
    print(">>> Setting up users...")
    student, _ = User.objects.get_or_create(username='student1', defaults={'role': 'student'})
    student.set_password('password')
    student.save()
    
    company, _ = User.objects.get_or_create(username='company1', defaults={'role': 'company'})
    company.set_password('password')
    company.save()
    
    institute, _ = User.objects.get_or_create(username='institute1', defaults={'role': 'institute'})
    institute.set_password('password')
    institute.save()

    print(f"Company Role: {company.role}")

    client = APIClient()

    # 1. Login
    print(">>> Testing Login...")
    resp = client.post('/api/login/', {'username': 'student1', 'password': 'password'})
    assert resp.status_code == 200
    student_token = resp.data['token']
    
    resp = client.post('/api/login/', {'username': 'company1', 'password': 'password'})
    company_token = resp.data['token']
    
    resp = client.post('/api/login/', {'username': 'institute1', 'password': 'password'})
    institute_token = resp.data['token']

    # 2. Company posts internship
    print(">>> Company posting internship...")
    client.credentials(HTTP_AUTHORIZATION='Token ' + company_token)
    resp = client.post('/api/internships/', {
        'title': 'Python Dev Intern',
        'description': 'Learn Django'
    })
    if resp.status_code != 201:
        print(f"FAILED POST Internship: {resp.status_code}")
        print(resp.data)
    assert resp.status_code == 201
    internship_id = resp.data['id']

    # 3. Student applies
    print(">>> Student applying...")
    client.credentials(HTTP_AUTHORIZATION='Token ' + student_token)
    resp = client.post('/api/applications/', {
        'internship': internship_id
    })
    if resp.status_code != 201:
        print(f"FAILED POST Application: {resp.status_code}")
        print(resp.data)
    assert resp.status_code == 201
    application_id = resp.data['id']

    # 4. Company marks complete (UGC Policy: 30h = 1 Credit. Let's try 60h = 2 Credits)
    print(">>> Company marking complete (60h, UGC)...")
    client.credentials(HTTP_AUTHORIZATION='Token ' + company_token)
    resp = client.post(f'/api/applications/{application_id}/complete_internship/', {
        'hours': 60,
        'policy': 'UGC'
    })
    if resp.status_code != 200:
        print(f"FAILED Complete Internship: {resp.status_code}")
        print(resp.data)
    assert resp.status_code == 200

    # Verify Credit Request created
    cr = CreditRequest.objects.get(application_id=application_id)
    print(f"Credit Request Status: {cr.status}, Hours: {cr.total_hours}, Credits: {cr.calculated_credits}")
    assert cr.calculated_credits == 2.0
    assert cr.status == 'ASSIGNED'

    # 5. Institute Approves
    print(">>> Institute approving...")
    client.credentials(HTTP_AUTHORIZATION='Token ' + institute_token)
    # Find the credit request ID. In a real app, institute lists requests.
    credit_request_id = cr.id
    resp = client.post(f'/api/credit-requests/{credit_request_id}/approve/', {
        'remarks': 'Good job'
    })
    if resp.status_code != 200:
        print(f"FAILED Approve: {resp.status_code}")
        print(resp.data)
    assert resp.status_code == 200
    
    cr.refresh_from_db()
    assert cr.status == 'APPROVED'
    print(f"Credit Request Approved. Status: {cr.status}")

    # 6. Check Analytics (Student Dashboard)
    print(">>> Checking Student Dashboard...")
    client.credentials(HTTP_AUTHORIZATION='Token ' + student_token)
    resp = client.get('/api/dashboard/student/')
    assert resp.status_code == 200
    print("Student Dashboard Data:", resp.data)
    assert resp.data['total_credits'] == 2.0
    assert resp.data['analytics']['UGC'] == 2.0

    # 7. Test AICTE Calculation (40h = 1 Credit)
    print(">>> Testing AICTE Calculation...")
    # Create another internship/app flow quickly
    app2 = Application.objects.create(
        student=student,
        internship=Internship.objects.get(id=internship_id),
        status='applied'
    )
    # Mark complete via direct call to view logic or just create CreditRequest model directly to test calculation
    # Let's use the view to be sure
    client.credentials(HTTP_AUTHORIZATION='Token ' + company_token)
    resp = client.post(f'/api/applications/{app2.id}/complete_internship/', {
        'hours': 120, # 120 / 40 = 3 Credits
        'policy': 'AICTE'
    })
    cr2 = CreditRequest.objects.get(application_id=app2.id)
    print(f"AICTE Test - Hours: 120, Credits: {cr2.calculated_credits}")
    assert cr2.calculated_credits == 3.0

    # 8. Test Exports
    print(">>> Testing Exports (Institute)...")
    client.credentials(HTTP_AUTHORIZATION='Token ' + institute_token)
    
    # CSV
    print("   Testing CSV Export...")
    resp = client.get('/api/export/csv/')
    assert resp.status_code == 200
    assert resp['Content-Type'] == 'text/csv'
    
    # PDF
    print("   Testing PDF Export...")
    resp = client.get('/api/export/pdf/')
    assert resp.status_code == 200
    assert resp['Content-Type'] == 'application/pdf'
    
    # Chart
    print("   Testing Chart Export...")
    resp = client.get('/api/export/chart/')
    assert resp.status_code == 200
    assert resp['Content-Type'] == 'image/png'

    print(">>> ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    try:
        test_full_flow()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
