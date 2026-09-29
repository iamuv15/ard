fetch('http://localhost:3000/api/chapters/2', { method: 'DELETE', headers: { 'Cookie': 'admin_session=true' } })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
