const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 1, role: 'manager' }, process.env.JWT_SECRET || 'secret');

fetch('http://localhost:5000/manager/tickets', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => res.json()).then(data => {
  console.log("SUCCESS:");
  console.log(JSON.stringify(data, null, 2));
}).catch(err => {
  console.log("ERROR:");
  console.error(err);
});
