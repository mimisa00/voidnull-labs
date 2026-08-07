// Simple script to test API login endpoint

(async () => {
  try {
    const url = 'http://localhost:3001/api/auth/login';
    const payload = {
      email: 'test@example.com',
      password: 'password',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response body:', data);
  } catch (err) {
    console.error('Error during request:', err);
  }
})();
