// Cargar NAVBAR
fetch("/components/navbar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("navbar").innerHTML = html;
    if (typeof updateCartCount === "function") {
      updateCartCount();
    }
    initNavbarInteractions();
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
  trigger.className = "fixed bottom-5 right-5 z-40 p-4 rounded-full bg-amber-400 text-[#0a0f1c] shadow-2xl shadow-black/30 hover:-translate-y-0.5 transition opacity-0 pointer-events-none";
  trigger.setAttribute("aria-label", "Ir al inicio");
  trigger.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
    </svg>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(trigger);

  const open = () => window.scrollTo({ top: 0, behavior: "smooth" });
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

  const toggleTopButton = () => {
    if (window.scrollY > 160) {
      trigger.classList.remove("opacity-0", "pointer-events-none");
    } else {
      trigger.classList.add("opacity-0", "pointer-events-none");
    }
  };

  window.addEventListener("scroll", toggleTopButton);
  toggleTopButton();
});

function initNavbarInteractions() {
  const nav = document.getElementById("navbar");
  if (!nav) return;

  // Compartir
  const shareBtn = nav.querySelector("#share-button");
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
          showAppPush("Enlace copiado para compartir.");
        } else {
          showAppModal({
            title: "Compartir OruPets",
            message: "Comparte este enlace con quien quieras:",
            url: payload.url
          });
        }
      } catch (e) {
        console.error("Error al compartir", e);
      }
    });
  }

  // Toggle panel
  const toggle = nav.querySelector("#nav-toggle");
  const panel = nav.querySelector("#nav-panel");
  if (toggle && panel) {
    const closePanel = () => panel.classList.add("hidden");
    const togglePanel = () => panel.classList.toggle("hidden");

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePanel();
    });

    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && !toggle.contains(e.target)) {
        closePanel();
      }
    });

    window.addEventListener("resize", closePanel);
  }
}

// --- UI helpers reutilizables ---
let appUIHost = null;

function ensureUIHost() {
  if (appUIHost) return appUIHost;
  const host = document.createElement("div");
  host.id = "op-ui-host";
  host.className = "fixed inset-0 pointer-events-none z-[9999]";
  document.body.appendChild(host);
  appUIHost = host;
  return host;
}

function showAppPush(message, type = "info") {
  const host = ensureUIHost();
  const toast = document.createElement("div");
  const palette =
    type === "success"
      ? "bg-emerald-400 text-slate-900"
      : type === "error"
        ? "bg-rose-500 text-white"
        : "bg-white text-slate-900";
  toast.className = `pointer-events-auto max-w-xs w-full sm:max-w-sm shadow-2xl shadow-black/30 rounded-2xl px-4 py-3 font-semibold ${palette} flex items-start gap-3 animate-[fadeIn_180ms_ease-out]`;
  toast.style.position = "fixed";
  toast.style.right = "1.25rem";
  toast.style.top = "1.25rem";
  toast.innerHTML = `
    <span class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-black/10 text-sm">!</span>
    <span class="text-sm leading-snug">${message}</span>
  `;
  host.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

function showAppModal({ title = "", message = "", url = "" }) {
  const host = ensureUIHost();
  const overlay = document.createElement("div");
  overlay.className = "pointer-events-auto fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4";
  overlay.innerHTML = `
    <div class="relative w-full max-w-md bg-[#0b1221] border border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 p-5 space-y-3">
      <button class="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition" aria-label="Cerrar">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
      <div class="space-y-1">
        <p class="text-xs font-semibold text-amber-300 uppercase tracking-wide">${title || "OruPets"}</p>
        <p class="text-base text-white/80">${message || ""}</p>
        ${url ? `<div class="mt-2 text-xs text-white/70 break-all bg-white/5 border border-white/10 rounded-xl px-3 py-2">${url}</div>` : ""}
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button class="op-modal-close px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 transition">Cerrar</button>
        ${url ? `<button class="op-modal-copy px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-semibold hover:brightness-110 transition">Copiar</button>` : ""}
      </div>
    </div>
  `;
  host.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".op-modal-close") || e.target.closest("button[aria-label='Cerrar']")) {
      close();
    }
  });
  const copyBtn = overlay.querySelector(".op-modal-copy");
  if (copyBtn && url) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        showAppPush("Enlace copiado.", "success");
        close();
      } catch {
        showAppPush("No se pudo copiar", "error");
      }
    });
  }
}

function showAppConfirm({ title = "Confirmar", message = "¿Deseas continuar?", confirmText = "Aceptar", cancelText = "Cancelar" }) {
  return new Promise((resolve) => {
    const host = ensureUIHost();
    const overlay = document.createElement("div");
    overlay.className = "pointer-events-auto fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4";
    overlay.innerHTML = `
      <div class="relative w-full max-w-md bg-[#0b1221] border border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 p-5 space-y-3">
        <button class="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition" aria-label="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
        <div class="space-y-1">
          <p class="text-xs font-semibold text-amber-300 uppercase tracking-wide">${title}</p>
          <p class="text-base text-white/80">${message}</p>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button class="op-confirm-cancel px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 transition">${cancelText}</button>
          <button class="op-confirm-accept px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-semibold hover:brightness-110 transition">${confirmText}</button>
        </div>
      </div>
    `;
    host.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest(".op-confirm-cancel") || e.target.closest("button[aria-label='Cerrar']")) {
        close(false);
      }
      if (e.target.closest(".op-confirm-accept")) {
        close(true);
      }
    });
  });
}
