import sys
import os
import logging

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.otp_service import generate_otp, send_otp_email, send_smtp_email

# Configure logging for test
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_email_service")

def test_otp_generation():
    print("\nTesting OTP Generation...")
    otp = generate_otp()
    print(f"Generated OTP: {otp}")
    assert len(otp) == 6
    assert otp.isalnum()
    print("OTP Generation Passed.")

def test_mock_email_sending():
    print("\nTesting Mock Email Sending...")
    # Ensure no SMTP creds are set (or mock them to empty)
    if "SMTP_USERNAME" in os.environ:
        del os.environ["SMTP_USERNAME"]
    
    result = send_otp_email("test@example.com", "123456")
    assert result is True
    print("Mock Email Sending Passed.")

def test_smtp_fallback():
    print("\nTesting SMTP Fallback Logic...")
    # Set fake credentials to force SMTP attempt
    os.environ["SMTP_USERNAME"] = "fake_user"
    os.environ["SMTP_PASSWORD"] = "fake_pass"
    
    # This should try SMTP, fail (connection refused/timeout), log error, and fallback to mock
    # We expect it to return True eventually because of fallback
    print("Attempting to send with fake credentials (expecting SMTP error log)...")
    result = send_otp_email("test@example.com", "654321")
    assert result is True
    print("SMTP Fallback Passed.")

if __name__ == "__main__":
    try:
        test_otp_generation()
        test_mock_email_sending()
        test_smtp_fallback()
        print("\nAll Email Service Tests Passed Successfully!")
    except Exception as e:
        print(f"\nTest Failed: {e}")
        sys.exit(1)
