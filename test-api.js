const fetch = require('node-fetch');

async function testApi() {
  try {
    // Test 1: Check if the backend is running
    console.log('Test 1: Checking backend health...');
    const healthResponse = await fetch('http://localhost:8000/');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test 2: Try to login as an employer
    console.log('\nTest 2: Attempting login...');
    const loginResponse = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        username: 'employer@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);
    
    // Test 3: Try to create an internship with the token
    console.log('\nTest 3: Attempting to create internship...');
    const createResponse = await fetch('http://localhost:8000/employers/internships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.access_token}`
      },
      body: JSON.stringify({
        title: 'Test Internship',
        description: 'Test description',
        location: 'Test Location',
        mode: 'remote',
        duration_weeks: 8,
        skills: ['JavaScript', 'React'],
        openings: 1
      })
    });
    
    console.log('Create internship status:', createResponse.status);
    const createData = await createResponse.json().catch(() => ({}));
    console.log('Create internship response:', createData);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi();