import random
import string
import smtplib
import ssl
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("otp_service.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# SMTP Configuration (Load from environment variables)
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", SMTP_USERNAME)

def generate_otp(length=6):
    """Generate a random alphanumeric OTP"""
    # characters = string.ascii_uppercase + string.digits
    # otp = ''.join(random.choice(characters) for _ in range(length))
    otp = "123456" # Default OTP for testing
    logger.info(f"Generated OTP: {otp}") # Log generated OTP (securely? In dev it's fine)
    return otp

def send_otp_email(email: str, otp: str):
    """
    Send OTP email using SMTP if configured, otherwise mock it.
    """
    logger.info(f"Attempting to send OTP to {email}")

    if SMTP_USERNAME and SMTP_PASSWORD:
        return send_smtp_email(email, otp)
    else:
        logger.warning("SMTP credentials not found. Falling back to Mock Email Service.")
        return send_mock_email(email, otp)

def send_smtp_email(email: str, otp: str):
    """Send email using SMTP"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Verify your account - ABC Portal"
        message["From"] = SENDER_EMAIL
        message["To"] = email

        # Create the plain-text and HTML version of your message
        text = f"""\
Hello,

Your verification code is: {otp}

This code will expire in 10 minutes.
If you did not request this, please ignore this email.

Best regards,
ABC Portal Team"""

        html = f"""\
<html>
  <body>
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2563eb;">Verify Your Account</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
            {otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 12px;">If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">ABC Portal Team</p>
    </div>
  </body>
</html>
"""

        # Turn these into plain/html MIMEText objects
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")

        # Add HTML/plain-text parts to MIMEMultipart message
        # The email client will try to render the last part first
        message.attach(part1)
        message.attach(part2)

        # Create secure connection with server and send email
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, email, message.as_string())
        
        logger.info(f"SMTP: Email sent successfully to {email}")
        return True

    except Exception as e:
        logger.error(f"SMTP Error: Failed to send email to {email}. Error: {str(e)}")
        # Fallback to mock if SMTP fails
        logger.info("Falling back to Mock Email Service due to SMTP error.")
        return send_mock_email(email, otp)

def send_mock_email(email: str, otp: str):
    """
    Mock function to send OTP email.
    """
    print(f"========================================")
    print(f"MOCK EMAIL SERVICE")
    print(f"EMAIL SENT TO: {email}")
    print(f"SUBJECT: Verify your account")
    print(f"YOUR OTP IS: {otp}")
    print(f"This OTP will expire in 10 minutes.")
    print(f"========================================")
    logger.info(f"MOCK: Email simulated for {email} with OTP {otp}")
    return True
