// Cargar NAVBAR
fetch("/components/navbar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("navbar").innerHTML = html;
    if (typeof updateCartCount === "function") {
      updateCartCount();
    }

    const shareBtn = document.getElementById("share-button");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const payload = {
          title: "OruPets",
          text: "Collar pasivo NFC/QR para tu mascota.",
          url: window.location.href
        };
        try {
          if (navigator.share) {
            await navigator.share(payload);
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(payload.url);
            alert("Enlace copiado para compartir.");
          } else {
            alert("Comparte: " + payload.url);
          }
        } catch (e) {
          console.error("Error al compartir", e);
        }
      });
    }
  });

// Cargar FOOTER
fetch("/components/footer.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("footer").innerHTML = html;
  });

// Botón flotante para abrir pop-up global
document.addEventListener("DOMContentLoaded", () => {
  const existing = document.getElementById("global-popup");
  if (existing) return;

  const overlay = document.createElement("div");
  overlay.id = "global-popup";
  overlay.className = "fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/80 backdrop-blur";

  overlay.innerHTML = `
    <div class="relative bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl max-w-md w-[90%] p-6 space-y-4">
      <button id="close-popup" class="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition" aria-label="Cerrar pop up">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
      <div class="space-y-2">
        <p class="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Mensaje</p>
        <h3 class="text-2xl font-bold">Pop-up de OruPets</h3>
        <p class="text-white/80 text-sm">Comparte actualizaciones, anuncios o recordatorios para tus clientes en tiempo real.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button id="popup-primary" class="bg-emerald-400 text-slate-900 px-4 py-2 rounded-xl font-semibold hover:-translate-y-0.5 transition shadow-lg shadow-emerald-900/40">Ver catalogo</button>
        <button id="popup-secondary" class="border border-white/20 text-white px-4 py-2 rounded-xl font-semibold hover:bg-white/10 transition">Cerrar</button>
      </div>
    </div>
  `;

  const trigger = document.createElement("button");
  trigger.id = "open-popup";
  trigger.className = "fixed bottom-5 right-5 z-40 p-4 rounded-full bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-900/40 hover:-translate-y-0.5 transition";
  trigger.setAttribute("aria-label", "Abrir pop up");
  trigger.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(trigger);

  const open = () => overlay.classList.remove("hidden");
  const close = () => overlay.classList.add("hidden");

  trigger.addEventListener("click", open);
  overlay.querySelector("#close-popup").addEventListener("click", close);
  overlay.querySelector("#popup-secondary").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("#popup-primary").addEventListener("click", () => {
    window.location.href = "/catalogo/";
  });
});
