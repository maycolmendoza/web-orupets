const NUMERO_EMPRESA = "519XXXXXXXX"; // Reemplaza por tu numero con codigo de pais

function obtenerDetalleCarrito() {
  const cart = getCart();
  return cart
    .map(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) return null;
      const qty = item.qty || 1;
      return {
        ...product,
        qty,
        subtotal: product.precio * qty
      };
    })
    .filter(Boolean);
}

function mostrarResumen() {
  const items = obtenerDetalleCarrito();
  const cont = document.getElementById("resumen-items");
  const totalTag = document.getElementById("resumen-total");
  const emptyMsg = document.getElementById("checkout-empty");

  if (!cont) return;

  if (items.length === 0) {
    cont.innerHTML = '<p class="text-gray-500">No hay productos.</p>';
    if (emptyMsg) emptyMsg.classList.remove("hidden");
    if (totalTag) totalTag.innerText = "S/ 0.00";
    return;
  }

  if (emptyMsg) emptyMsg.classList.add("hidden");

  let total = 0;
  cont.innerHTML = "";

  items.forEach(item => {
    total += item.subtotal;
    cont.innerHTML += `
      <div class="flex items-center justify-between">
        <span>${item.nombre} x${item.qty}</span>
        <span class="font-bold">S/ ${item.subtotal.toFixed(2)}</span>
      </div>
    `;
  });

  if (totalTag) totalTag.innerText = "S/ " + total.toFixed(2);
}

mostrarResumen();

function validarFormulario() {
  const campos = ["nombre", "telefono", "distrito", "entrega"];
  for (const id of campos) {
    const input = document.getElementById(id);
    if (!input || !input.value.trim()) return false;
  }
  return true;
}

function finalizarPedido(event) {
  event.preventDefault();

  const items = obtenerDetalleCarrito();
  if (items.length === 0) {
    alert("Tu carrito esta vacio.");
    return;
  }

  if (!validarFormulario()) {
    alert("Completa los datos obligatorios.");
    return;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const distrito = document.getElementById("distrito").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const entrega = document.getElementById("entrega").value.trim();
  const comentarios = document.getElementById("comentarios").value.trim();

  let productosTxt = "";
  let total = 0;

  items.forEach(p => {
    productosTxt += `- ${p.nombre} x${p.qty} - S/ ${p.subtotal.toFixed(2)}\n`;
    total += p.subtotal;
  });

  const mensaje =
`*Nuevo Pedido OruPets*

*Cliente*
${nombre}
Tel: ${telefono}
Distrito: ${distrito}
Direccion: ${direccion || "Sin direccion"}

*Productos*
${productosTxt}
Total: S/ ${total.toFixed(2)}
Entrega: ${entrega}
Comentarios: ${comentarios || "Ninguno"}`;

  const url = `https://wa.me/${NUMERO_EMPRESA}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");

  // Reset carrito
  clearCart();
  alert("Pedido enviado por WhatsApp.");
}
