const express = require('express');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 3000;

// temp - move to .env
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

app.use(express.json());

app.get('/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'viewer' },
  ];

  // lodash 4.17.4 - CVE-2019-10744 (CVSS 9.1)
  const result = _.merge({}, users[0], req.query);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`listening on :${PORT}`);
});
