// --- Firebase Config & Initialization ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0B77pFJlPIkH19AfMrZSToSh_BV7NM6g",
  authDomain: "duck-duck-project.firebaseapp.com",
  databaseURL: "https://duck-duck-project-default-rtdb.firebaseio.com",
  projectId: "duck-duck-project",
  storageBucket: "duck-duck-project.firebasestorage.app",
  messagingSenderId: "1088695579347",
  appId: "1:1088695579347:web:d0a07b5b17898625145a26",
  measurementId: "G-P0B7P4X8RD"
};

let database;
try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('...')) {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
  }
} catch (e) {
  console.log("Firebase not configured correctly yet:", e);
}

// --- Canvas (Infinite Board) ---
const canvas = document.getElementById('canvas');
let canvasX = -2000; // start offset so papers appear near center of 6000px canvas
let canvasY = -2000;
let canvasZoom = 1;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;

function updateCanvasTransform() {
  canvas.style.transform = `translate(${canvasX}px, ${canvasY}px) scale(${canvasZoom})`;
}
updateCanvasTransform();

// --- Canvas Pan (drag on empty canvas area) with momentum ---
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panVelX = 0;
let panVelY = 0;
let panAnimFrame = 0;

// Momentum animation
function animatePanMomentum() {
  if (Math.abs(panVelX) > 0.5 || Math.abs(panVelY) > 0.5) {
    canvasX += panVelX;
    canvasY += panVelY;
    panVelX *= 0.92; // friction
    panVelY *= 0.92;
    updateCanvasTransform();
    panAnimFrame = requestAnimationFrame(animatePanMomentum);
  } else {
    panVelX = 0;
    panVelY = 0;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  // Only pan if clicking directly on the canvas (not on a paper)
  if (e.target === canvas) {
    isPanning = true;
    cancelAnimationFrame(panAnimFrame); // stop any ongoing momentum
    panVelX = 0;
    panVelY = 0;
    panStartX = e.clientX;
    panStartY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!isPanning) return;
  e.preventDefault();
  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;
  // Smooth velocity tracking (blend current with previous for smoother feel)
  panVelX = panVelX * 0.3 + dx * 0.7;
  panVelY = panVelY * 0.3 + dy * 0.7;
  canvasX += dx;
  canvasY += dy;
  panStartX = e.clientX;
  panStartY = e.clientY;
  updateCanvasTransform();
});

canvas.addEventListener('pointerup', (e) => {
  if (isPanning) {
    isPanning = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = 'grab';
    // Start momentum animation
    panAnimFrame = requestAnimationFrame(animatePanMomentum);
  }
});

canvas.style.cursor = 'grab';

// --- Canvas Zoom (scroll wheel) ---
document.addEventListener('wheel', (e) => {
  // Don't zoom when interacting with modals
  if (e.target.closest('.modal-overlay') || e.target.closest('.modal')) return;
  
  e.preventDefault();
  
  const zoomSpeed = 0.001;
  const delta = -e.deltaY * zoomSpeed;
  const oldZoom = canvasZoom;
  canvasZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, canvasZoom + delta * canvasZoom));
  
  // Zoom toward mouse position
  const rect = document.body.getBoundingClientRect();
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  const zoomRatio = canvasZoom / oldZoom;
  canvasX = mouseX - (mouseX - canvasX) * zoomRatio;
  canvasY = mouseY - (mouseY - canvasY) * zoomRatio;
  
  updateCanvasTransform();
}, { passive: false });

// --- Canvas Zoom (pinch on mobile) ---
let lastPinchDist = 0;
let lastPinchCenterX = 0;
let lastPinchCenterY = 0;

document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    lastPinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    lastPinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    
    // Pan with two fingers
    const panDx = centerX - lastPinchCenterX;
    const panDy = centerY - lastPinchCenterY;
    canvasX += panDx;
    canvasY += panDy;
    lastPinchCenterX = centerX;
    lastPinchCenterY = centerY;
    
    // Zoom with pinch
    if (lastPinchDist > 0) {
      const oldZoom = canvasZoom;
      const scale = dist / lastPinchDist;
      canvasZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, canvasZoom * scale));
      
      const zoomRatio = canvasZoom / oldZoom;
      canvasX = centerX - (centerX - canvasX) * zoomRatio;
      canvasY = centerY - (centerY - canvasY) * zoomRatio;
    }
    
    lastPinchDist = dist;
    updateCanvasTransform();
  }
}, { passive: false });

// --- Paper Class ---
let highestZ = 1;

class Paper {
  holdingPaper = false;
  mouseTouchX = 0;
  mouseTouchY = 0;
  mouseX = 0;
  mouseY = 0;
  prevMouseX = 0;
  prevMouseY = 0;
  velX = 0;
  velY = 0;
  rotation = Math.random() * 30 - 15;
  currentPaperX = 0;
  currentPaperY = 0;
  rotating = false;

  init(paper) {
    this.updateTransform(paper);

    document.addEventListener('pointermove', (e) => {
      if(!this.holdingPaper) return;

      if(!this.rotating) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        
        this.velX = (this.mouseX - this.prevMouseX) / canvasZoom;
        this.velY = (this.mouseY - this.prevMouseY) / canvasZoom;
      }
        
      const dirX = e.clientX - this.mouseTouchX;
      const dirY = e.clientY - this.mouseTouchY;
      const dirLength = Math.sqrt(dirX*dirX+dirY*dirY);
      const dirNormalizedX = dirX / dirLength;
      const dirNormalizedY = dirY / dirLength;

      const angle = Math.atan2(dirNormalizedY, dirNormalizedX);
      let degrees = 180 * angle / Math.PI;
      degrees = (360 + Math.round(degrees)) % 360;
      if(this.rotating) {
        this.rotation = degrees;
      }

      if(this.holdingPaper && !this.rotating) {
        this.currentPaperX += this.velX;
        this.currentPaperY += this.velY;
      }
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;

      this.updateTransform(paper);
    });

    paper.addEventListener('pointerdown', (e) => {
      if(this.holdingPaper) return; 
      this.holdingPaper = true;
      
      paper.style.zIndex = highestZ;
      highestZ += 1;
      
      if(e.button === 0 || e.pointerType === 'touch') {
        this.mouseTouchX = e.clientX;
        this.mouseTouchY = e.clientY;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      }
      if(e.button === 2) {
        this.rotating = true;
      }
      
      // Stop canvas panning when interacting with a paper
      e.stopPropagation();
    });

    window.addEventListener('pointerup', () => {
      this.holdingPaper = false;
      this.rotating = false;
    });

    paper.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      this.rotating = true;
    });
    paper.addEventListener('gestureend', () => {
      this.rotating = false;
    });
  }

  updateTransform(paper) {
    paper.style.transform = `translateX(${this.currentPaperX}px) translateY(${this.currentPaperY}px) rotateZ(${this.rotation}deg)`;
  }
}

// --- Resize Handle (Width & Height) ---
function attachResizeHandle(paper, paperInstance) {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.innerHTML = '⤡';
  
  let resizing = false;
  let startX, startY, startW, startH;

  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = paper.offsetWidth;
    startH = paper.offsetHeight;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    e.stopPropagation();
    const dx = (e.clientX - startX) / canvasZoom;
    const dy = (e.clientY - startY) / canvasZoom;
    const newW = Math.max(60, startW + dx);
    const newH = Math.max(40, startH + dy);
    paper.style.width = newW + 'px';
    paper.style.height = newH + 'px';
  });

  handle.addEventListener('pointerup', (e) => {
    resizing = false;
    handle.releasePointerCapture(e.pointerId);
  });

  paper.appendChild(handle);
}

// --- Rotate Handle ---
function attachRotateHandle(paper, paperInstance) {
  const handle = document.createElement('div');
  handle.className = 'rotate-handle';
  handle.innerHTML = '🔄';
  
  let rotating = false;
  let startX, startRot;

  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    rotating = true;
    startX = e.clientX;
    startRot = paperInstance.rotation;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!rotating) return;
    e.stopPropagation();
    const dx = (e.clientX - startX) / canvasZoom;
    paperInstance.rotation = startRot + dx * 0.5;
    paperInstance.updateTransform(paper);
  });

  handle.addEventListener('pointerup', (e) => {
    rotating = false;
    handle.releasePointerCapture(e.pointerId);
  });

  paper.appendChild(handle);
}

// --- Delete Button ---
function attachDeleteButton(paper) {
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '✖';
  deleteBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); 
  });
  deleteBtn.addEventListener('click', () => {
    paper.remove();
  });
  paper.appendChild(deleteBtn);
}

// --- Init existing papers ---
const papers = Array.from(document.querySelectorAll('.paper'));
papers.forEach(paper => {
  const p = new Paper();
  p.init(paper);
  attachDeleteButton(paper);
  attachResizeHandle(paper, p);
});

// --- Modal and FAB Logic ---
const fab = document.getElementById('addPageFab');
const modalOverlay = document.getElementById('addPageModal');
const cancelBtn = document.getElementById('cancelPageBtn');
const confirmBtn = document.getElementById('confirmPageBtn');

const textInput = document.getElementById('paperText');
const imageInput = document.getElementById('paperImage');
const shapeInput = document.getElementById('paperShape');
const fontInput = document.getElementById('paperFont');
const fontColorInput = document.getElementById('paperFontColor');
const bgColorInput = document.getElementById('paperBgColor');
const paperBgImageInput = document.getElementById('paperBgImage');
const fontSizeInput = document.getElementById('paperFontSize');
const fontSizeVal = document.getElementById('paperFontSizeVal');
if(fontSizeInput) {
  fontSizeInput.addEventListener('input', (e) => fontSizeVal.innerText = e.target.value + 'px');
}
const widthInput = document.getElementById('paperWidth');
const widthVal = document.getElementById('paperWidthVal');
if(widthInput) {
  widthInput.addEventListener('input', (e) => widthVal.innerText = e.target.value + 'px');
}
const heightInput = document.getElementById('paperHeight');
const heightVal = document.getElementById('paperHeightVal');
if(heightInput) {
  heightInput.addEventListener('input', (e) => {
    heightVal.innerText = parseInt(e.target.value) === 0 ? 'Auto' : e.target.value + 'px';
  });
}
const rotationInput = document.getElementById('paperRotation');
const rotationVal = document.getElementById('paperRotationVal');
if(rotationInput) {
  rotationInput.addEventListener('input', (e) => rotationVal.innerText = e.target.value + '°');
}

fab.addEventListener('click', () => {
  modalOverlay.classList.add('active');
});

cancelBtn.addEventListener('click', () => {
  modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('active');
  }
});

confirmBtn.addEventListener('click', async () => {
  const shape = shapeInput.value;
  const fontStyle = fontInput ? fontInput.value : 'Zeyada';
  const fontColor = fontColorInput ? fontColorInput.value : '#000064';
  const fontSize = fontSizeInput ? fontSizeInput.value : '50';
  const paperW = widthInput ? parseInt(widthInput.value) : 200;
  const paperH = heightInput ? parseInt(heightInput.value) : 0;
  const bgColor = bgColorInput.value;
  const text = textInput.value;
  const imageFile = imageInput.files[0];
  const paperBgFile = paperBgImageInput ? paperBgImageInput.files[0] : null;

  const newPaper = document.createElement('div');
  newPaper.className = `paper ${shape !== 'square' ? shape : ''}`;
  
  // Position new papers near the center of the visible area
  const viewCenterX = (-canvasX + window.innerWidth / 2) / canvasZoom;
  const viewCenterY = (-canvasY + window.innerHeight / 2) / canvasZoom;
  newPaper.style.left = (viewCenterX - 100 + Math.random() * 200) + 'px';
  newPaper.style.top = (viewCenterY - 100 + Math.random() * 200) + 'px';

  // Apply width/height
  newPaper.style.width = paperW + 'px';
  if (paperH > 0) {
    newPaper.style.height = paperH + 'px';
  }

  if (shape !== 'polaroid') {
    newPaper.style.backgroundColor = bgColor;
    newPaper.style.backgroundImage = 'none';
  }

  let contentHtml = '';
  
  if (text) {
    contentHtml += `<p class="p1" style="font-family: ${fontStyle.includes(' ') && !fontStyle.includes(',') ? `'${fontStyle}'` : fontStyle}, cursive; color: ${fontColor}; font-size: ${fontSize}px;">${text.replace(/\n/g, '<br>')}</p>`;
  }

  const readDataUrl = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

  if (paperBgFile && shape !== 'polaroid') {
    const bgDataUrl = await readDataUrl(paperBgFile);
    newPaper.style.backgroundImage = `url(${bgDataUrl})`;
    newPaper.style.backgroundSize = 'cover';
    newPaper.style.backgroundPosition = 'center center';
  }

  if (imageFile) {
    const imgDataUrl = await readDataUrl(imageFile);
    const imgHtml = `<img src="${imgDataUrl}" style="pointer-events: none;" />`;
    if (shape === 'polaroid') {
      contentHtml = imgHtml + contentHtml;
    } else {
      contentHtml += imgHtml;
    }
  }

  newPaper.innerHTML = contentHtml;
  
  // Append to canvas instead of body
  canvas.appendChild(newPaper);
  
  const p = new Paper();
  // Apply rotation from slider
  const rotVal = rotationInput ? parseInt(rotationInput.value) : 0;
  p.rotation = rotVal;
  p.init(newPaper);
  attachDeleteButton(newPaper);
  attachResizeHandle(newPaper, p);
  attachRotateHandle(newPaper, p);
  
  // Reset modal
  textInput.value = '';
  imageInput.value = '';
  shapeInput.value = 'square';
  if (fontInput) fontInput.value = 'Zeyada';
  if (fontColorInput) fontColorInput.value = '#000064';
  if (fontSizeInput) { fontSizeInput.value = 50; fontSizeVal.innerText = '50px'; }
  if (widthInput) { widthInput.value = 200; widthVal.innerText = '200px'; }
  if (heightInput) { heightInput.value = 0; heightVal.innerText = 'Auto'; }
  if (rotationInput) { rotationInput.value = 0; rotationVal.innerText = '0°'; }
  bgColorInput.value = '#ffc0cb';
  if (paperBgImageInput) paperBgImageInput.value = '';
  modalOverlay.classList.remove('active');
});

// --- Background Change Logic ---
const bgImageInput = document.getElementById('bgImageInput');
if (bgImageInput) {
  bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        canvas.style.backgroundImage = `url(${event.target.result})`;
        canvas.style.backgroundSize = '100% 100%';
        canvas.style.backgroundPosition = 'center center';
      };
      reader.readAsDataURL(file);
    }
  });
}

// --- Share / Sync Logic & Serialization ---

function serializePapers() {
  const papers = canvas.querySelectorAll('.paper');
  const data = [];
  papers.forEach(p => {
    const shapeClasses = Array.from(p.classList).filter(c => c !== 'paper' && !c.includes('dragging')).join(' ');
    data.push({
      shapeClasses: shapeClasses,
      htmlContent: p.innerHTML,
      bgColor: p.style.backgroundColor,
      bgImage: p.style.backgroundImage,
      bgSize: p.style.backgroundSize,
      bgPos: p.style.backgroundPosition,
      transform: p.style.transform,
      zIndex: p.style.zIndex,
      width: p.style.width,
      height: p.style.height,
      left: p.style.left,
      top: p.style.top
    });
  });
  return {
    items: data,
    globalBg: canvas.style.backgroundImage,
    canvasX: canvasX,
    canvasY: canvasY,
    canvasZoom: canvasZoom
  };
}

function deserializePapers(dataPayload) {
  const existingPapers = canvas.querySelectorAll('.paper');
  existingPapers.forEach(p => p.remove());

  const dataArray = Array.isArray(dataPayload) ? dataPayload : (dataPayload.items || []);

  if (!Array.isArray(dataPayload) && dataPayload.globalBg) {
    canvas.style.backgroundImage = dataPayload.globalBg;
  }

  if (!Array.isArray(dataPayload) && dataPayload.canvasX !== undefined) {
    canvasX = dataPayload.canvasX;
    canvasY = dataPayload.canvasY;
    canvasZoom = dataPayload.canvasZoom || 1;
    updateCanvasTransform();
  }

  dataArray.forEach(item => {
    const newPaper = document.createElement('div');
    newPaper.className = `paper ${item.shapeClasses}`;
    
    if (item.bgColor) newPaper.style.backgroundColor = item.bgColor;
    if (item.bgImage) newPaper.style.backgroundImage = item.bgImage;
    if (item.bgSize) newPaper.style.backgroundSize = item.bgSize;
    if (item.bgPos) newPaper.style.backgroundPosition = item.bgPos;
    if (item.transform) newPaper.style.transform = item.transform;
    if (item.zIndex) newPaper.style.zIndex = item.zIndex;
    if (item.width) newPaper.style.width = item.width;
    if (item.height) newPaper.style.height = item.height;
    if (item.left) newPaper.style.left = item.left;
    if (item.top) newPaper.style.top = item.top;

    newPaper.innerHTML = item.htmlContent;
    canvas.appendChild(newPaper);
    
    const p = new Paper();
    const transformStr = item.transform || "";
    const txMatch = transformStr.match(/translateX\(([-.\d]+)px\)/);
    const tyMatch = transformStr.match(/translateY\(([-.\d]+)px\)/);
    const rotMatch = transformStr.match(/rotateZ\(([-.\d]+)deg\)/);

    p.currentPaperX = txMatch ? parseFloat(txMatch[1]) : 0;
    p.currentPaperY = tyMatch ? parseFloat(tyMatch[1]) : 0;
    p.rotation = rotMatch ? parseFloat(rotMatch[1]) : (Math.random() * 30 - 15);
    
    p.init(newPaper);
    
    const delBtn = newPaper.querySelector('.delete-btn');
    if(delBtn) {
      delBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      delBtn.addEventListener('click', () => newPaper.remove());
    } else {
      attachDeleteButton(newPaper);
    }
    
    // Attach resize handle (remove any serialized ones first)
    const existingHandle = newPaper.querySelector('.resize-handle');
    if (existingHandle) existingHandle.remove();
    attachResizeHandle(newPaper, p);
  });
}

const shareFab = document.getElementById('shareFab');
const syncModal = document.getElementById('syncModal');
const closeSyncBtn = document.getElementById('closeSyncBtn');
const syncLoadBtn = document.getElementById('syncLoadBtn');
const syncGenerateBtn = document.getElementById('syncGenerateBtn');
const syncLoadInput = document.getElementById('syncLoadInput');
const syncCodeOutputBox = document.getElementById('syncCodeOutputBox');
const syncGeneratedCode = document.getElementById('syncGeneratedCode');
const syncCopyBtn = document.getElementById('syncCopyBtn');

if(shareFab) {
  shareFab.addEventListener('click', () => {
    syncModal.classList.add('active');
    syncCodeOutputBox.style.display = 'none';
    syncLoadInput.value = '';
  });

  closeSyncBtn.addEventListener('click', () => syncModal.classList.remove('active'));

  syncGenerateBtn.addEventListener('click', async () => {
     if (!database) {
       alert("لقد وضعت كود الـ Firebase الفارغ كمثال! يجب عليك إنشاء مشروع وتغيير الـ '...' بأكوادك الحقيقية لتعمل هذه الميزة.");
       return;
     }

     const data = serializePapers();
     
     syncGenerateBtn.innerText = "Saving to Database...";
     
     try {
       const fakeCode = Math.random().toString(36).substring(2, 7).toUpperCase();
       
       await Promise.race([
         database.ref('boards/' + fakeCode).set(data),
         new Promise((_, reject) => setTimeout(() => reject(new Error("تعذر الاتصال بقاعدة البيانات! الرجاء التأكد من أنك ضغطت 'Create Database' داخل Firebase وأنها 'Start in test mode'")), 8000))
       ]);
       
       syncGeneratedCode.innerText = fakeCode;
       syncCodeOutputBox.style.display = 'block';
     } catch (err) {
       console.error(err);
       alert("رسالة خطأ: " + err.message);
     }
     
     syncGenerateBtn.innerText = "Generate Code";
  });

  syncLoadBtn.addEventListener('click', async () => {
     const code = syncLoadInput.value.trim().toUpperCase();
     if (!code) return alert("Please enter a code!");
     if (!database) {
       alert("قاعدة البيانات غير متصلة بعد! تأكد من وضع أكوادك الحقيقية في ملف script.js");
       return;
     }
     
     syncLoadBtn.innerText = "Loading...";

     try {
       const snapshot = await database.ref('boards/' + code).once('value');
       const data = snapshot.val();
       if (data) {
         deserializePapers(data);
         syncModal.classList.remove('active');
         alert("Board loaded successfully!");
       } else {
         alert("الكود غير صحيح أو لا يوجد لوحة بهذا الكود!");
       }
     } catch (err) {
       console.error(err);
       alert("Error loading: " + err.message);
     }
     
     syncLoadBtn.innerText = "Load Papers";
  });

  syncCopyBtn.addEventListener('click', () => {
     navigator.clipboard.writeText(syncGeneratedCode.innerText);
     syncCopyBtn.innerText = "Copied!";
     setTimeout(() => syncCopyBtn.innerText = "Copy Code", 2000);
  });
}
