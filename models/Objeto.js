// models/Objeto.js
const mongoose = require('mongoose');

const objetoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio.'],
    trim: true,
  },
  descripcion: {
    type: String,
    maxlength: [200, 'La descripción no puede tener más de 200 caracteres.'],
    trim: true,
  },
  poder: {
    type: Number,
    required: [true, 'El poder es obligatorio.'],
    min: [0, 'El poder no puede ser negativo.'],
    validate: {
      validator: Number.isInteger,
      message: 'El poder debe ser un número entero.'
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
}, {
  timestamps: true
});

const Objeto = mongoose.model('Objeto', objetoSchema);
module.exports = Objeto;
