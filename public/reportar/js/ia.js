// IA pipeline con onnxruntime-web
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';

const MODEL_URLS = {
  animal: 'https://huggingface.co/ScottMueller/Cats_v_Dogs.ONNX/resolve/main/model.onnx',
  dog: './models/dog_breeds.onnx',
  cat: './models/cat_breeds.onnx',
  nsfw: './models/nsfw.onnx'
};

const DOG_BREEDS = [
  'labrador retriever', 'german shepherd', 'golden retriever', 'french bulldog', 'bulldog', 'poodle',
  'beagle', 'rottweiler', 'yorkshire terrier', 'doberman', 'siberian husky', 'pug', 'boxer', 'dachshund'
];

const CAT_BREEDS = [
  'siamese', 'persian', 'maine coon', 'ragdoll', 'british shorthair', 'bengal', 'sphynx', 'burmese', 'abyssinian'
];

let animalSession;
let dogBreedSession;
let catBreedSession;
let nsfwSession;

function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

async function loadSession(url) {
  return ort.InferenceSession.create(url, { executionProviders: ['wasm'] });
}

export function preprocessImage(image) {
  const size = 224;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const float = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    float[i] = data[i * 4] / 255; // R
    float[i + size * size] = data[i * 4 + 1] / 255; // G
    float[i + size * size * 2] = data[i * 4 + 2] / 255; // B
  }
  return new ort.Tensor('float32', float, [1, 3, size, size]);
}

export async function detectAnimalType(tensor) {
  if (!animalSession) {
    animalSession = await loadSession(MODEL_URLS.animal);
  }
  const inputName = animalSession.inputNames[0];
  const outputs = await animalSession.run({ [inputName]: tensor });
  const outputName = animalSession.outputNames[0];
  const data = Array.from(outputs[outputName].data);
  const probs = softmax(data);
  const labels = ['cat', 'dog', 'other'];
  const maxIdx = probs.indexOf(Math.max(...probs));
  return { label: labels[maxIdx] || 'other', confidence: probs[maxIdx] || 0 };
}

export async function detectDogBreed(tensor) {
  if (!dogBreedSession) {
    dogBreedSession = await loadSession(MODEL_URLS.dog);
  }
  const outputs = await dogBreedSession.run({ [dogBreedSession.inputNames[0]]: tensor });
  const data = Array.from(outputs[dogBreedSession.outputNames[0]].data);
  const probs = softmax(data);
  const idx = probs.indexOf(Math.max(...probs));
  const breed = DOG_BREEDS[idx] || `Raza #${idx + 1}`;
  return { breed, confidence: probs[idx] || 0 };
}

export async function detectCatBreed(tensor) {
  if (!catBreedSession) {
    catBreedSession = await loadSession(MODEL_URLS.cat);
  }
  const outputs = await catBreedSession.run({ [catBreedSession.inputNames[0]]: tensor });
  const data = Array.from(outputs[catBreedSession.outputNames[0]].data);
  const probs = softmax(data);
  const idx = probs.indexOf(Math.max(...probs));
  const breed = CAT_BREEDS[idx] || `Raza #${idx + 1}`;
  return { breed, confidence: probs[idx] || 0 };
}

export async function detectNSFW(tensor) {
  if (!nsfwSession) {
    nsfwSession = await loadSession(MODEL_URLS.nsfw);
  }
  const outputs = await nsfwSession.run({ [nsfwSession.inputNames[0]]: tensor });
  const data = Array.from(outputs[nsfwSession.outputNames[0]].data);
  // Algunos modelos NSFW devuelven 2 clases: [seguro, nsfw]
  const probs = data.length > 1 ? softmax(data) : [1 - data[0], data[0]];
  const nsfwScore = probs[1] ?? 0;
  return { nsfwScore };
}

export async function analyzeImage(file) {
  if (!file) throw new Error('Selecciona una foto primero.');
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = URL.createObjectURL(file);
  });

  const tensor = preprocessImage(image);
  const animal = await detectAnimalType(tensor);
  let breed = { breed: 'No detectado', confidence: 0 };
  if (animal.label === 'dog') {
    breed = await detectDogBreed(tensor);
  } else if (animal.label === 'cat') {
    breed = await detectCatBreed(tensor);
  }
  const nsfw = await detectNSFW(tensor);

  return {
    animalType: animal.label,
    animalConfidence: animal.confidence,
    breed: breed.breed,
    breedConfidence: breed.confidence,
    nsfwConfidence: nsfw.nsfwScore,
  };
}
