const mongoose = require('mongoose');

const objetoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio.'],
    trim: true,
  },
  descripcion: {
    type: String,
    maxlength: [200, 'La descripción no puede tener más de 200 caracteres.']
  },
  poder: {
    type: Number,
    required: [true, 'El poder es obligatorio.'],
    min: [0, 'El poder no puede ser negativo.'],
    validate: {
      validator: Number.isInteger,
      message: 'El poder debe ser un número entero.'
    }
  }
});

const Objeto = mongoose.model('Objeto', objetoSchema);
module.exports = Objeto;
