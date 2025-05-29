// models/Objeto.js
class Objeto {
  constructor(nombre, descripcion, poder) {
    this.id = Date.now();
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.poder = poder;
  }
}

module.exports = Objeto;
