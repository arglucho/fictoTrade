// app.js
const express = require('express');
const mongoose = require('mongoose');
const Objeto = require('./models/Objeto');
const Usuario = require('./models/Usuario');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const app = express();

// 📦 Conexión a la base de datos
mongoose.connect('mongodb://localhost:27017/fictoTrade', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('🟢 Conectado a MongoDB'))
.catch(err => console.error('🔴 Error conectando a MongoDB:', err));

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
  try {
    const user = await Usuario.findOne({ username });
    if (!user) return done(null, false, { message: 'Usuario no encontrado' });
    const valid = await user.comparePassword(password);
    if (!valid) return done(null, false, { message: 'Contraseña incorrecta' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Usuario.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// 🌐 Middleware global para las vistas
app.use((req, res, next) => {
  res.locals.currentUser = req.user;           // usuario autenticado
  res.locals.error = req.flash('error');       // mensajes de error
  res.locals.success = req.flash('success');   // mensajes de éxito
  next();
});

// 🔒 Middleware para rutas privadas
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Necesitás iniciar sesión para acceder.');
  res.redirect('/login');
}

// ─── RUTAS ────────────────────────────────────────────────────────────────────

// 1) HOME (página principal) – Solo usuarios logueados
app.get('/', isAuthenticated, (req, res) => {
  res.render('index', {
    title: 'FictoTrade – Inicio'
  });
});

// 2) LOGIN y REGISTER
app.get('/login', (req, res) => {
  res.render('auth', {
    title: 'Ingresa o Registrate',
    errorFrom: req.flash('errorFrom')[0] || null
  });
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info.message);
      req.flash('errorFrom', 'login');
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});

app.post('/registro', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existe = await Usuario.findOne({ username });
    if (existe) {
      req.flash('error', 'Este nombre de usuario ya existe');
      req.flash('errorFrom', 'register');
      return res.redirect('/login');
    }
    const nuevoUsuario = new Usuario({ username, password });
    await nuevoUsuario.save();
    req.flash('success', 'Registro exitoso. Ya puedes iniciar sesion.');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'Error al registrar el usuario');
    res.redirect('/login');
  }
});

// 3) LOGOUT
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', 'Cerraste sesión correctamente.');
    res.redirect('/login');
  });
});

// 4) PERFIL PROPIO – Muestra inventario del usuario logueado
app.get('/perfil', isAuthenticated, async (req, res) => {
  try {
    const inventario = await Objeto.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.render('perfil', {
      title: 'Tu Perfil',
      usuario: req.user,
      inventario
    });
  } catch (err) {
    req.flash('error', 'Error al cargar tu inventario');
    res.redirect('/');
  }
});

// 5) PERFIL DE OTRO USUARIO – Muestra inventario de quien se indique por username
app.get('/perfil/:username', isAuthenticated, async (req, res) => {
  try {
    const userObjetivo = await Usuario.findOne({ username: req.params.username });
    if (!userObjetivo) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/');
    }
    const inventarioOtro = await Objeto.find({ owner: userObjetivo._id }).sort({ createdAt: -1 });
    res.render('perfil', {
      title: `Perfil de ${userObjetivo.username}`,
      usuario: userObjetivo,
      inventario: inventarioOtro
    });
  } catch (err) {
    req.flash('error', 'Error al cargar perfil');
    res.redirect('/');
  }
});

// 6) CREAR OBJETO – Solo para usuarios logueados
app.post('/crear', isAuthenticated, async (req, res) => {
  const { nombre, descripcion, poder } = req.body;
  try {
    const nuevoObjeto = new Objeto({
      nombre,
      descripcion,
      poder: parseInt(poder),
      owner: req.user._id
    });
    await nuevoObjeto.save();
    req.flash('success', 'Objeto creado correctamente.');
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al crear objeto: ' + err.message);
    res.redirect('/');
  }
});

// 7) VER DETALLE DE UN OBJETO – Solo para usuarios logueados
app.get('/objeto/:id', isAuthenticated, async (req, res) => {
  try {
    const objeto = await Objeto.findById(req.params.id).populate('owner', 'username');
    if (!objeto) return res.status(404).send('Objeto no encontrado');
    res.render('detalle', {
      title: `Detalle de ${objeto.nombre}`,
      objeto
    });
  } catch (err) {
    req.flash('error', 'Error al cargar detalle de objeto');
    res.redirect('/');
  }
});

// 8) FORMULARIO DE EDICIÓN – Solo para dueño
app.get('/editar/:id', isAuthenticated, async (req, res) => {
  try {
    const objeto = await Objeto.findById(req.params.id);
    if (!objeto) return res.status(404).send('Objeto no encontrado');
    if (!objeto.owner.equals(req.user._id)) {
      req.flash('error', 'No tenés permisos para editar este objeto');
      return res.redirect(`/perfil/${req.user.username}`);
    }
    res.render('editar', { objeto });
  } catch (err) {
    req.flash('error', 'Error al cargar formulario de edición');
    res.redirect('/');
  }
});

// 9) GUARDAR CAMBIOS EN EDICIÓN – Solo para dueño
app.post('/editar/:id', isAuthenticated, async (req, res) => {
  const { nombre, descripcion, poder } = req.body;
  try {
    const objeto = await Objeto.findById(req.params.id);
    if (!objeto) return res.status(404).send('Objeto no encontrado');
    if (!objeto.owner.equals(req.user._id)) {
      req.flash('error', 'No tenés permisos para editar este objeto');
      return res.redirect(`/perfil/${req.user.username}`);
    }
    objeto.nombre = nombre;
    objeto.descripcion = descripcion;
    objeto.poder = parseInt(poder);
    await objeto.save();
    req.flash('success', 'Objeto modificado correctamente.');
    res.redirect(`/perfil/${req.user.username}`);
  } catch (err) {
    req.flash('error', 'Error al editar: ' + err.message);
    res.redirect(`/perfil/${req.user.username}`);
  }
});

// 10) ELIMINAR OBJETO – Solo para dueño
app.post('/eliminar/:id', isAuthenticated, async (req, res) => {
  try {
    const objeto = await Objeto.findById(req.params.id);
    if (!objeto) {
      req.flash('error', 'Objeto no encontrado');
      return res.redirect(`/perfil/${req.user.username}`);
    }
    if (!objeto.owner.equals(req.user._id)) {
      req.flash('error', 'No tenés permisos para eliminar este objeto');
      return res.redirect(`/perfil/${req.user.username}`);
    }
    await objeto.remove();
    req.flash('success', 'Objeto eliminado correctamente.');
    res.redirect(`/perfil/${req.user.username}`);
  } catch (err) {
    req.flash('error', 'Error al eliminar: ' + err.message);
    res.redirect(`/perfil/${req.user.username}`);
  }
});

// 🚀 Arrancar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
