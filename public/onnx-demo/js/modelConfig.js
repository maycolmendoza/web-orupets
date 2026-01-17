// Configuracion y helpers para decodificar YOLO y listas de clases/razas

export const YOLO_CONFIG = {
  inputSize: 640,
  // Para un modelo tipo YOLOv8n: 3 escalas, stride 8/16/32
  strides: [8, 16, 32],
  anchors: [
    [10, 13, 16, 30, 33, 23],   // stride 8
    [30, 61, 62, 45, 59, 119],  // stride 16
    [116, 90, 156, 198, 373, 326] // stride 32
  ],
  iouThreshold: 0.45,
  scoreThreshold: 0.25,
  maxDetections: 20
};

// Lista de razas de ejemplo: remplaza por la lista real de tu modelo
export const BREEDS = [
  "beagle", "bulldog", "chihuahua", "labrador_retriever", "german_shepherd",
  "persian_cat", "siamese_cat", "maine_coon", "ragdoll", "sphynx"
];

// NMS helper
export function nonMaxSuppression(boxes, scores, iouThreshold, maxDetections) {
  const idxs = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const selected = [];
  while (idxs.length && selected.length < maxDetections) {
    const current = idxs.shift();
    selected.push(current);
    const rest = [];
    for (const idx of idxs) {
      const iou = boxIoU(boxes[current], boxes[idx]);
      if (iou < iouThreshold) rest.push(idx);
    }
    idxs.splice(0, idxs.length, ...rest);
  }
  return selected;
}

function boxIoU(a, b) {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);
  const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
  if (interArea === 0) return 0;
  const areaA = (ax2 - ax1) * (ay2 - ay1);
  const areaB = (bx2 - bx1) * (by2 - by1);
  return interArea / (areaA + areaB - interArea);
}

// Decodifica salida YOLO [1, N, 85] -> cajas, scores
export function decodeYOLO(output, config = YOLO_CONFIG) {
  const { inputSize, scoreThreshold, iouThreshold, maxDetections } = config;
  const boxes = [];
  const scores = [];
  const data = output.data;
  const n = output.dims[1];
  const stride = 85; // cx, cy, w, h, obj + 80 classes (suponiendo)

  for (let i = 0; i < n; i++) {
    const offset = i * stride;
    const obj = data[offset + 4];
    if (obj < scoreThreshold) continue;
    let maxClass = 0;
    let maxScore = -Infinity;
    for (let c = 0; c < 80; c++) {
      const conf = data[offset + 5 + c];
      if (conf > maxScore) {
        maxScore = conf;
        maxClass = c;
      }
    }
    const score = obj * maxScore;
    if (score < scoreThreshold) continue;

    const cx = data[offset];
    const cy = data[offset + 1];
    const w = data[offset + 2];
    const h = data[offset + 3];
    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    boxes.push([x1, y1, x2, y2]);
    scores.push(score);
  }

  const keep = nonMaxSuppression(boxes, scores, iouThreshold, maxDetections);
  return keep.map(idx => ({
    box: boxes[idx],
    score: scores[idx]
  }));
}
