/*
 * Estado de la aplicación, funciones que actualizan el DOM y registro de eventos.
 * Las colecciones viven en memoria.
 */

/* ===================== DATOS ===================== */

const datosProductos = [
  { id: 101, nombre: "Ratón USB", categoria: "perifericos", precio: 12.5, stock: 8 },
  { id: 102, nombre: "Teclado", categoria: "perifericos", precio: 24.9, stock: 0 },
  { id: 103, nombre: "Auriculares con micrófono", categoria: "perifericos", precio: 29.99, stock: 6 },
  { id: 201, nombre: "Disco SSD 1 TB", categoria: "almacenamiento", precio: 89.9, stock: 5 },
  { id: 202, nombre: "Memoria USB 64 GB", categoria: "almacenamiento", precio: 9.95, stock: 20 },
  { id: 301, nombre: "Paquete de folios A4", categoria: "oficina", precio: 5.5, stock: 30 },
  { id: 302, nombre: "Silla de oficina", categoria: "oficina", precio: 119, stock: 3 }
];

// El catálogo contiene instancias de Producto. Se comprueba que el id no esté repetido.
const catalogo = [];
datosProductos.forEach(dato => {
  if (catalogo.find(producto => producto.id === dato.id) !== undefined) {
    console.error("Id de producto repetido:", dato.id);
    return;
  }
  try {
    catalogo.push(new Producto(dato.id, dato.nombre, dato.categoria, dato.precio, dato.stock));
  } catch (error) {
    console.error(error.message);
  }
});

const carrito = [];   // [{ productoId, cantidad }]
const pedidos = [];   // objetos creados con crearPedido
let siguienteIdPedido = 1;

// Campos del formulario que el usuario ya ha tocado.
let camposVisitados = new Set();

// Relación entre cada dato validado y el control que muestra su error.
const CAMPOS_PEDIDO = [
  { campo: "nombre", control: "nombre" },
  { campo: "correo", control: "correo" },
  { campo: "entrega", control: "entrega-recogida" },
  { campo: "direccion", control: "direccion" },
  { campo: "cp", control: "cp" },
  { campo: "observaciones", control: "observaciones" },
  { campo: "acepta", control: "acepta" }
];

const FILTROS_HISTORIAL = ["todos", "recogida", "envio"];

/* ===================== REFERENCIAS AL DOM ===================== */

const campoBuscar = document.querySelector("#buscar");
const filtroCategoria = document.querySelector("#filtro-categoria");
const estadoCatalogo = document.querySelector("#catalogo-estado");
const listaCatalogo = document.querySelector("#catalogo-lista");

const avisoCarrito = document.querySelector("#carrito-aviso");
const mensajeCarritoVacio = document.querySelector("#carrito-vacio");
const tablaCarrito = document.querySelector("#tabla-carrito");
const cuerpoCarrito = document.querySelector("#carrito-lineas");
const salidaUnidades = document.querySelector("#resumen-unidades");
const salidaSubtotal = document.querySelector("#resumen-subtotal");
const salidaDescuento = document.querySelector("#resumen-descuento");
const salidaTotal = document.querySelector("#resumen-total");

const formPedido = document.querySelector("#form-pedido");
const campoDireccion = formPedido.elements.namedItem("direccion");
const campoCp = formPedido.elements.namedItem("cp");
const campoObservaciones = formPedido.elements.namedItem("observaciones");
const radioEnvio = document.querySelector("#entrega-envio");
const bloqueEnvio = document.querySelector("#bloque-envio");
const contadorObservaciones = document.querySelector("#contador-observaciones");
const botonConfirmar = document.querySelector("#boton-confirmar");
const estadoPedido = document.querySelector("#pedido-estado");

const filtroHistorial = document.querySelector("#filtro-historial");
const resumenHistorial = document.querySelector("#historial-resumen");
const historialVacio = document.querySelector("#historial-vacio");
const listaHistorial = document.querySelector("#historial-lista");
const botonExportar = document.querySelector("#boton-exportar");
const salidaJson = document.querySelector("#salida-json");
const estadoExportacion = document.querySelector("#exportacion-estado");

/* ===================== FUNCIONES QUE ACTUALIZAN EL DOM ===================== */

function mostrarOpcionesCategoria() {
  obtenerCategorias(catalogo).forEach(categoria => {
    filtroCategoria.append(crearOpcion(categoria, nombreCategoria(categoria)));
  });
}

function mostrarCatalogo() {
  const categoria = filtroCategoria.value;
  listaCatalogo.textContent = "";

  // No se confía en el valor del select: se comprueba que sea una opción admitida.
  const categoriaValida = categoria === "todas" || obtenerCategorias(catalogo).includes(categoria);
  if (!categoriaValida) {
    estadoCatalogo.textContent = "La categoría seleccionada no es válida.";
    return;
  }

  const visibles = filtrarCatalogo(catalogo, campoBuscar.value, categoria);
  if (visibles.length === 0) {
    estadoCatalogo.textContent = "No hay productos que coincidan con la búsqueda y la categoría elegidas.";
    return;
  }

  estadoCatalogo.textContent = "Mostrando " + visibles.length + " de " + catalogo.length + " productos.";
  visibles.forEach(producto => {
    listaCatalogo.append(crearTarjetaProducto(producto));
  });
}

function mostrarCarrito() {
  cuerpoCarrito.textContent = "";
  const vacio = carrito.length === 0;

  mensajeCarritoVacio.classList.toggle("oculto", !vacio);
  tablaCarrito.classList.toggle("oculto", vacio);
  botonConfirmar.disabled = vacio;

  carrito.forEach(linea => {
    const producto = catalogo.find(p => p.id === linea.productoId);
    if (producto !== undefined) {
      cuerpoCarrito.append(crearFilaCarrito(linea, producto));
    }
  });

  salidaUnidades.textContent = String(contarUnidades(carrito));

  const totales = calcularTotales(carrito, catalogo);
  if (totales === null) {
    salidaSubtotal.textContent = "No disponible";
    salidaDescuento.textContent = "No disponible";
    salidaTotal.textContent = "No disponible";
    return;
  }
  salidaSubtotal.textContent = formatearPrecio(totales.subtotal) ?? "No disponible";
  salidaDescuento.textContent = formatearPrecio(totales.descuento) ?? "No disponible";
  salidaTotal.textContent = formatearPrecio(totales.total) ?? "No disponible";
}

function mostrarHistorial() {
  const modalidad = filtroHistorial.value;
  listaHistorial.textContent = "";

  if (!FILTROS_HISTORIAL.includes(modalidad)) {
    resumenHistorial.textContent = "";
    historialVacio.textContent = "El filtro seleccionado no es válido.";
    return;
  }

  const filtrados = filtrarPedidos(pedidos, modalidad);
  const resumen = calcularResumenHistorial(filtrados);

  resumenHistorial.textContent = "Pedidos mostrados: " + resumen.cantidad
    + " · Importe total: " + (formatearPrecio(resumen.importe) ?? "0.00 €");

  if (pedidos.length === 0) {
    historialVacio.textContent = "Todavía no hay pedidos confirmados.";
  } else if (filtrados.length === 0) {
    historialVacio.textContent = "Ningún pedido coincide con el filtro seleccionado.";
  } else {
    historialVacio.textContent = "";
  }

  filtrados.forEach(pedido => {
    listaHistorial.append(crearEntradaPedido(pedido));
  });
}

function actualizarContador() {
  contadorObservaciones.textContent = campoObservaciones.value.length + " / 200 caracteres";
}

/**
 * Muestra u oculta la dirección y el código postal según la modalidad.
 * Con recogida dejan de ser obligatorios, se deshabilitan (no se validan ni van en FormData)
 * y se borra cualquier error personalizado que tuvieran.
 */
function actualizarCamposEnvio() {
  const esEnvio = radioEnvio.checked;
  bloqueEnvio.classList.toggle("oculto", !esEnvio);

  for (const campo of [campoDireccion, campoCp]) {
    campo.disabled = !esEnvio;
    if (esEnvio) {
      campo.setAttribute("required", "");
    } else {
      campo.removeAttribute("required");
      campo.setCustomValidity("");
      campo.setAttribute("aria-invalid", "false");
      document.querySelector("#e-" + campo.id).textContent = "";
    }
  }
}

/**
 * Reúne los datos del formulario con FormData.
 * get devuelve null si el control no participa (radio sin marcar o campo deshabilitado).
 */
function leerDatosPedido() {
  const datos = new FormData(formPedido);
  return {
    nombre: String(datos.get("nombre") ?? ""),
    correo: String(datos.get("correo") ?? ""),
    entrega: String(datos.get("entrega") ?? ""),
    direccion: String(datos.get("direccion") ?? ""),
    cp: String(datos.get("cp") ?? ""),
    observaciones: String(datos.get("observaciones") ?? ""),
    acepta: datos.has("acepta")
  };
}

/**
 * Traslada los errores de validarDatosPedido a la Constraint Validation API.
 * Primero borra los errores personalizados anteriores y después asigna los actuales.
 * @returns {boolean}
 */
function validarFormulario() {
  const errores = validarDatosPedido(leerDatosPedido());

  CAMPOS_PEDIDO.forEach(registro => {
    const control = document.getElementById(registro.control);
    control.setCustomValidity("");
    const error = errores.find(e => e.campo === registro.campo);
    if (error !== undefined && !control.disabled) {
      control.setCustomValidity(error.mensaje);
    }
  });

  return formPedido.checkValidity();
}

/**
 * Escribe junto a cada control su mensaje y marca aria-invalid.
 * @param {boolean} todos Si es false, solo los campos que el usuario ya ha editado.
 */
function mostrarErrores(todos = false) {
  CAMPOS_PEDIDO.forEach(registro => {
    if (!todos && !camposVisitados.has(registro.campo)) return;
    const control = document.getElementById(registro.control);
    const salida = document.querySelector("#e-" + registro.campo);
    if (control.disabled) {
      salida.textContent = "";
      control.setAttribute("aria-invalid", "false");
      return;
    }
    salida.textContent = control.validationMessage;
    control.setAttribute("aria-invalid", String(!control.validity.valid));
  });
}

function limpiarErroresFormulario() {
  CAMPOS_PEDIDO.forEach(registro => {
    const control = document.getElementById(registro.control);
    control.setCustomValidity("");
    control.setAttribute("aria-invalid", "false");
    document.querySelector("#e-" + registro.campo).textContent = "";
  });
}

/* ===================== MANEJADORES DE EVENTOS ===================== */

// Búsqueda y filtro del catálogo (se pueden combinar).
campoBuscar.addEventListener("input", mostrarCatalogo);
filtroCategoria.addEventListener("change", mostrarCatalogo);

// Delegación: un único manejador para todos los botones "Añadir" del catálogo.
listaCatalogo.addEventListener("click", evento => {
  if (!(evento.target instanceof Element)) return;
  const boton = evento.target.closest('button[data-accion="anadir"]');
  if (!boton || !listaCatalogo.contains(boton)) return;

  const tarjeta = boton.closest("article");
  if (!tarjeta) return;

  const productoId = Number(tarjeta.dataset.id);
  const producto = catalogo.find(p => p.id === productoId);
  if (producto === undefined) return;

  const campo = tarjeta.querySelector('input[type="number"]');
  const salidaError = tarjeta.querySelector(".error");

  // Un campo vacío no debe convertirse en 0: se distingue con null.
  const cantidad = campo.value.trim() === "" ? null : campo.valueAsNumber;

  const linea = carrito.find(l => l.productoId === productoId);
  const cantidadEnCarrito = linea === undefined ? 0 : linea.cantidad;

  const mensaje = validarCantidadParaCarrito(cantidad, producto, cantidadEnCarrito);
  campo.setCustomValidity(mensaje);
  salidaError.textContent = mensaje;
  campo.setAttribute("aria-invalid", String(mensaje !== ""));
  if (mensaje !== "") {
    campo.focus();
    return;
  }

  agregarAlCarrito(carrito, productoId, cantidad);
  mostrarCarrito();
  avisoCarrito.textContent = "Añadidas " + cantidad + " unidades de " + producto.nombre + ".";
  estadoPedido.textContent = "";
});

// Delegación: al corregir una cantidad se borra su error personalizado.
listaCatalogo.addEventListener("input", evento => {
  if (!(evento.target instanceof Element)) return;
  const campo = evento.target.closest('input[type="number"]');
  if (!campo) return;
  campo.setCustomValidity("");
  campo.setAttribute("aria-invalid", "false");
  const tarjeta = campo.closest("article");
  if (tarjeta) tarjeta.querySelector(".error").textContent = "";
});

// Delegación: botones "Retirar" de las líneas del carrito.
cuerpoCarrito.addEventListener("click", evento => {
  if (!(evento.target instanceof Element)) return;
  const boton = evento.target.closest('button[data-accion="retirar"]');
  if (!boton || !cuerpoCarrito.contains(boton)) return;

  const fila = boton.closest("tr");
  if (!fila) return;

  const productoId = Number(fila.dataset.id);
  const producto = catalogo.find(p => p.id === productoId);
  if (retirarDelCarrito(carrito, productoId)) {
    mostrarCarrito();
    avisoCarrito.textContent = "Se ha retirado " + (producto ? producto.nombre : "el producto") + " del carrito.";
  }
});

// Edición del formulario: contador, campos condicionales y avisos en tiempo real.
function revisarEdicion(evento) {
  if (!(evento.target instanceof Element)) return;
  const nombreCampo = evento.target.getAttribute("name");

  if (nombreCampo === "entrega") actualizarCamposEnvio();
  if (nombreCampo === "observaciones") actualizarContador();

  if (CAMPOS_PEDIDO.find(registro => registro.campo === nombreCampo) === undefined) return;

  camposVisitados.add(nombreCampo);
  estadoPedido.textContent = "";
  validarFormulario();
  mostrarErrores();
}
formPedido.addEventListener("input", revisarEdicion);
formPedido.addEventListener("change", revisarEdicion);

// Envío: validación completa siempre, aunque ya se haya validado al editar.
formPedido.addEventListener("submit", evento => {
  evento.preventDefault();

  const formularioValido = validarFormulario();
  CAMPOS_PEDIDO.forEach(registro => camposVisitados.add(registro.campo));
  mostrarErrores(true);

  const problemas = [];
  if (!formularioValido) problemas.push("Revisa los campos marcados.");
  if (carrito.length === 0) problemas.push("El carrito está vacío: añade algún producto.");

  // La validación de stock se hace aparte y ANTES de modificar nada.
  validarStockCarrito(carrito, catalogo).forEach(problema => problemas.push(problema));

  if (problemas.length > 0) {
    estadoPedido.textContent = "No se ha confirmado el pedido. " + problemas.join(" ");
    if (!formularioValido) formPedido.reportValidity();
    return;
  }

  const pedido = crearPedido(siguienteIdPedido, new Date(), leerDatosPedido(), carrito, catalogo);
  if (pedido === null) {
    estadoPedido.textContent = "No se ha podido calcular el pedido.";
    return;
  }

  // A partir de aquí todo es válido: se aplican los cambios a las colecciones.
  pedido.lineas.forEach(linea => {
    const producto = catalogo.find(p => p.id === linea.productoId);
    producto.descontarStock(linea.cantidad);
  });
  pedidos.push(pedido);
  siguienteIdPedido++;
  carrito.splice(0, carrito.length);

  formPedido.reset();
  camposVisitados = new Set();
  actualizarCamposEnvio();
  actualizarContador();
  limpiarErroresFormulario();

  mostrarCatalogo();
  mostrarCarrito();
  mostrarHistorial();

  avisoCarrito.textContent = "";
  estadoPedido.textContent = "Pedido nº " + pedido.id + " confirmado. Total: "
    + (formatearPrecio(pedido.total) ?? "No disponible") + ".";
});

// Historial: filtro por modalidad.
filtroHistorial.addEventListener("change", mostrarHistorial);

// Delegación: desplegar u ocultar el detalle de cada pedido.
listaHistorial.addEventListener("click", evento => {
  if (!(evento.target instanceof Element)) return;
  const boton = evento.target.closest('button[data-accion="detalle"]');
  if (!boton || !listaHistorial.contains(boton)) return;

  const entrada = boton.closest("article");
  if (!entrada) return;
  const detalle = entrada.querySelector(".detalle");

  const oculto = detalle.classList.toggle("oculto");
  boton.setAttribute("aria-expanded", String(!oculto));
  boton.textContent = oculto ? "Ver detalle" : "Ocultar detalle";
});

// Exportación del historial completo en JSON.
botonExportar.addEventListener("click", () => {
  salidaJson.value = JSON.stringify(pedidos, null, 2);
  estadoExportacion.textContent = pedidos.length === 0
    ? "No hay pedidos: se exporta un array vacío."
    : "Se han exportado " + pedidos.length + " pedidos.";
});

/* ===================== ARRANQUE ===================== */

mostrarOpcionesCategoria();
mostrarCatalogo();
mostrarCarrito();
actualizarCamposEnvio();
actualizarContador();
mostrarHistorial();
