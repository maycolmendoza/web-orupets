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
  const campos = ["nombre", "telefono", "entrega"];
  for (const id of campos) {
    const input = document.getElementById(id);
    if (!input || !input.value.trim()) return false;
  }
  const entrega = document.getElementById("entrega")?.value;
  if (entrega === "envio") {
    const reqEnv = ["departamento", "provincia", "distrito", "direccion-envio"];
    for (const id of reqEnv) {
      const input = document.getElementById(id);
      if (!input || !input.value.trim()) return false;
    }
  }
  if (entrega === "recojo") {
    const punto = document.getElementById("punto-recojo");
    if (!punto || !punto.value.trim()) return false;
  }
  return true;
}

function finalizarPedido(event) {
  event.preventDefault();

  const items = obtenerDetalleCarrito();
  if (items.length === 0) {
    if (typeof showAppPush === "function") {
      showAppPush("Tu carrito esta vacio.", "error");
    } else {
      alert("Tu carrito esta vacio.");
    }
    return;
  }

  if (!validarFormulario()) {
    if (typeof showAppPush === "function") {
      showAppPush("Completa los datos obligatorios.", "error");
    } else {
      alert("Completa los datos obligatorios.");
    }
    return;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const entrega = document.getElementById("entrega").value.trim();
  const comentarios = document.getElementById("comentarios").value.trim();
  const direccionEnvio = document.getElementById("direccion-envio")?.value.trim();
  const departamento = document.getElementById("departamento")?.value.trim();
  const provincia = document.getElementById("provincia")?.value.trim();
  const distrito = document.getElementById("distrito")?.value.trim();
  const puntoRecojo = document.getElementById("punto-recojo")?.value.trim();

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
${entrega === "envio"
  ? `Envio (Shalom):
Departamento: ${departamento || "-"}
Provincia: ${provincia || "-"}
Distrito: ${distrito || "-"}
Direccion: ${direccionEnvio || "-"}`
  : `Recojo en: ${puntoRecojo || "Por definir"}`}

*Productos*
${productosTxt}
Total: S/ ${total.toFixed(2)}
Entrega: ${entrega === "envio" ? "Envio por Shalom" : `Recojo en ${puntoRecojo || "punto a coordinar"}`}
Comentarios: ${comentarios || "Ninguno"}`;

  const url = `https://wa.me/${NUMERO_EMPRESA}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");

  // Reset carrito
  clearCart();
  if (typeof showAppModal === "function") {
    showAppModal({
      title: "Pedido enviado",
      message: "Abrimos WhatsApp con tu pedido. Confirmaremos envio o recojo segun elegiste."
    });
  } else {
    alert("Pedido enviado por WhatsApp.");
  }
}

// Toggle UI segun entrega
document.addEventListener("DOMContentLoaded", () => {
  const entrega = document.getElementById("entrega");
  const grupoEnvio = document.getElementById("grupo-envio");
  const grupoRecojo = document.getElementById("grupo-recojo");
  const toggle = () => {
    if (!entrega) return;
    if (entrega.value === "envio") {
      grupoEnvio?.classList.remove("hidden");
      grupoRecojo?.classList.add("hidden");
    } else if (entrega.value === "recojo") {
      grupoRecojo?.classList.remove("hidden");
      grupoEnvio?.classList.add("hidden");
    } else {
      grupoEnvio?.classList.add("hidden");
      grupoRecojo?.classList.add("hidden");
    }
  };
  if (entrega) {
    entrega.addEventListener("change", toggle);
    toggle();
  }
});
