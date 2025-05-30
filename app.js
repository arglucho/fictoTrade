const express = require('express');
const mongoose = require('mongoose');
const Objeto = require('./models/Objeto');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Usuario = require('./models/Usuario'); // modelo de usuarios

const app = express();

// 📦 Conexión a la base de datos
mongoose.connect('mongodb://localhost:27017/fictoTrade', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('🟢 Conectado a MongoDB');
}).catch(err => {
  console.error('🔴 Error conectando a MongoDB:', err);
});

// ⚙️ Configuración del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 📄 Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 Sesiones y flash
app.use(session({
  secret: 'secreto-fictotrade',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// 🔑 Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await Usuario.findOne({ username });
  if (!user) return done(null, false, { message: 'Usuario no encontrado' });

  const valid = await user.comparePassword(password);
  if (!valid) return done(null, false, { message: 'Contraseña incorrecta' });

  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await Usuario.findById(id);
  done(null, user);
});

// 🌐 Middleware global para las vistas
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// 🔒 Middleware para rutas privadas
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Necesitás iniciar sesión para acceder.');
  res.redirect('/login');
}

// 🏠 Ruta principal (pública)
app.get('/', async (req, res) => {
  const objetos = await Objeto.find();
  res.render('index', {
    title: 'FictoTrade – Inicio',
    objetos
  });
});

// 🔐 Rutas de login/registro
app.get('/login', (req, res) => {
  res.render('auth', { 
    title: 'Ingresar o Registrarse',
    errorFrom: req.flash('errorFrom')[0] || null
  });
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info.message);
      req.flash('errorFrom', 'login'); // <-- aquí seteamos errorFrom
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/perfil');
    });
  })(req, res, next);
});

app.post('/registro', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existe = await Usuario.findOne({ username });
    if (existe) {
      req.flash('error', 'El usuario ya existe');
      return res.redirect('/login');
    }

    const nuevoUsuario = new Usuario({ username, password });
    await nuevoUsuario.save();
    req.flash('success', 'Registro exitoso. Iniciá sesión.');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'Error al registrar usuario');
    res.redirect('/login');
  }
});

// 🚪 Logout (GET para poder usar desde botón o enlace)
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', 'Cerraste sesión correctamente.');
    res.redirect('/');
  });
});

// 👤 Ruta de perfil (privada)
app.get('/perfil', isAuthenticated, (req, res) => {
  res.render('perfil', {
    title: 'Tu Perfil',
    usuario: req.user
  });
});

// 🔒 Ejemplo de ruta protegida
app.get('/panel', isAuthenticated, (req, res) => {
  res.send(`Hola, ${req.user.username}. Estás en el panel privado.`);
});

// ✍️ CRUD de objetos
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

app.get('/objeto/:id', async (req, res) => {
  const objeto = await Objeto.findById(req.params.id);
  if (!objeto) return res.status(404).send('Objeto no encontrado');

  res.render('detalle', {
    title: `Detalle de ${objeto.nombre}`,
    objeto,
  });
});

app.get('/editar/:id', async (req, res) => {
  const objeto = await Objeto.findById(req.params.id);
  if (!objeto) return res.status(404).send('Objeto no encontrado');

  res.render('editar', { objeto });
});

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

app.post('/eliminar/:id', async (req, res) => {
  await Objeto.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
