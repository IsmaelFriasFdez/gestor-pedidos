/*
 * Lógica de la aplicación SIN acceso al DOM.
 * Todas las funciones reciben sus datos por parámetros y devuelven un resultado.
 * Las únicas que modifican algo son agregarAlCarrito y retirarDelCarrito, que cambian
 * a propósito el array que reciben (igual que agregarNota en la sesión 9).
 */

const PORCENTAJE_DESCUENTO = 10;
const UMBRAL_DESCUENTO = 100;
const MODALIDADES = ["recogida", "envio"];

// Código postal: provincia 01-09, 10-49 o 50-52 seguida de tres cifras.
const PATRON_CP = /^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/;

// Formato básico de correo: algo@algo.algo sin espacios. No demuestra que exista el buzón.
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NOMBRES_CATEGORIA = {
  perifericos: "Periféricos",
  almacenamiento: "Almacenamiento",
  oficina: "Material de oficina"
};

/* ---------- Cálculos económicos ---------- */

/**
 * Suma precio × cantidad de cada línea del carrito.
 * @param {Array<{productoId:number, cantidad:number}>} carrito
 * @param {Producto[]} catalogo
 * @returns {number|null} Subtotal o null si alguna línea no es válida.
 */
function calcularSubtotal(carrito, catalogo) {
  let subtotal = 0;
  for (const linea of carrito) {
    const producto = catalogo.find(p => p.id === linea.productoId);
    if (producto === undefined) return null;
    if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) return null;
    subtotal += producto.precio * linea.cantidad;
  }
  return subtotal;
}

/**
 * Calcula el IMPORTE del descuento (no el precio final).
 * Se aplica solo si el subtotal alcanza o supera el umbral.
 * @param {number} subtotal Importe finito no negativo.
 * @param {number} porcentaje Valor entre 0 y 100 (10 significa 10 %). Por defecto 10.
 * @param {number} umbral Importe mínimo para aplicar el descuento. Por defecto 100.
 * @returns {number|null} Importe del descuento o null si los datos no son válidos.
 */
function calcularDescuento(subtotal, porcentaje = PORCENTAJE_DESCUENTO, umbral = UMBRAL_DESCUENTO) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return null;
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) return null;
  if (subtotal < umbral) return 0;
  return subtotal * porcentaje / 100;
}

/**
 * Reúne subtotal, descuento y total del carrito.
 * @returns {{subtotal:number, descuento:number, total:number}|null}
 */
function calcularTotales(carrito, catalogo) {
  const subtotal = calcularSubtotal(carrito, catalogo);
  if (subtotal === null) return null;
  const descuento = calcularDescuento(subtotal);
  if (descuento === null) return null;
  return { subtotal, descuento, total: subtotal - descuento };
}

/**
 * Total de unidades del carrito.
 * @returns {number}
 */
function contarUnidades(carrito) {
  let unidades = 0;
  carrito.forEach(linea => {
    unidades += linea.cantidad;
  });
  return unidades;
}

/**
 * Redondea a céntimos y sigue devolviendo un número (no una cadena).
 * @param {number} importe
 * @returns {number}
 */
function redondearCentimos(importe) {
  return Math.round(importe * 100) / 100;
}

/* ---------- Formato para mostrar (devuelven texto, no tocan el DOM) ---------- */

/**
 * @param {number} importe Número finito no negativo.
 * @returns {string|null} Por ejemplo "12.50 €", o null si no es válido.
 */
function formatearPrecio(importe) {
  if (!Number.isFinite(importe) || importe < 0) return null;
  return importe.toFixed(2) + " €";
}

/**
 * @param {Date} fecha
 * @returns {string} Fecha y hora en formato español.
 */
function formatearFecha(fecha) {
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function nombreCategoria(codigo) {
  return NOMBRES_CATEGORIA[codigo] ?? codigo;
}

function nombreModalidad(modalidad) {
  return modalidad === "envio" ? "Envío a domicilio" : "Recogida en tienda";
}

/* ---------- Catálogo ---------- */

/**
 * Filtra por nombre (sin distinguir mayúsculas) y por categoría a la vez.
 * @param {Producto[]} catalogo
 * @param {string} texto Texto buscado; vacío equivale a "sin filtro de nombre".
 * @param {string} categoria Código de categoría o "todas".
 * @returns {Producto[]} Array nuevo con referencias a los mismos productos.
 */
function filtrarCatalogo(catalogo, texto, categoria) {
  const busqueda = texto.trim().toLowerCase();
  return catalogo.filter(producto => {
    const coincideNombre = producto.nombre.toLowerCase().includes(busqueda);
    const coincideCategoria = categoria === "todas" || producto.categoria === categoria;
    return coincideNombre && coincideCategoria;
  });
}

/**
 * Lista de categorías distintas del catálogo, en orden de aparición.
 * @returns {string[]}
 */
function obtenerCategorias(catalogo) {
  return catalogo
    .map(producto => producto.categoria)
    .filter((categoria, indice, lista) => lista.indexOf(categoria) === indice);
}

/* ---------- Carrito ---------- */

/**
 * Valida la cantidad que se quiere añadir.
 * @param {number|null} cantidad null si el campo estaba vacío.
 * @param {Producto} producto
 * @param {number} cantidadEnCarrito Unidades de ese producto ya incluidas.
 * @returns {string} Cadena vacía si es válida; si no, el mensaje de error.
 */
function validarCantidadParaCarrito(cantidad, producto, cantidadEnCarrito = 0) {
  if (!producto.hayStock()) return "Producto agotado: no se puede añadir al carrito.";
  if (cantidad === null) return "Indica una cantidad.";
  if (!Number.isInteger(cantidad)) return "La cantidad debe ser un número entero.";
  if (cantidad <= 0) return "La cantidad debe ser mayor que cero.";
  if (!producto.tieneDisponible(cantidadEnCarrito + cantidad)) {
    const disponibles = producto.stock - cantidadEnCarrito;
    return "Stock insuficiente: quedan " + producto.stock + " unidades y ya tienes "
      + cantidadEnCarrito + " en el carrito (puedes añadir " + disponibles + ").";
  }
  return "";
}

/**
 * Añade unidades. Si el producto ya está en el carrito, suma la cantidad
 * en la línea existente en vez de crear otra. Modifica el array recibido.
 */
function agregarAlCarrito(carrito, productoId, cantidad) {
  const linea = carrito.find(l => l.productoId === productoId);
  if (linea !== undefined) {
    linea.cantidad += cantidad;
  } else {
    carrito.push({ productoId, cantidad });
  }
}

/**
 * Retira la línea completa de un producto. Modifica el array recibido.
 * @returns {boolean} true si se ha retirado, false si no existía.
 */
function retirarDelCarrito(carrito, productoId) {
  const linea = carrito.find(l => l.productoId === productoId);
  if (linea === undefined) return false;
  const posicion = carrito.indexOf(linea);
  if (posicion === -1) return false;
  carrito.splice(posicion, 1);
  return true;
}

/**
 * Comprueba, antes de confirmar, que todo el carrito puede servirse con el stock actual.
 * No modifica nada.
 * @returns {string[]} Lista de problemas; vacía si todo es correcto.
 */
function validarStockCarrito(carrito, catalogo) {
  const problemas = [];
  for (const linea of carrito) {
    const producto = catalogo.find(p => p.id === linea.productoId);
    if (producto === undefined) {
      problemas.push("El producto " + linea.productoId + " ya no existe en el catálogo.");
    } else if (!producto.tieneDisponible(linea.cantidad)) {
      problemas.push("Stock insuficiente de " + producto.nombre + ": pides " + linea.cantidad
        + " y quedan " + producto.stock + ".");
    }
  }
  return problemas;
}

/* ---------- Formulario del pedido ---------- */

/**
 * Valida los datos del pedido ya reunidos en un objeto (no lee el DOM).
 * @param {{nombre:string, correo:string, entrega:string, direccion:string,
 *          cp:string, observaciones:string, acepta:boolean}} datos
 * @returns {Array<{campo:string, mensaje:string}>} Errores; vacío si todo es válido.
 */
function validarDatosPedido(datos) {
  const errores = [];

  const nombre = datos.nombre.trim();
  if (nombre === "") {
    errores.push({ campo: "nombre", mensaje: "Escribe tu nombre y apellidos (no valen solo espacios)." });
  } else if (nombre.length < 2 || nombre.length > 60) {
    errores.push({ campo: "nombre", mensaje: "El nombre debe tener entre 2 y 60 caracteres." });
  }

  const correo = datos.correo.trim();
  if (correo === "") {
    errores.push({ campo: "correo", mensaje: "Escribe tu correo electrónico." });
  } else if (!PATRON_CORREO.test(correo)) {
    errores.push({ campo: "correo", mensaje: "El correo debe tener un formato como nombre@dominio.es" });
  }

  // No se confía en el valor del radio: se comprueba que sea una opción admitida.
  if (!MODALIDADES.includes(datos.entrega)) {
    errores.push({ campo: "entrega", mensaje: "Elige recogida o envío." });
  }

  if (datos.entrega === "envio") {
    const direccion = datos.direccion.trim();
    if (direccion.length < 5 || direccion.length > 100) {
      errores.push({ campo: "direccion", mensaje: "La dirección debe tener entre 5 y 100 caracteres." });
    }
    if (!PATRON_CP.test(datos.cp.trim())) {
      errores.push({ campo: "cp", mensaje: "Código postal no válido: cinco cifras y provincia entre 01 y 52." });
    }
  }

  if (datos.observaciones.length > 200) {
    errores.push({ campo: "observaciones", mensaje: "Las observaciones no pueden superar 200 caracteres." });
  }

  if (datos.acepta !== true) {
    errores.push({ campo: "acepta", mensaje: "Debes confirmar que los datos del pedido son correctos." });
  }

  return errores;
}

/* ---------- Pedidos e historial ---------- */

/**
 * Construye el objeto pedido copiando nombre y precio de cada producto en ese momento,
 * de forma que el historial no cambie aunque después cambie el catálogo.
 * No descuenta stock ni modifica ninguna colección.
 * @returns {object|null} Pedido o null si el carrito no es válido.
 */
function crearPedido(id, fecha, datos, carrito, catalogo) {
  if (carrito.length === 0) return null;
  const totales = calcularTotales(carrito, catalogo);
  if (totales === null) return null;

  const lineas = carrito.map(linea => {
    const producto = catalogo.find(p => p.id === linea.productoId);
    return {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: linea.cantidad,
      importe: redondearCentimos(producto.precio * linea.cantidad)
    };
  });

  const esEnvio = datos.entrega === "envio";
  const subtotal = redondearCentimos(totales.subtotal);
  const descuento = redondearCentimos(totales.descuento);

  return {
    id,
    fecha,
    cliente: {
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim()
    },
    entrega: {
      modalidad: datos.entrega,
      direccion: esEnvio ? datos.direccion.trim() : null,
      codigoPostal: esEnvio ? datos.cp.trim() : null
    },
    observaciones: datos.observaciones.trim(),
    lineas,
    subtotal,
    descuento,
    total: redondearCentimos(subtotal - descuento)
  };
}

/**
 * @param {object[]} pedidos
 * @param {string} modalidad "todos", "recogida" o "envio".
 * @returns {object[]} Array nuevo.
 */
function filtrarPedidos(pedidos, modalidad) {
  if (modalidad === "todos") return pedidos.slice();
  return pedidos.filter(pedido => pedido.entrega.modalidad === modalidad);
}

/**
 * Número de pedidos y suma de sus totales. Con un array vacío devuelve 0 y 0 (nunca NaN).
 * @returns {{cantidad:number, importe:number}}
 */
function calcularResumenHistorial(pedidos) {
  let importe = 0;
  pedidos.forEach(pedido => {
    importe += pedido.total;
  });
  return { cantidad: pedidos.length, importe: redondearCentimos(importe) };
}
