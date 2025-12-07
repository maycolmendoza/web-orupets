const NUMERO_ALERTA = "519XXXXXXXX"; // Reemplaza con el numero que recibe alertas

function enviarReporte(event) {
  event.preventDefault();

  const codigo = document.getElementById("codigo").value.trim();
  const nombre = document.getElementById("nombre-reportante").value.trim();
  const telefono = document.getElementById("telefono-reportante").value.trim();
  const ubicacion = document.getElementById("ubicacion").value.trim();
  const mensajeExtra = document.getElementById("mensaje").value.trim();

  if (!codigo || !nombre || !telefono || !ubicacion) {
    if (typeof showAppPush === "function") {
      showAppPush("Completa los datos requeridos.", "error");
    } else {
      alert("Completa los datos requeridos.");
    }
    return;
  }

  const mensaje =
`*Reporte de mascota encontrada*

Codigo del collar: ${codigo}
Reporta: ${nombre}
Telefono: ${telefono}
Ubicacion: ${ubicacion}
Notas: ${mensajeExtra || "Sin comentarios"}

Por favor contactar al duenio.`;

  const url = `https://wa.me/${NUMERO_ALERTA}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
  if (typeof showAppModal === "function") {
    showAppModal({
      title: "Reporte enviado",
      message: "Abrimos WhatsApp con tu mensaje. Gracias por ayudar a la mascota a volver a casa."
    });
  } else {
    alert("Gracias por reportar, enviaremos el mensaje por WhatsApp.");
  }
  document.getElementById("report-form").reset();
}
