const express = require('express');
const mongoose = require('mongoose');
const Objeto = require('./models/Objeto');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/fictoTrade', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('🟢 Conectado a MongoDB');
}).catch(err => {
  console.error('🔴 Error conectando a MongoDB:', err);
});

const app = express();

// Configuración del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', async (req, res) => {
  const objetos = await Objeto.find();
  res.render('index', {
    title: 'FictoTrade – Inicio',
    objetos,
    error: null
  });
});

// Ruta para crear un nuevo objeto
app.post('/crear', async (req, res) => {
  const { nombre, descripcion, poder } = req.body;

  try {
    const nuevoObjeto = new Objeto({
      nombre,
      descripcion,
      poder: parseInt(poder),
    });
    await nuevoObjeto.save();
    res.redirect('/');
  } catch (err) {
    const objetos = await Objeto.find();
    res.status(400).render('index', {
      title: 'FictoTrade – Error',
      objetos,
      error: err.message,
    });
  }
});

// Ruta para ver detalle de un objeto
app.get('/objeto/:id', async (req, res) => {
  const objeto = await Objeto.findById(req.params.id);
  if (!objeto) return res.status(404).send('Objeto no encontrado');

  res.render('detalle', {
    title: `Detalle de ${objeto.nombre}`,
    objeto,
  });
});

// Ruta para ver formulario de edición
app.get('/editar/:id', async (req, res) => {
  const objeto = await Objeto.findById(req.params.id);
  if (!objeto) return res.status(404).send('Objeto no encontrado');

  res.render('editar', { objeto });
});

// Guardar cambios editados
app.post('/editar/:id', async (req, res) => {
  const { nombre, descripcion, poder } = req.body;

  try {
    const objeto = await Objeto.findById(req.params.id);
    if (!objeto) return res.status(404).send('Objeto no encontrado');

    objeto.nombre = nombre;
    objeto.descripcion = descripcion;
    objeto.poder = parseInt(poder);
    await objeto.save();

    res.redirect(`/objeto/${objeto.id}`);
  } catch (err) {
    res.status(400).send('Error al editar: ' + err.message);
  }
});

// Eliminar objeto
app.post('/eliminar/:id', async (req, res) => {
  await Objeto.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
