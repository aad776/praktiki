const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "sendergmail@gmail.com",   // SIRF SENDER
    pass: "APP_PASSWORD"
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;  // 👈 USER KA EMAIL
  const otp = generateOTP();

  // yahan DB me save karo (email + otp)

  // Mock sending if credentials are placeholder
  if (transporter.options.auth.user === "sendergmail@gmail.com") {
      console.log(`[MOCK EMAIL] To: ${email}, OTP: ${otp}`);
      return res.json({ success: true, message: "OTP sent (Mock Mode)" });
  }

  try {
    await transporter.sendMail({
      from: "sendergmail@gmail.com",
      to: email,   // 🔥 YAHI LINE SAB KO ALAG-ALAG MAIL BEJ RAHI HAI
      subject: "Email Verification OTP",
      text: `Your OTP is ${otp}. Valid for 5 minutes.`
    });

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
