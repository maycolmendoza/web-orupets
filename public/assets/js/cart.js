const CART_KEY = "cart";

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  renderCart();
  updateCartCount();
}

function updateCartCount() {
  const badge = document.querySelector("#cart-count");
  const totalItems = getCart().reduce((acc, item) => acc + (item.qty || 1), 0);
  if (badge) badge.textContent = totalItems;
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ id: product.id, qty: 1 });
  }

  saveCart(cart);
  renderCart();
  alert("Producto agregado al carrito");
}

function updateQty(id, newQty) {
  let cart = getCart();
  if (newQty <= 0) {
    cart = cart.filter(item => item.id !== id);
  } else {
    cart = cart.map(item => item.id === id ? { ...item, qty: newQty } : item);
  }
  saveCart(cart);
  renderCart();
}

function removeFromCart(id) {
  const cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
  renderCart();
}

// ----------------------
// RENDER DEL CARRITO
// ----------------------
function renderCart() {
  const cart = getCart();
  const container = document.getElementById("cart-container");
  const empty = document.getElementById("empty");
  const summary = document.getElementById("summary");
  const totalTag = document.getElementById("total");

  if (!container) return; // no estamos en carrito.html

  if (cart.length === 0) {
    if (empty) empty.classList.remove("hidden");
    if (summary) summary.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  if (empty) empty.classList.add("hidden");
  if (summary) summary.classList.remove("hidden");

  let html = "";
  let total = 0;

  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return;

    const qty = item.qty || 1;
    const subtotal = product.precio * qty;
    total += subtotal;

    html += `
      <div class="bg-[#0d1322]/80 border border-white/10 rounded-2xl shadow-lg shadow-black/25 p-4 flex flex-col sm:flex-row gap-4">
        <div class="w-full sm:w-24 h-24 rounded-xl bg-[#0f172a] overflow-hidden border border-white/10">
          <img src="${product.img}" alt="${product.nombre}" class="w-full h-full object-cover" loading="lazy">
        </div>

        <div class="flex-1 space-y-1 text-white">
          <h3 class="font-bold text-lg">${product.nombre}</h3>
          <p class="text-white/70 text-sm">${product.desc}</p>
          <p class="text-amber-200 font-bold mt-1">S/ ${product.precio} c/u</p>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="updateQty('${product.id}', ${qty - 1})"
            class="w-9 h-9 rounded-full border border-white/20 text-white hover:border-white/40">-</button>
          <span class="font-semibold w-8 inline-block text-center text-white">${qty}</span>
          <button onclick="updateQty('${product.id}', ${qty + 1})"
            class="w-9 h-9 rounded-full border border-white/20 text-white hover:border-white/40">+</button>
        </div>

        <div class="text-right text-white space-y-1">
          <p class="font-bold text-lg">S/ ${subtotal.toFixed(2)}</p>
          <button onclick="removeFromCart('${product.id}')"
            class="text-red-300 hover:text-red-200 text-sm mt-1 underline">Eliminar</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (totalTag) totalTag.textContent = "S/ " + total.toFixed(2);
}

renderCart();
updateCartCount();
