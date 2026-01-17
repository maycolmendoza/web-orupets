import { YOLO_CONFIG, BREEDS, decodeYOLO } from "./modelConfig.js";

// Rutas de modelos locales
const MODEL_PATHS = {
  detector: "../models/yolo_detector.onnx",
  animal: "../models/animal_classifier.onnx",
  breed: "../models/breed_classifier.onnx"
};

let sessions = {
  detector: null,
  animal: null,
  breed: null
};

const imageEl = document.getElementById("input-image");
const canvas = document.getElementById("overlay");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const fileInput = document.getElementById("file-input");
const demoBtn = document.getElementById("demo-btn");
const modalEl = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// Prepara canvas al tamaño de la imagen
function resizeCanvas() {
  canvas.width = imageEl.clientWidth;
  canvas.height = imageEl.clientHeight;
}
window.addEventListener("resize", resizeCanvas);

async function loadModels() {
  const wasmConfig = { executionProviders: ["wasm"], graphOptimizationLevel: "all" };
  sessions.detector = await ort.InferenceSession.create(MODEL_PATHS.detector, wasmConfig);
  sessions.animal = await ort.InferenceSession.create(MODEL_PATHS.animal, wasmConfig);
  sessions.breed = await ort.InferenceSession.create(MODEL_PATHS.breed, wasmConfig);
}

function preprocessImage(img, size) {
  const canvasTmp = document.createElement("canvas");
  canvasTmp.width = size;
  canvasTmp.height = size;
  const ctx = canvasTmp.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;
  const float32 = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    float32[i * 3] = data[i * 4] / 255;
    float32[i * 3 + 1] = data[i * 4 + 1] / 255;
    float32[i * 3 + 2] = data[i * 4 + 2] / 255;
  }
  return new ort.Tensor("float32", float32, [1, 3, size, size]);
}

async function runDetection(img) {
  const input = preprocessImage(img, YOLO_CONFIG.inputSize);
  const feeds = { [sessions.detector.inputNames[0]]: input };
  const output = await sessions.detector.run(feeds);
  const first = output[sessions.detector.outputNames[0]];
  const detections = decodeYOLO(first, YOLO_CONFIG);
  return detections;
}

async function runAnimalClassifier(crop) {
  const input = preprocessImage(crop, 224);
  const feeds = { [sessions.animal.inputNames[0]]: input };
  const out = await sessions.animal.run(feeds);
  const logits = out[sessions.animal.outputNames[0]].data;
  const probs = softmax(Array.from(logits));
  const classes = ["otro", "perro", "gato"];
  const idx = argmax(probs);
  return { label: classes[idx], score: probs[idx] };
}

async function runBreedClassifier(crop) {
  const input = preprocessImage(crop, 224);
  const feeds = { [sessions.breed.inputNames[0]]: input };
  const out = await sessions.breed.run(feeds);
  const logits = out[sessions.breed.outputNames[0]].data;
  const probs = softmax(Array.from(logits));
  const idx = argmax(probs);
  return { breed: BREEDS[idx] || "desconocida", score: probs[idx] };
}

function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}
function argmax(arr) {
  return arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
}

function drawBoundingBox(box, score, label) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#f6c343";
  ctx.lineWidth = 3;
  ctx.font = "16px Inter, sans-serif";
  ctx.fillStyle = "rgba(246,195,67,0.8)";

  const [x1, y1, x2, y2] = box;
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  const text = `${label} ${(score * 100).toFixed(1)}%`;
  const textWidth = ctx.measureText(text).width + 8;
  ctx.fillRect(x1, y1 - 22, textWidth, 20);
  ctx.fillStyle = "#0b1221";
  ctx.fillText(text, x1 + 4, y1 - 7);
}

function cropFromBox(img, box) {
  const [x1, y1, x2, y2] = box;
  const w = x2 - x1;
  const h = y2 - y1;
  const canvasTmp = document.createElement("canvas");
  canvasTmp.width = w;
  canvasTmp.height = h;
  const ctx = canvasTmp.getContext("2d");
  ctx.drawImage(img, x1, y1, w, h, 0, 0, w, h);
  const crop = new Image();
  crop.src = canvasTmp.toDataURL();
  return new Promise(resolve => {
    crop.onload = () => resolve(crop);
  });
}

function clearResults(msg) {
  statusEl.textContent = msg;
  detailsEl.innerHTML = "";
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function handleImage(img) {
  resizeCanvas();
  clearResults("Procesando...");

  const detections = await runDetection(img);
  if (!detections.length) {
    showModal("No es mascota", "No se detecto perro o gato en la imagen. Intenta otra foto.");
    clearResults("No se detecto mascota.");
    return;
  }
  // Tomar la deteccion con mayor score
  detections.sort((a, b) => b.score - a.score);
  const det = detections[0];
  // Escalar cajas a canvas (detecciones en escala 640)
  const scaleCanvasX = canvas.width / YOLO_CONFIG.inputSize;
  const scaleCanvasY = canvas.height / YOLO_CONFIG.inputSize;
  const scaledBoxCanvas = [
    det.box[0] * scaleCanvasX,
    det.box[1] * scaleCanvasY,
    det.box[2] * scaleCanvasX,
    det.box[3] * scaleCanvasY
  ];
  drawBoundingBox(scaledBoxCanvas, det.score, "animal");

  // Escala a tamaño natural para recorte
  const scaleNatX = img.naturalWidth / YOLO_CONFIG.inputSize;
  const scaleNatY = img.naturalHeight / YOLO_CONFIG.inputSize;
  const naturalBox = [
    det.box[0] * scaleNatX,
    det.box[1] * scaleNatY,
    det.box[2] * scaleNatX,
    det.box[3] * scaleNatY
  ];

  const crop = await cropFromBox(img, naturalBox);
  const animal = await runAnimalClassifier(crop);

  let breedResult = null;
  if (animal.label === "perro" || animal.label === "gato") {
    breedResult = await runBreedClassifier(crop);
  } else {
    showModal("No es perro/gato", "La imagen no parece ser de un perro o gato. Sube otra foto.");
    statusEl.textContent = "No se detecto perro/gato.";
    return;
  }

  statusEl.textContent = "Deteccion completa.";
  const items = [];
  items.push(`<li>Caja (px): ${naturalBox.map(v => v.toFixed(1)).join(", ")} <span class="pill">${(det.score*100).toFixed(1)}%</span></li>`);
  items.push(`<li>Tipo: ${animal.label} <span class="pill">${(animal.score*100).toFixed(1)}%</span></li>`);
  if (breedResult) {
    items.push(`<li>Raza: ${breedResult.breed} <span class="pill">${(breedResult.score*100).toFixed(1)}%</span></li>`);
    const edad = estimarEdadHeuristica(det, animal, img);
    items.push(`<li>Edad estimada (heuristica): ${edad}</li>`);
  } else {
    items.push(`<li>Raza: N/A</li>`);
  }
  detailsEl.innerHTML = items.join("");
}

function loadDemo() {
  // Imagen base64 pequeña de ejemplo (silhouette)
  const demo =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAYAAAD7h3OgAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEtUlEQVR4nO3csW3bMBCF4f1/6z1JJsqFiKiMWvF0/gD1zGOim6vrWHxj5Lr+37VE7LJkiRJkiRJkiRJOqTwH6W9d2v22nV1t2cZ15q73zjFes7uDh1Sm4fEJ9fXHn+Xl7/dp3f9vdObfX8xlf2rf7/voL9zzk6XVh7wF41yM2z9+ZeqD8b2j4B/2D2cuM9eXm4+pcjj2b08OKf9ur7Wv7Y6P3e8BVjWzCvVLqvVvrXu17+tXet+u/cdzZh/8nZOS87fFNVt/sVO33lDHXvH6YvRvfP9G0bXybgGtt/b3Dz5+V30TTe+Pjpfjfgz5V2W0s/H4uwB+f5Tv6U6Dn6bpnY8eh3tt8CqdvXy7oH+2YB/9F3yKDL7G9PULcptn0fFxuBf7ZgH/0XfIoMvsb09Qtyp2fh88pw/vn0lmYH/Nbn3/KDy+xsD+z8VhN2uq+GHD0xJ9P1f1Q7pL2S7xyOr3DP76lOvT3jFw+YG/NZqf/tfQQ++G/8jk7x2jD66NY7A8aF1j+w2D9rhn+YTvAyB8/PXQqM2yubd6h8+YDf1W1D3/4HgPvqoJfpeZb/ifPLp/A3pXQu9ML8b1lHQ3++B4D76qCX6XmW/4nzx6f4baPsJfCH/xZ3r+nFzA7+qt7f46vP6D8L3/79NP0PjvtX3YtJkiRJkiRJkiRJ0n8B7cRYI02yZgQAAAAASUVORK5CYII=";
  imageEl.src = demo;
}

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  imageEl.onload = () => handleImage(imageEl);
  imageEl.src = url;
});

demoBtn.addEventListener("click", () => {
  imageEl.onload = () => handleImage(imageEl);
  loadDemo();
});

modalClose.addEventListener("click", () => {
  modalEl.classList.add("hidden");
});

function showModal(title, body) {
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modalEl.classList.remove("hidden");
}

// Heuristica simple para edad (placeholder): usa area de caja y confianza
function estimarEdadHeuristica(det, animal, img) {
  const areaNorm = ((det.box[2] - det.box[0]) * (det.box[3] - det.box[1])) / (YOLO_CONFIG.inputSize * YOLO_CONFIG.inputSize);
  const conf = animal.score;
  const score = Math.min(1, Math.max(0, areaNorm * 0.5 + conf * 0.5));
  if (score > 0.7) return "adulto";
  if (score > 0.4) return "joven";
  return "cachorro";
}

// Inicio
(async () => {
  try {
    statusEl.textContent = "Cargando modelos...";
    await loadModels();
    statusEl.textContent = "Listo. Sube una imagen o usa la demo.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error cargando modelos. Revisa consola.";
  }
})();
