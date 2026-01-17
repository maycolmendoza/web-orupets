import { analyzeImage } from './ia.js';
import { uploadToSupabase, saveReportToSupabase, supabaseConfigured } from './supabase.js';

const photoInput = document.getElementById('foto-mascota');
const photoTrigger = document.getElementById('photo-trigger');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewImg = document.getElementById('photo-preview-img');
const photoFilename = document.getElementById('photo-filename');
const analyzeStatus = document.getElementById('analyze-status');
const submitBtn = document.getElementById('submit-btn');
const locationBtn = document.getElementById('btn-ubicacion');
const locationInput = document.getElementById('ubicacion');
const locationStatus = document.getElementById('ubicacion-status');
const descriptionInput = document.getElementById('mensaje');
const resultType = document.getElementById('result-type');
const resultBreed = document.getElementById('result-breed');
const resultNsfw = document.getElementById('result-nsfw');
const confidenceText = document.getElementById('confidence-text');
const supabaseNotice = document.getElementById('supabase-notice');
const statusHelper = document.getElementById('status-helper');
const modeHelper = document.getElementById('mode-helper');

let selectedFile = null;
let analysisResult = null;
let gpsLocation = null;
let isAnalyzing = false;
let queuedAnalysis = false;

function setStatus(message, color = '#cbd5e1') {
  if (analyzeStatus) {
    analyzeStatus.textContent = message;
    analyzeStatus.style.color = color;
  }
  if (statusHelper) statusHelper.textContent = message;
}

function showError(msg) {
  setStatus(msg, '#ef4444');
  resultType.textContent = 'Reintenta';
  resultBreed.textContent = '-';
  resultNsfw.textContent = 'Bloqueado';
  resultNsfw.className = 'text-red-400 font-semibold';
  confidenceText.textContent = '';
  submitBtn.disabled = true;
}

function showResults(data) {
  resultType.textContent = data.animalType !== 'other'
    ? `${data.animalType} (${(data.animalConfidence * 100).toFixed(1)}%)`
    : 'No identificado';
  resultBreed.textContent = data.breed;
  resultNsfw.textContent = `${(1 - data.nsfwConfidence).toFixed(2)} seguro / ${(data.nsfwConfidence * 100).toFixed(1)}% NSFW`;
  resultNsfw.className = data.nsfwConfidence > 0.4 ? 'text-red-400 font-semibold' : 'text-emerald-300 font-semibold';
  confidenceText.textContent = `Raza confianza: ${(data.breedConfidence * 100).toFixed(1)}%`;
  setStatus('Listo, detectamos a tu mascota.', '#9fb2d9');
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
  photoPreview?.classList.add('hidden');
  photoPreviewImg.src = '';
  photoFilename.textContent = '';
  analysisResult = null;
  setStatus('Sube una foto para analizar');
  confidenceText.textContent = '';
  resultType.textContent = 'Sin foto';
  resultBreed.textContent = '-';
  resultNsfw.textContent = 'Sin revisar';
  resultNsfw.className = '';
  submitBtn.disabled = true;
}

if (!supabaseConfigured && supabaseNotice) {
  supabaseNotice.textContent = 'Modo demo: simulamos subida y guardado cuando no hay claves de Supabase.';
  modeHelper.textContent = 'Configura las claves de Supabase para activar el guardado real.';
  setStatus('Modo demo activo. Sube una foto para analizar.');
}

function handleFile(file) {
  if (!file) return resetPreview();
  selectedFile = file;
  const url = URL.createObjectURL(file);
  photoPreviewImg.src = url;
  photoPreviewImg.onload = () => URL.revokeObjectURL(url);
  photoFilename.textContent = file.name;
  photoPreview?.classList.remove('hidden');
  queuedAnalysis = true;
  startAnalysis();
}

photoTrigger?.addEventListener('click', () => photoInput?.click());
photoInput?.addEventListener('change', (ev) => {
  const [file] = ev.target.files || [];
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
  setStatus('Analizando la imagen automáticamente...', '#9fb2d9');
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
  } catch (err) {
    console.error(err);
    analysisResult = null;
    showError(err.message || 'Ocurrió un error durante el análisis.');
  } finally {
    isAnalyzing = false;
    if (queuedAnalysis) startAnalysis();
  }
}

locationBtn?.addEventListener('click', async () => {
  locationStatus.textContent = 'Solicitando ubicación...';
  locationStatus.classList.remove('text-red-400');
  try {
    gpsLocation = await getGPSLocation();
    locationInput.value = `${gpsLocation.lat.toFixed(6)}, ${gpsLocation.lng.toFixed(6)}`;
    locationStatus.textContent = 'Ubicación añadida.';
    locationStatus.classList.add('text-slate-300');
  } catch (err) {
    locationStatus.textContent = err.message;
    locationStatus.classList.add('text-red-400');
  }
});

submitBtn?.addEventListener('click', async () => {
  if (!selectedFile) return showError('Debes subir una foto para enviar el reporte.');
  if (isAnalyzing) return showError('Espera a que terminemos de analizar la foto.');
  if (!analysisResult) return showError('Necesitamos validar que sea perro o gato antes de enviar.');
  if (analysisResult.nsfwConfidence > 0.5) return showError('No podemos enviar contenido marcado como NSFW.');

  setStatus('Subiendo a Supabase...', '#9fb2d9');
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
    setStatus(supabaseConfigured
      ? '¡Reporte enviado con éxito!'
      : 'Envío simulado. Configura Supabase para guardar el reporte real.', '#14f195');
    confidenceText.textContent = '';
  } catch (err) {
    console.error(err);
    showError(err.message || 'No pudimos guardar el reporte.');
  } finally {
    submitBtn.disabled = false;
  }
});

resetPreview();
