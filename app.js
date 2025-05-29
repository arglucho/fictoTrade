const express = require('express');
const app = express();
const path = require('path');

// Configuración del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos temporal (array)
const objetos = [];
let siguienteId = 1; // contador de IDs únicos

// Ruta principal
app.get('/', (req, res) => {
  res.render('index', {
    title: 'FictoTrade – Inicio',
    objetos,
  });
});

// Ruta para crear un nuevo objeto
app.post('/crear', (req, res) => {
  const { nombre, descripcion, poder } = req.body;
  const nuevoObjeto = {
    id: siguienteId++,
    nombre,
    descripcion,
    poder,
  };
  objetos.push(nuevoObjeto);
  res.redirect('/');
});

// Ruta para ver detalle de un objeto por su ID
app.get('/objeto/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const objeto = objetos.find(obj => obj.id === id);

  if (!objeto) {
    return res.status(404).send('Objeto no encontrado');
  }

  res.render('detalle', {
    title: `Detalle de ${objeto.nombre}`,
    objeto,
  });
});

// Ruta para ver el formulario de edicion
app.get('/editar/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const objeto = objetos.find(o => o.id === id);

  if (!objeto) {
    return res.status(404).send('Objeto no encontrado');
  }

  res.render('editar', { objeto });
});

// Ruta POST para guardar cambios
app.post('/editar/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const objeto = objetos.find(o => o.id === id);

  if (!objeto) {
    return res.status(404).send('Objeto no encontrado');
  }

  objeto.nombre = req.body.nombre;
  objeto.descripcion = req.body.descripcion;
  objeto.poder = parseInt(req.body.poder);

  res.redirect(`/objeto/${id}`);
});

// Ruta para eliminar (POST)
app.post('/eliminar/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = objetos.findIndex(o => o.id === id);

  if (index === -1) {
    return res.status(404).send('Objeto no encontrado');
  }

  objetos.splice(index, 1); // eliminamos el objeto
  res.redirect('/');
});


// 🚀 Arrancar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
