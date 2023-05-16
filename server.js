const qrcode = require('qrcode');
const express = require('express');
const { Client } = require('whatsapp-web.js');
const mysql = require('mysql');

const app = express();

const port = 4000; // Port number

const ipAddress = '0.0.0.0'; // Set to '0.0.0.0' to listen on all available network interfaces

app.use(express.json()); // Parse JSON-encoded bodies

const client = new Client();
client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wsms',
});

connection.connect((error) => {
  if (error) {
    console.error('Error connecting to MySQL database:', error);
  } else {
    console.log('Connected to MySQL database');
  }
});

client.on('qr', async (qr) => {
  const svg = await qrcode.toString(qr, { type: 'svg' });
  // Send the QR code as an SVG image in the HTTP response
  app.get('/qr', (req, res) => {
    res.send(svg);
  });
});

app.get('/login', (req, res) => {
  // Render an HTML page with an empty image tag
  res.send(`
    <html>
      <head>
        <title>WhatsApp QR Code</title>
      </head>
      <body style="text-align: center;">
        <h4>Scan this QR code with WhatsApp Web</h4>
        <img id="qr-code" src="" width="300" height="300">
        <script>
          // Make an HTTP request to the server to get the QR code
          fetch('/qr')
            .then(response => response.text())
            .then(svg => {
              // Set the SVG code as the source of the image
              document.getElementById('qr-code').src = 'data:image/svg+xml;base64,' + btoa(svg);
            });
        </script>
      </body>
    </html>
  `);
});

app.post('/send_sms', (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  const message = req.body.message;
  console.log(phoneNumber);
  // Insert into MySQL database
  const insertQuery = 'INSERT INTO sms (phoneNumber, message) VALUES (?, ?)';
  const insertParams = [phoneNumber, message];

  connection.query(insertQuery, insertParams, (error, results) => {
    if (error) {
      console.error('Error inserting into MySQL database:', error);
      res.status(500).send('Error inserting data');
    } else {
      console.log('Data inserted into MySQL database');

      // Send WhatsApp message
      client.sendMessage(`${phoneNumber}@c.us`, message)
        .then(() => {
          console.log('Message sent successfully');
          res.send('SMS sent');
        })
        .catch((error) => {
          console.error('Error sending message:', error);
          res.status(500).send('Error sending SMS');
        });
    }
  });
});

app.listen(port, ipAddress, () => {
  console.log(`Server is running on http://${ipAddress}:${port}`);
});
