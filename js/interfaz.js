/*
 * Creación de nodos del DOM
 * Estas funciones reciben datos y DEVUELVEN un nodo nuevo; no lo insertan en la página
 * ni leen el estado global. Los datos se asignan siempre con textContent, nunca con innerHTML.
 */

/**
 * Crea un elemento con un texto.
 * @param {string} etiqueta Nombre de la etiqueta HTML.
 * @param {string} texto
 * @returns {HTMLElement}
 */
function crearElementoConTexto(etiqueta, texto) {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  return elemento;
}

/**
 * Tarjeta de un producto del catálogo con su campo de cantidad y su botón.
 * El botón no tiene manejador propio: lo atiende la delegación del contenedor (app.js).
 * @param {Producto} producto
 * @returns {HTMLElement} article
 */
function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.classList.add("tarjeta");
  tarjeta.classList.toggle("agotado", !producto.hayStock());
  tarjeta.dataset.id = String(producto.id);

  const titulo = crearElementoConTexto("h3", producto.nombre);
  const categoria = crearElementoConTexto("p", "Categoría: " + nombreCategoria(producto.categoria));
  const precio = crearElementoConTexto("p", "Precio: " + (formatearPrecio(producto.precio) ?? "No disponible"));
  const existencias = crearElementoConTexto("p",
    producto.hayStock() ? "Existencias: " + producto.stock + " unidades" : "Sin existencias");

  const idCampo = "cantidad-" + producto.id;
  const idError = "error-cantidad-" + producto.id;

  const etiqueta = crearElementoConTexto("label", "Cantidad");
  etiqueta.setAttribute("for", idCampo);

  const campo = document.createElement("input");
  campo.type = "number";
  campo.id = idCampo;
  campo.setAttribute("min", "1");
  campo.setAttribute("max", String(producto.stock));
  campo.setAttribute("step", "1");
  campo.setAttribute("required", "");
  campo.setAttribute("aria-describedby", idError);
  campo.value = "1";

  const boton = crearElementoConTexto("button", "Añadir al carrito");
  boton.type = "button";
  boton.dataset.accion = "anadir";

  if (!producto.hayStock()) {
    campo.value = "";
    campo.disabled = true;
    boton.disabled = true;
  }

  const error = document.createElement("small");
  error.id = idError;
  error.classList.add("error");
  error.setAttribute("aria-live", "polite");

  tarjeta.append(titulo, categoria, precio, existencias, etiqueta, campo, " ", boton, error);
  return tarjeta;
}

/**
 * Fila de la tabla del carrito.
 * @param {{productoId:number, cantidad:number}} linea
 * @param {Producto} producto
 * @returns {HTMLTableRowElement}
 */
function crearFilaCarrito(linea, producto) {
  const fila = document.createElement("tr");
  fila.dataset.id = String(producto.id);

  const importe = producto.precio * linea.cantidad;

  const celdaNombre = crearElementoConTexto("td", producto.nombre);
  const celdaCantidad = crearElementoConTexto("td", String(linea.cantidad));
  const celdaPrecio = crearElementoConTexto("td", formatearPrecio(producto.precio) ?? "No disponible");
  const celdaImporte = crearElementoConTexto("td", formatearPrecio(importe) ?? "No disponible");

  const celdaAccion = document.createElement("td");
  const boton = crearElementoConTexto("button", "Retirar");
  boton.type = "button";
  boton.dataset.accion = "retirar";
  boton.setAttribute("aria-label", "Retirar " + producto.nombre + " del carrito");
  celdaAccion.append(boton);

  fila.append(celdaNombre, celdaCantidad, celdaPrecio, celdaImporte, celdaAccion);
  return fila;
}

/**
 * Opción de un select.
 * @returns {HTMLOptionElement}
 */
function crearOpcion(valor, texto) {
  const opcion = crearElementoConTexto("option", texto);
  opcion.value = valor;
  return opcion;
}

/**
 * Entrada del historial con su detalle plegado.
 * El botón de detalle se atiende por delegación desde el contenedor del historial.
 * @param {object} pedido Objeto creado por crearPedido.
 * @returns {HTMLElement} article
 */
function crearEntradaPedido(pedido) {
  const entrada = document.createElement("article");
  entrada.classList.add("pedido");
  entrada.dataset.id = String(pedido.id);

  const titulo = crearElementoConTexto("h3", "Pedido nº " + pedido.id);
  const resumen = crearElementoConTexto("p",
    formatearFecha(pedido.fecha) + " · " + pedido.cliente.nombre + " · "
    + nombreModalidad(pedido.entrega.modalidad) + " · Total: "
    + (formatearPrecio(pedido.total) ?? "No disponible"));

  const idDetalle = "detalle-pedido-" + pedido.id;

  const boton = crearElementoConTexto("button", "Ver detalle");
  boton.type = "button";
  boton.dataset.accion = "detalle";
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-controls", idDetalle);

  const detalle = document.createElement("div");
  detalle.id = idDetalle;
  detalle.classList.add("detalle", "oculto");

  const lista = document.createElement("ul");
  pedido.lineas.forEach(linea => {
    lista.append(crearElementoConTexto("li",
      linea.nombre + ": " + linea.cantidad + " × " + (formatearPrecio(linea.precio) ?? "")
      + " = " + (formatearPrecio(linea.importe) ?? "")));
  });
  detalle.append(lista);

  detalle.append(
    crearElementoConTexto("p", "Correo: " + pedido.cliente.correo),
    crearElementoConTexto("p", "Subtotal: " + (formatearPrecio(pedido.subtotal) ?? "")
      + " · Descuento: " + (formatearPrecio(pedido.descuento) ?? "")
      + " · Total: " + (formatearPrecio(pedido.total) ?? ""))
  );

  if (pedido.entrega.modalidad === "envio") {
    detalle.append(crearElementoConTexto("p",
      "Dirección de envío: " + pedido.entrega.direccion + " (" + pedido.entrega.codigoPostal + ")"));
  }
  if (pedido.observaciones !== "") {
    detalle.append(crearElementoConTexto("p", "Observaciones: " + pedido.observaciones));
  }

  entrada.append(titulo, resumen, boton, detalle);
  return entrada;
}
