// Run this file using: node test-client.js
// Make sure the server is running first!

fetch("http://localhost:3000/send-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user123@gmail.com" // 👈 jo bhi user dalega
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error("Error:", error));
