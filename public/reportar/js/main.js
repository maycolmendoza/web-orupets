import { analyzeImage } from './ia.js';
import { uploadToSupabase, saveReportToSupabase } from './supabase.js';

const photoInput = document.getElementById('photo-input');
const photoDrop = document.getElementById('photo-drop');
const preview = document.getElementById('photo-preview');
const previewImg = document.getElementById('preview-img');
const fileMeta = document.getElementById('file-meta');
const analyzeBtn = document.getElementById('analyze-btn');
const submitBtn = document.getElementById('submit-btn');
const analyzeStatus = document.getElementById('analyze-status');
const locationBtn = document.getElementById('gps-btn');
const locationInput = document.getElementById('location-input');
const locationStatus = document.getElementById('location-status');
const descriptionInput = document.getElementById('description');
const resultType = document.getElementById('result-type');
const resultBreed = document.getElementById('result-breed');
const resultNsfw = document.getElementById('result-nsfw');
const confidenceText = document.getElementById('confidence-text');

let selectedFile = null;
let analysisResult = null;
let gpsLocation = null;

function showError(msg) {
  analyzeStatus.textContent = msg;
  analyzeStatus.style.color = '#ef4444';
}

function showResults(data) {
  resultType.textContent = data.animalType !== 'other'
    ? `${data.animalType} (${(data.animalConfidence * 100).toFixed(1)}%)`
    : 'No identificado';
  resultBreed.textContent = data.breed;
  resultNsfw.textContent = `${(1 - data.nsfwConfidence).toFixed(2)} seguro / ${(data.nsfwConfidence * 100).toFixed(1)}% NSFW`;
  resultNsfw.className = data.nsfwConfidence > 0.4 ? 'badge-red' : 'badge-green';
  confidenceText.textContent = `Raza confianza: ${(data.breedConfidence * 100).toFixed(1)}%`;
  analyzeStatus.style.color = '#9fb2d9';
}

async function getGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocalización no disponible en este navegador.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('No se pudo obtener tu ubicación.')),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function resetPreview() {
  preview.classList.add('empty');
  previewImg.style.display = 'none';
  previewImg.src = '';
  fileMeta.textContent = 'Ningún archivo seleccionado.';
  analysisResult = null;
  analyzeStatus.textContent = 'Esperando una foto para analizar.';
  confidenceText.textContent = '';
}

function handleFile(file) {
  if (!file) return resetPreview();
  selectedFile = file;
  fileMeta.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.onload = () => URL.revokeObjectURL(url);
  previewImg.style.display = 'block';
  preview.classList.remove('empty');
}

photoDrop.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', (ev) => {
  const [file] = ev.target.files || [];
  handleFile(file);
});
photoDrop.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  photoDrop.style.borderColor = '#f6c344';
});
photoDrop.addEventListener('dragleave', () => {
  photoDrop.style.borderColor = 'rgba(255,255,255,0.18)';
});
photoDrop.addEventListener('drop', (ev) => {
  ev.preventDefault();
  photoDrop.style.borderColor = 'rgba(255,255,255,0.18)';
  const file = ev.dataTransfer.files?.[0];
  handleFile(file);
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return showError('Por favor selecciona una foto primero.');
  analyzeStatus.style.color = '#9fb2d9';
  analyzeStatus.textContent = 'Analizando imagen con IA en tu navegador...';
  analyzeBtn.disabled = true;
  submitBtn.disabled = true;
  try {
    analysisResult = await analyzeImage(selectedFile);
    if (analysisResult.nsfwConfidence > 0.5) {
      showError('La imagen parece inapropiada. Sube otra foto.');
      return;
    }
    showResults(analysisResult);
    analyzeStatus.textContent = 'Análisis completado.';
  } catch (err) {
    console.error(err);
    showError(err.message || 'Ocurrió un error durante el análisis.');
  } finally {
    analyzeBtn.disabled = false;
    submitBtn.disabled = false;
  }
});

locationBtn.addEventListener('click', async () => {
  locationStatus.textContent = 'Solicitando ubicación...';
  try {
    gpsLocation = await getGPSLocation();
    locationInput.value = `${gpsLocation.lat.toFixed(6)}, ${gpsLocation.lng.toFixed(6)}`;
    locationStatus.textContent = 'Ubicación añadida.';
    locationStatus.style.color = '#9fb2d9';
  } catch (err) {
    locationStatus.textContent = err.message;
    locationStatus.style.color = '#ef4444';
  }
});

submitBtn.addEventListener('click', async () => {
  if (!selectedFile) return showError('Debes subir una foto para enviar el reporte.');
  if (!analysisResult) return showError('Analiza la foto antes de enviar.');
  if (analysisResult.nsfwConfidence > 0.5) return showError('No podemos enviar contenido marcado como NSFW.');

  analyzeStatus.style.color = '#9fb2d9';
  analyzeStatus.textContent = 'Subiendo a Supabase...';
  submitBtn.disabled = true;
  analyzeBtn.disabled = true;

  try {
    const timestamp = Date.now();
    const safeName = selectedFile.name.replace(/\s+/g, '_');
    const path = `reports/${timestamp}_${safeName}`;
    const imageUrl = await uploadToSupabase(selectedFile, path);

    const payload = {
      image_url: imageUrl,
      animal_type: analysisResult.animalType,
      breed: analysisResult.breed,
      confidence: analysisResult.animalConfidence,
      lat: gpsLocation?.lat || null,
      lng: gpsLocation?.lng || null,
      description: descriptionInput.value.trim() || null,
    };

    await saveReportToSupabase(payload);
    analyzeStatus.textContent = '¡Reporte enviado con éxito!';
    analyzeStatus.style.color = '#14f195';
    confidenceText.textContent = '';
  } catch (err) {
    console.error(err);
    showError(err.message || 'No pudimos guardar el reporte.');
  } finally {
    submitBtn.disabled = false;
    analyzeBtn.disabled = false;
  }
});

resetPreview();
