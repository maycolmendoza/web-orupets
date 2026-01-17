const NUMERO_ALERTA = "519XXXXXXXX"; // Dueno directo (no se usa en este flujo)
const URL_COMUNIDAD = "https://whatsapp.com/channel/0029Vb6fgCc8PgsAtjXes801"; // Canal oficial OruPets

async function enviarReporte(event) {
  event.preventDefault();

  const destino = "comunidad"; // Solo comunidad para mascotas sin collar
  const codigo = document.getElementById("codigo")?.value.trim() || "";
  const nombre = document.getElementById("nombre-reportante")?.value.trim() || "";
  const telefono = document.getElementById("telefono-reportante")?.value.trim() || "";
  const ubicacion = document.getElementById("ubicacion")?.value.trim() || "";
  const descripcion = document.getElementById("mensaje")?.value.trim() || "";
  const foto = document.getElementById("foto-mascota")?.files?.[0];
  const fotoNombre = foto?.name || "";

  if (!ubicacion && !descripcion) {
    if (typeof showAppPush === "function") {
      showAppPush("Agrega ubicacion o una breve descripcion.", "error");
    } else {
      alert("Agrega ubicacion o una breve descripcion.");
    }
    return;
  }

  const numeroDestino = URL_COMUNIDAD;
  const tituloDestino = "Comunidad OruPets (canal)";

  const mensaje = [
    "*Alerta de mascota encontrada*",
    `Destino: ${tituloDestino}`,
    codigo ? `C\u00f3digo del collar: ${codigo}` : "",
    `Ubicacion: ${ubicacion || "No indicada"}`,
    `Descripcion: ${descripcion || "Sin descripcion"}`,
    `Foto: Adjunta la imagen al enviar ${fotoNombre ? `(${fotoNombre})` : ""}`,
    nombre || telefono ? `Contacto: ${nombre || "An\u00f3nimo"}${telefono ? " - " + telefono : ""}` : "",
    "",
    "Por favor ayudar a reencontrar a la mascota con su familia."
  ].filter(Boolean).join("\n");

  const files = foto ? [foto] : [];
  const puedeCompartirArchivos = files.length && navigator.canShare && navigator.canShare({ files, text: mensaje });

  // Opcion principal: Web Share API con foto adjunta (si el dispositivo lo soporta)
  if (puedeCompartirArchivos) {
    try {
      await navigator.share({ files, text: mensaje, title: "Reporte de mascota - OruPets" });
      if (typeof showAppModal === "function") {
        showAppModal({
          title: "Reporte listo",
          message: "Se abrio el menu de compartir. Elige WhatsApp y selecciona la comunidad OruPets; la foto ya va adjunta."
        });
      } else {
        alert("Elige WhatsApp en el menu de compartir y selecciona la comunidad OruPets; la foto va adjunta.");
      }
      document.getElementById("report-form")?.reset();
      document.getElementById("photo-preview")?.classList.add("hidden");
      document.getElementById("ubicacion-status")?.textContent = "Solo se usa para contactar a la comunidad.";
      return;
    } catch (err) {
      // Continua al fallback
    }
  }

  // Fallback: abrir canal y copiar mensaje; el usuario debe pegar y adjuntar la foto manualmente
  navigator.clipboard?.writeText(mensaje).catch(() => {});
  window.open(numeroDestino, "_blank");

  if (typeof showAppModal === "function") {
    showAppModal({
      title: "Reporte listo para enviar",
      message: "Abrimos el canal de WhatsApp. Copiamos tu mensaje al portapapeles; adjunta la foto y pegalo si no aparece automaticamente."
    });
  } else {
    alert("Abrimos el canal de WhatsApp. Copiamos el mensaje; pegalo si no aparece y adjunta la foto.");
  }

  const form = document.getElementById("report-form");
  form?.reset();

  const photoPreview = document.getElementById("photo-preview");
  const ubicacionStatus = document.getElementById("ubicacion-status");
  if (photoPreview) photoPreview.classList.add("hidden");
  if (ubicacionStatus) ubicacionStatus.textContent = "Solo se usa para contactar a la comunidad.";
}
