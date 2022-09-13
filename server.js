const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const services = require('./services');
const { application } = require('express');


const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use(fileUpload());

app.use("/public", express.static("public"));

// Upload Endpoint
app.post('/upload', (req, res) => {
  try {
    if (req.files === null) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const file = req.files.file;

    file.mv(`./public/uploads/${file.name}`, err => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      res.json({ fileName: file.name, filePath: `/uploads/${file.name}` });
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/download', (req, res) => {
  try {
    services.getentry(res);
  } catch (error) {
    res.status(500).send(error);
  }

});

app.get('/localize', (req, res) => {
  try {
    const extracted = services.fromDir();
    if (extracted) {
      services.importEntry(res);
    } else {
      res.status(500).send('File count not be extracted');
    }

  } catch (error) {
    res.status(500).send(error);
  }

});

app.listen(5000, () => console.log('Server Started...'));
