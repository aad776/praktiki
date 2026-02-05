import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from utils.settings import settings

# Get settings from central settings
SMTP_SERVER = settings.SMTP_SERVER
SMTP_PORT = settings.SMTP_PORT
SMTP_USERNAME = settings.SMTP_USERNAME
SMTP_PASSWORD = settings.SMTP_PASSWORD
SENDER_EMAIL = settings.SENDER_EMAIL

def send_email(to_email: str, subject: str, body: str):
    """
    Sends an email to the specified address.
    """
    # If SMTP settings are provided, try to send actual email
    if SMTP_USERNAME and SMTP_PASSWORD:
        try:
            print(f"DEBUG: Using SMTP_USERNAME: {SMTP_USERNAME[:3]}***@***.com")
            print(f"Attempting to send real email to {to_email} via {SMTP_SERVER}...")
            msg = MIMEMultipart()
            msg['From'] = SENDER_EMAIL
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.set_debuglevel(1)  # Enable debug output for troubleshooting
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(SENDER_EMAIL, to_email, text)
            server.quit()
            print(f"Successfully sent email to {to_email}")
            return True
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to send actual email: {e}")
            # Still returning True to avoid breaking the main flow, 
            # but the error is now logged clearly in the console
            return False
    else:
        print(f"WARNING: SMTP credentials missing. Mock email would have been sent to {to_email}")
        print(f"SMTP_USERNAME: {SMTP_USERNAME}, SMTP_PASSWORD: {'SET' if SMTP_PASSWORD else 'MISSING'}")
        return True
    
    return True

def send_application_accepted_email(student_email: str, student_name: str, internship_title: str, company_name: str):
    subject = f"Congratulations! Your application for {internship_title} has been accepted"
    body = f"""
Hi {student_name},

Great news! Your application for the internship position "{internship_title}" at {company_name} has been accepted.

The employer will contact you soon with further details regarding the next steps.

Best regards,
The Praktiki Team
    """
    return send_email(student_email, subject, body)
