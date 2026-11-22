# Gestor de pedidos de material

Práctica de integración de Desarrollo Web en Entorno Cliente (sesiones 8 a 13).
Aplicación web que permite consultar un catálogo de material informático y de oficina, preparar un carrito y confirmar pedidos. Toda la lógica se ejecuta en el navegador con HTML, CSS y JavaScript, sin frameworks, sin backend y sin persistencia: al recargar la página se pierden los datos.

---

## 1. Cómo ejecutar la aplicación (HTTP, no `file://`)

**Opción A: Live Server (VS Code, la que usamos en clase)**

1. Abre la carpeta `gestor-pedidos` en VS Code.
2. Haz clic derecho sobre `index.html` y elige **Open with Live Server**.
3. Se abrirá una dirección como `http://127.0.0.1:5500/index.html`.

Después abre `http://localhost:8000/index.html` en el navegador.

Para comprobarlo, abre DevTools (F12):

- **Console**: no debe aparecer ningún error.
- **Network**: recarga la página. Se piden `index.html`, `estilos.css`, `producto.js`, `logica.js`, `interfaz.js` y `app.js`, todos con estado **200**.

---

## 2. Estructura de carpetas

```text
gestor-pedidos/
├── index.html        Estructura: catálogo, carrito, formulario, historial y exportación
├── README.md
├── css/
│   └── estilos.css   Presentación (clases .oculto, .agotado, .error, rejilla…)
├── js/
│   ├── producto.js   Clase Producto
│   ├── logica.js     Cálculos y validaciones SIN DOM (reciben parámetros y devuelven resultados)
│   ├── interfaz.js   Funciones que CREAN nodos (createElement + textContent) y los devuelven
│   └── app.js        Datos en memoria, funciones que ACTUALIZAN el DOM y registro de eventos
└── docs/             Capturas de depuración (punto de interrupción y Network)
```

Los cuatro scripts se cargan con `defer`, en este orden: `producto.js`, `logica.js`, `interfaz.js` y `app.js`. Así, cuando se ejecuta `app.js`, la clase y todas las funciones ya están definidas y el DOM ya existe.

### Separación de responsabilidades

| Tipo de función | Dónde | Ejemplos |
|---|---|---|
| Cálculo o validación: no toca el DOM y devuelve un dato | `logica.js` | `calcularSubtotal`, `calcularDescuento`, `validarDatosPedido`, `filtrarCatalogo` |
| Creación de nodos: devuelve un elemento sin insertarlo | `interfaz.js` | `crearTarjetaProducto`, `crearFilaCarrito`, `crearEntradaPedido` |
| Actualización del DOM: lee el estado y pinta | `app.js` | `mostrarCatalogo`, `mostrarCarrito`, `mostrarHistorial`, `mostrarErrores` |
| Manejadores de eventos | `app.js` | `submit`, `input`, `change` y los `click` delegados |

---

## 3. Datos

Hay tres colecciones en memoria (`app.js`):

- `catalogo`: array de **instancias de `Producto`**, creadas a partir de `datosProductos`. Al crearlas se comprueba con `find` que el `id` no esté repetido. Tiene 7 productos de 3 categorías (`perifericos`, `almacenamiento`, `oficina`):
  - El **Teclado (102)** no tiene stock.
  - El **Ratón USB (101)** cuesta 12,50 € y tiene 8 unidades: 8 × 12,50 = **100 €**, justo el umbral del descuento.
- `carrito`: `[{ productoId, cantidad }]`, con una sola línea por producto.
- `pedidos`: historial de pedidos confirmados.

Cada pedido guarda `id`, `fecha` (`Date`), `cliente {nombre, correo}`, `entrega {modalidad, direccion, codigoPostal}`, `observaciones`, `lineas [{productoId, nombre, precio, cantidad, importe}]`, `subtotal`, `descuento` y `total`. El nombre y el precio se **copian** en el momento de la compra, de modo que el historial no cambia aunque después cambie el catálogo.

---

## 4. Funcionalidades, ficheros y funciones

### 4.1 Clase `Producto` (`js/producto.js`)

- El `constructor(id, nombre, categoria, precio, stock)` valida los datos (id entero positivo, nombre y categoría no vacíos, precio finito mayor que 0 y stock entero no negativo). Si algo no es válido, lanza un `TypeError`.
- Métodos que usan `this`:
  - `hayStock()`: indica si queda alguna unidad.
  - `tieneDisponible(cantidad)`: comprueba si se puede servir esa cantidad, sin modificar nada.
  - `descontarStock(cantidad)`: resta las unidades tras una compra. Devuelve `true` o `false`.

### 4.2 Catálogo: mostrar, buscar y filtrar

- **Ficheros:** `app.js` (`mostrarCatalogo`, `mostrarOpcionesCategoria`), `interfaz.js` (`crearTarjetaProducto`) y `logica.js` (`filtrarCatalogo`, `obtenerCategorias`).
- Cada tarjeta muestra el nombre, la categoría, el precio, las existencias, un campo de cantidad (`type="number" min="1" max=stock step="1"`) y el botón **Añadir al carrito**.
- La búsqueda usa `toLowerCase()` e `includes()`, así que no distingue mayúsculas de minúsculas. Se combina con la categoría dentro de un único `filter`.
- Si no hay resultados, aparece el mensaje "No hay productos que coincidan…".
- Las opciones del `select` de categoría se generan a partir del catálogo (`map` + `filter` con `indexOf`). Antes de filtrar se comprueba que el valor elegido sea una opción admitida.
- Los productos agotados se muestran con el campo y el botón deshabilitados.
- Eventos: `input` en el buscador y `change` en el `select`.

### 4.3 Carrito y existencias

- **Ficheros:** `app.js` (delegación en `#catalogo-lista` y `#carrito-lineas`, `mostrarCarrito`), `logica.js` (`validarCantidadParaCarrito`, `agregarAlCarrito`, `retirarDelCarrito`, `validarStockCarrito`, `contarUnidades`) e `interfaz.js` (`crearFilaCarrito`).
- **Añadir:** un único manejador `click` en el contenedor del catálogo localiza el botón con `closest('button[data-accion="anadir"]')` y obtiene el producto a partir de `dataset.id`.
  - Si el campo está vacío, la cantidad se trata como `null`, nunca como 0. Si no, se lee con `valueAsNumber`.
  - Se rechazan las cantidades vacías, decimales, negativas o cero, y las que, sumadas a lo que ya hay en el carrito, superan el stock.
  - El error se asigna con `setCustomValidity` y se muestra junto al campo. Al volver a escribir en el campo, se borra (delegación del evento `input`).
- **Sin duplicados:** `agregarAlCarrito` busca la línea con `find`. Si ya existe, suma la cantidad; si no, añade una línea nueva con `push`.
- **Retirar:** un manejador delegado en `#carrito-lineas` atiende los botones `data-accion="retirar"`. `retirarDelCarrito` usa `find`, después `indexOf` (comprobando que no sea `-1`) y por último `splice`.
- Cada línea muestra el nombre, la cantidad, el precio unitario y el subtotal. Debajo se muestran el total de unidades, el subtotal, el descuento y el total.
- Añadir al carrito **no** descuenta stock. Antes de confirmar se vuelve a comprobar con `validarStockCarrito`.
- Con el carrito vacío aparece un mensaje y el botón **Confirmar pedido** queda deshabilitado. Además, el manejador `submit` vuelve a comprobarlo.

### 4.4 Cálculos económicos (`js/logica.js`)

| Función | Qué recibe | Qué devuelve |
|---|---|---|
| `calcularSubtotal(carrito, catalogo)` | Carrito y catálogo | Suma de precio × cantidad, o `null` si hay una línea inválida |
| `calcularDescuento(subtotal, porcentaje = 10, umbral = 100)` | Subtotal; porcentaje y umbral con **valores por defecto** | **Importe** del descuento: 0 si subtotal < 100; 10 % si subtotal ≥ 100; `null` si los datos no son válidos |
| `calcularTotales(carrito, catalogo)` | Carrito y catálogo | `{ subtotal, descuento, total }` |
| `contarUnidades(carrito)` | Carrito | Total de unidades |
| `formatearPrecio(importe)` | Número | Texto con dos decimales (`"12.50 €"`), o `null` si no es válido |

Todos los cálculos trabajan con números. `toFixed(2)` solo se usa al mostrar los importes y nunca para seguir calculando. Los importes que se guardan en un pedido se redondean a céntimos con `Math.round(x * 100) / 100` y siguen siendo números.

> Nota: el enunciado propone `calcularDescuento(subtotal, porcentaje = 0)`. Yo he puesto como valor por defecto el 10 % de la regla de negocio y he añadido un parámetro `umbral = 100`. Es una firma equivalente y queda documentada aquí.

### 4.5 Formulario y confirmación del pedido

- **Ficheros:** `index.html` (formulario `novalidate`) y `app.js` (`leerDatosPedido`, `validarFormulario`, `mostrarErrores`, `actualizarCamposEnvio`, `actualizarContador`, manejador `submit`). La validación pura está en `logica.js` (`validarDatosPedido`, `crearPedido`).
- Restricciones HTML5:
  - `required`.
  - `minlength="2"` y `maxlength="60"` en el nombre.
  - `type="email"` en el correo.
  - Dos radios `required` dentro de un `fieldset` con su `legend`.
  - `minlength="5"` y `maxlength="100"` en la dirección y `maxlength="5"` en el código postal.
  - `maxlength="200"` en las observaciones.
  - Checkbox `required`.
- Validación JavaScript con `validarDatosPedido(datos)`. Recibe un objeto creado con **FormData** y devuelve `[{campo, mensaje}]`. Comprueba:
  - Nombre: con `trim`, entre 2 y 60 caracteres; una cadena de solo espacios se rechaza.
  - Correo: no vacío y con el patrón `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, además del `typeMismatch` del navegador.
  - Modalidad: debe ser una opción admitida (`["recogida", "envio"].includes(...)`); no se da por bueno el valor del radio.
  - Solo con envío: dirección de 5 a 100 caracteres y código postal con `PATRON_CP.test()`. El patrón es `/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/`: agrupación y alternativas para la provincia entre 01 y 52, y tres cifras más.
  - Observaciones: como máximo 200 caracteres.
  - Aceptación: marcada.
- **Constraint Validation API:** `validarFormulario` borra primero todos los errores con `setCustomValidity("")`, asigna los nuevos y devuelve `form.checkValidity()`. `mostrarErrores` escribe `validationMessage` junto a cada control y actualiza `aria-invalid`. En el `submit` se llama a `form.reportValidity()` si hay errores.
- **Eventos `input` y `change`** en el formulario: actualizan el contador de observaciones, muestran u ocultan los campos de envío y validan los campos ya visitados (con un `Set`).
- **Cambio de modalidad:** con *recogida*, la dirección y el código postal se ocultan, se deshabilitan, pierden `required` y se borra su error personalizado.
- **`submit` con `preventDefault()`:** siempre se hace la validación completa. Si hay cualquier problema (formulario, carrito vacío o stock), se muestra un mensaje y **no se modifica ninguna colección** ni se borra el formulario. Si todo es correcto:
  1. `crearPedido` construye el pedido.
  2. Se descuenta el stock con `descontarStock`.
  3. Se hace `pedidos.push(pedido)`.
  4. Se vacía el carrito con `splice(0, length)`.
  5. Se reinicia el formulario y se vuelven a pintar el catálogo, el carrito y el historial.

### 4.6 Historial de pedidos y exportación JSON

- **Ficheros:** `app.js` (`mostrarHistorial`, delegación en `#historial-lista`, botón de exportar), `logica.js` (`filtrarPedidos`, `calcularResumenHistorial`, `formatearFecha`) e `interfaz.js` (`crearEntradaPedido`).
- Cada entrada muestra el número de pedido, la fecha (`toLocaleDateString("es-ES", …)`), el cliente, la modalidad y el total.
- El botón **Ver detalle** (`data-accion="detalle"`, con delegación) alterna la clase `.oculto` con `classList.toggle` y actualiza `aria-expanded`.
- Se puede filtrar por *todos*, *recogida* o *envío*; el valor del `select` se comprueba contra una lista de opciones admitidas. El número de pedidos y la suma de importes se calculan **sobre los pedidos filtrados**. Si la lista está vacía, el resultado es 0 y 0,00 €, nunca `NaN`.
- Hay dos estados vacíos: "Todavía no hay pedidos confirmados" y "Ningún pedido coincide con el filtro seleccionado".
- **Exportar historial:** escribe `JSON.stringify(pedidos, null, 2)` en un `textarea` del que se puede copiar el texto. La fecha aparece como cadena ISO, porque `Date` se serializa como texto.

### 4.7 Seguridad básica

Todos los datos se insertan con `textContent` o como texto mediante `append`. No se usa `innerHTML` en ningún sitio.

---

## 5. Casos de prueba reproducibles en el navegador

Parte siempre de una recarga de la página servida por HTTP. Datos de partida: Ratón USB 12,50 € (stock 8), Teclado 24,90 € (stock 0), Disco SSD 89,90 € (stock 5), Folios 5,50 € (stock 30).

### Catálogo

| # | Prueba | Pasos y datos | Resultado esperado |
|---|---|---|---|
| C1 | Carga inicial | Abrir la página | 7 tarjetas, "Mostrando 7 de 7 productos.", consola sin errores |
| C2 | Búsqueda sin distinguir mayúsculas | Escribir `RATÓN` en Buscar | Solo aparece "Ratón USB" |
| C3 | Filtro por categoría | Elegir "Material de oficina" con el buscador vacío | 2 productos (Folios y Silla) |
| C4 | **Filtros sin resultados** | Buscar `ratón` con la categoría "Material de oficina" | 0 tarjetas y el mensaje "No hay productos que coincidan con la búsqueda y la categoría elegidas." |
| C5 | **Producto agotado** | Fijarse en la tarjeta del Teclado | Aparece "Sin existencias" y el campo y el botón están deshabilitados: no se puede añadir |

### Carrito

| # | Prueba | Pasos y datos | Resultado esperado |
|---|---|---|---|
| K1 | **Carrito vacío** | Abrir la página | Mensaje "El carrito está vacío…", totales a 0,00 € y botón **Confirmar pedido** deshabilitado |
| K2 | Carrito vacío al enviar | Con el carrito vacío, ejecutar en la consola `document.querySelector("#form-pedido").requestSubmit()` | "No se ha confirmado el pedido… El carrito está vacío: añade algún producto." |
| K3 | Cantidad vacía | Ratón: borrar la cantidad y pulsar Añadir | "Indica una cantidad." y el carrito no cambia |
| K4 | Cantidad decimal o negativa | Ratón: `2.5` y después `-1` | "La cantidad debe ser un número entero." y "La cantidad debe ser mayor que cero." |
| K5 | **Stock insuficiente** | Ratón: `9` y Añadir | "Stock insuficiente: quedan 8 unidades y ya tienes 0…" |
| K6 | **Suma de cantidades** | Ratón: añadir `3` y después `4` | Una sola línea con cantidad 7 |
| K7 | Stock contando lo que ya está en el carrito | Después de K6, añadir `2` ratones | "…ya tienes 7 en el carrito (puedes añadir 1)." |
| K8 | **Eliminación de líneas** | Añadir 2 folios y pulsar **Retirar** en su línea | Desaparece solo esa línea; las unidades y los totales se recalculan |
| K9 | Añadir no descuenta stock | Añadir 3 ratones | La tarjeta sigue mostrando "Existencias: 8 unidades" |

### Cálculos

| # | Prueba | Pasos y datos | Resultado esperado |
|---|---|---|---|
| E1 | Por debajo del umbral | 7 ratones (87,50 €) | Descuento 0,00 € y total 87,50 € |
| E2 | **Umbral de 100 €** | 8 ratones (100 €) | Subtotal 100,00 €, descuento 10,00 € y total 90,00 € |
| E3 | Funciones en la consola | `calcularDescuento(99.99)`, `calcularDescuento(100)`, `calcularDescuento(200, 20)`, `calcularDescuento(-5)` | `0`, `10`, `40` y `null` |

### Formulario

| # | Prueba | Pasos y datos | Resultado esperado |
|---|---|---|---|
| F1 | Envío vacío | Con algo en el carrito, pulsar Confirmar sin rellenar nada | Errores junto al nombre, el correo, la modalidad y la aceptación; no se crea ningún pedido |
| F2 | Nombre con solo espacios | Nombre: `"    "` | "Escribe tu nombre y apellidos (no valen solo espacios)." |
| F3 | **Correo inválido** | `ana@` y después `ana@correo` | Error de formato junto al correo; con `ana@correo.es` el error desaparece |
| F4 | **Código postal inválido** | Envío, dirección `C/ Mayor 1`, CP `53001`, `00123`, `4100A` y `4100` | "Código postal no válido: cinco cifras y provincia entre 01 y 52." |
| F5 | Código postal válido | `01001`, `41001` y `52001` | Sin error |
| F6 | **Cambio de modalidad** | Envío con CP `99999` (aparece el error) y después marcar Recogida | La dirección y el CP se ocultan y dejan de ser obligatorios. En la consola, `document.querySelector("#cp").validity.customError` devuelve `false` |
| F7 | Contador | Escribir `Llamar antes` en Observaciones | "12 / 200 caracteres", actualizado mientras se escribe |
| F8 | Pedido correcto | 8 ratones, `Ana López`, `ana@correo.es`, Recogida y aceptar | "Pedido nº 1 confirmado. Total: 90.00 €."; el ratón pasa a "Sin existencias"; el carrito queda vacío y el formulario reiniciado |
| F9 | Stock insuficiente al confirmar | Añadir 5 memorias USB, ejecutar en la consola `catalogo.find(p => p.id === 202).stock = 2`, rellenar el formulario y confirmar | "Stock insuficiente de Memoria USB 64 GB: pides 5 y quedan 2."; no cambia el carrito, ni `pedidos`, ni el formulario |
| F10 | Texto como texto | Nombre `<b>Ana</b>` y confirmar | En el historial aparece literalmente `<b>Ana</b>`, sin negrita |

### Historial y exportación

| # | Prueba | Pasos y datos | Resultado esperado |
|---|---|---|---|
| H1 | Historial vacío | Abrir la página | "Todavía no hay pedidos confirmados." y "Pedidos mostrados: 0 · Importe total: 0.00 €" |
| H2 | Dos pedidos | F8 y después 1 SSD con Envío (`Av. Sol 22, Sevilla`, `41010`) | "Pedidos mostrados: 2 · Importe total: 179.90 €" |
| H3 | Filtro de modalidad | Elegir "Envío" | "Pedidos mostrados: 1 · Importe total: 89.90 €" |
| H4 | **Filtro sin resultados** | Con solo un pedido de recogida, elegir "Envío" | "Ningún pedido coincide con el filtro seleccionado." y 0,00 € (nunca NaN) |
| H5 | Detalle | Pulsar **Ver detalle** en el pedido 1 | Aparecen las líneas ("Ratón USB: 8 × 12.50 € = 100.00 €"), el subtotal, el descuento y el total; el botón cambia a "Ocultar detalle" |
| H6 | Exportar | Pulsar **Exportar historial** | JSON con los pedidos en el `textarea`, que se puede seleccionar y copiar. Sin pedidos, aparece `[]` |

---

## 6. Evidencias de depuración

### 6.1 Punto de interrupción

*(Captura: `docs/breakpoint.png`)*

1. DevTools → **Sources** → `js/app.js`.
2. Pon un punto de interrupción en la línea `const formularioValido = validarFormulario();` del manejador `submit`.
3. Añade 8 ratones al carrito, rellena el formulario y pulsa **Confirmar pedido**.
4. La ejecución se detiene. En **Scope** puedes comprobar que `carrito` contiene `[{productoId: 101, cantidad: 8}]`. Con **Step over** ves que `formularioValido` vale `true` y que `problemas` está vacío. Con **Step into** sobre `crearPedido` puedes ver cómo se calcula `totales`.


### 6.2 Pestaña Network

*(Captura: `docs/network.png`)*

Abre DevTools → **Network**, marca "Disable cache" y recarga. Aparecen las peticiones HTTP de `index.html`, `estilos.css` y los cuatro `.js`, con estado **200** y tipo `document`, `stylesheet` y `script`. La URL empieza por `http://`, no por `file://`.

---

## 7. Uso de la inteligencia artificial

- **Enlace a la conversación:** (https://share.gemini.google/pGGojCw3MDgR)


---

## 8. Restricciones respetadas

- HTML, CSS y JS en ficheros separados.
- Sin frameworks, sin backend, sin APIs remotas, sin `localStorage` y sin cookies.
- `const` y `let`, `===`, conversiones explícitas (`Number`, `String`) y `addEventListener`.
- Métodos de arrays usados en funcionalidades reales: `push`, `splice`, `find`, `filter`, `map`, `forEach`, además de `indexOf`, `includes` y `slice`.
