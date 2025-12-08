import { analyzeImage } from './ia.js';
import { uploadToSupabase, saveReportToSupabase, supabaseConfigured } from './supabase.js';

const photoInput = document.getElementById('photo-input');
const photoDrop = document.getElementById('photo-drop');
const preview = document.getElementById('photo-preview');
const previewImg = document.getElementById('preview-img');
const fileMeta = document.getElementById('file-meta');
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
const supabaseNotice = document.getElementById('supabase-notice');

let selectedFile = null;
let analysisResult = null;
let gpsLocation = null;
let isAnalyzing = false;
let queuedAnalysis = false;

function showError(msg) {
  analyzeStatus.textContent = msg;
  analyzeStatus.style.color = '#ef4444';
  resultType.textContent = 'Reintenta';
  resultBreed.textContent = '-';
  resultNsfw.textContent = 'Bloqueado';
  resultNsfw.className = 'badge-red';
  confidenceText.textContent = '';
  submitBtn.disabled = true;
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
  submitBtn.disabled = false;
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
  resultType.textContent = 'Sube una foto';
  resultBreed.textContent = '-';
  resultNsfw.textContent = 'Sin revisar';
  submitBtn.disabled = true;
}

if (!supabaseConfigured && supabaseNotice) {
  supabaseNotice.textContent = 'Modo demo: la IA funciona, el envío se simula sin Supabase. Configura las claves para guardar de verdad.';
  supabaseNotice.style.color = '#f6c344';
  analyzeStatus.textContent = 'Modo demo activo. Sube una foto para analizar.';
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
  queuedAnalysis = true;
  startAnalysis();
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

async function startAnalysis() {
  if (isAnalyzing) {
    queuedAnalysis = true;
    return;
  }
  queuedAnalysis = false;
  if (!selectedFile) return showError('Por favor selecciona una foto primero.');
  isAnalyzing = true;
  submitBtn.disabled = true;
  analyzeStatus.style.color = '#9fb2d9';
  analyzeStatus.textContent = 'Analizando la imagen automáticamente...';
  resultType.textContent = 'Analizando';
  resultBreed.textContent = 'Analizando';
  resultNsfw.textContent = 'Analizando';
  resultNsfw.className = '';

  try {
    const result = await analyzeImage(selectedFile);

    if (result.nsfwConfidence > 0.5) {
      analysisResult = null;
      return showError('La imagen parece inapropiada. Sube otra foto diferente.');
    }

    if (result.animalType === 'other') {
      analysisResult = null;
      return showError('Solo aceptamos fotos de perros o gatos para este reporte.');
    }

    analysisResult = result;
    showResults(result);
    analyzeStatus.textContent = 'Listo, detectamos a tu mascota.';
  } catch (err) {
    console.error(err);
    analysisResult = null;
    showError(err.message || 'Ocurrió un error durante el análisis.');
  } finally {
    isAnalyzing = false;
    if (queuedAnalysis) startAnalysis();
  }
}

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
  if (isAnalyzing) return showError('Espera a que terminemos de analizar la foto.');
  if (!analysisResult) return showError('Necesitamos validar que sea perro o gato antes de enviar.');
  if (analysisResult.nsfwConfidence > 0.5) return showError('No podemos enviar contenido marcado como NSFW.');

  analyzeStatus.style.color = '#9fb2d9';
  analyzeStatus.textContent = 'Subiendo a Supabase...';
  submitBtn.disabled = true;

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
    analyzeStatus.textContent = supabaseConfigured
      ? '¡Reporte enviado con éxito!'
      : 'Envío simulado. Configura Supabase para guardar el reporte.';
    analyzeStatus.style.color = '#14f195';
    confidenceText.textContent = '';
  } catch (err) {
    console.error(err);
    showError(err.message || 'No pudimos guardar el reporte.');
  } finally {
    submitBtn.disabled = false;
  }
});

resetPreview();
