const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const NOVITA_PATH = path.join(__dirname, 'novita.json');

// Configurazione multer per upload allegati
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'allegati'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const allowedTypes = [
  'application/pdf',
  'image/png',
  'image/jpg',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato allegato non consentito'));
    }
  }
});

app.use(bodyParser.json());
// Assicurati che la cartella allegati esista
if (!fs.existsSync(path.join(__dirname, 'allegati'))) {
  fs.mkdirSync(path.join(__dirname, 'allegati'));
}
app.use(express.static(__dirname));

// API per aggiungere una novità
app.post('/api/novita', upload.single('allegato'), (req, res) => {
  // Dati dal form
  const {
    tipo,
    categoria,
    titolo,
    descrizione,
    testoBottone,
    data,
    riferimenti
  } = req.body;

  // Allegato
  let allegato = null;
  if (req.file) {
    allegato = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: '/allegati/' + req.file.filename
    };
  }

  // Riferimenti: array di stringhe (separati da \n)
  let riferimentiArr = [];
  if (riferimenti) {
    riferimentiArr = riferimenti.split('\n').map(r => r.trim()).filter(r => r);
  }

  const nuovaNovita = {
    tipo,
    categoria,
    titolo,
    descrizione,
    testoBottone,
    data,
    allegato,
    riferimenti: riferimentiArr
  };

  fs.readFile(NOVITA_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Errore lettura file' });
    let novita = [];
    try {
      novita = JSON.parse(data);
    } catch (e) {}
    novita.push(nuovaNovita);
    fs.writeFile(NOVITA_PATH, JSON.stringify(novita, null, 2), err => {
      if (err) return res.status(500).json({ error: 'Errore scrittura file' });
      res.json({ success: true });
    });
  });
});
// Espone la cartella allegati come static
app.use('/allegati', express.static(path.join(__dirname, 'allegati')));

// API per ottenere tutte le novità
app.get('/api/novita', (req, res) => {
  fs.readFile(NOVITA_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Errore lettura file' });
    let novita = [];
    try {
      novita = JSON.parse(data);
    } catch (e) {}
    res.json(novita);
  });
});

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
