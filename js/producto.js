/**
 * Producto del catálogo.
 * El constructor rechaza datos inválidos lanzando un TypeError.
 */
class Producto {
  /**
   * @param {number} id Entero positivo y único dentro del catálogo.
   * @param {string} nombre Texto no vacío.
   * @param {string} categoria Código de categoría no vacío.
   * @param {number} precio Número finito mayor que cero.
   * @param {number} stock Entero no negativo.
   */
  constructor(id, nombre, categoria, precio, stock) {
    const idValido = Number.isInteger(id) && id > 0;
    const nombreValido = typeof nombre === "string" && nombre.trim() !== "";
    const categoriaValida = typeof categoria === "string" && categoria.trim() !== "";
    const precioValido = Number.isFinite(precio) && precio > 0;
    const stockValido = Number.isInteger(stock) && stock >= 0;

    if (!idValido || !nombreValido || !categoriaValida || !precioValido || !stockValido) {
      throw new TypeError("Datos de producto no válidos (id " + id + ")");
    }

    this.id = id;
    this.nombre = nombre.trim();
    this.categoria = categoria.trim();
    this.precio = precio;
    this.stock = stock;
  }

  /**
   * Indica si queda al menos una unidad.
   * @returns {boolean}
   */
  hayStock() {
    return this.stock > 0;
  }

  /**
   * Comprueba si se puede servir una cantidad sin modificar el stock.
   * @param {number} cantidad Entero positivo.
   * @returns {boolean}
   */
  tieneDisponible(cantidad) {
    return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= this.stock;
  }

  /**
   * Descuenta unidades tras una compra confirmada.
   * Modifica el estado del producto solo si la cantidad es válida.
   * @param {number} cantidad Entero positivo que no supere el stock.
   * @returns {boolean} true si se ha descontado, false si no.
   */
  descontarStock(cantidad) {
    if (!this.tieneDisponible(cantidad)) return false;
    this.stock = this.stock - cantidad;
    return true;
  }
}
