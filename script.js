// --- Firebase Config & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyC0B77pFJlPlKh19AfMrZSToSh_BV7NM6g",
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
    document.addEventListener('pointermove', (e) => {
      if(!this.holdingPaper) return;

      if(!this.rotating) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        
        this.velX = this.mouseX - this.prevMouseX;
        this.velY = this.mouseY - this.prevMouseY;
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

      paper.style.transform = `translateX(${this.currentPaperX}px) translateY(${this.currentPaperY}px) rotateZ(${this.rotation}deg)`;
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
    });

    window.addEventListener('pointerup', () => {
      this.holdingPaper = false;
      this.rotating = false;
    });

    // Support for 2-finger touch rotation (mostly on Safari)
    paper.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      this.rotating = true;
    });
    paper.addEventListener('gestureend', () => {
      this.rotating = false;
    });
  }
}

const papers = Array.from(document.querySelectorAll('.paper'));

function attachDeleteButton(paper) {
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '✖';
  // Prevent drag sequence from capturing the click
  deleteBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); 
  });
  deleteBtn.addEventListener('click', () => {
    paper.remove();
  });
  paper.appendChild(deleteBtn);
}

papers.forEach(paper => {
  const p = new Paper();
  p.init(paper);
  attachDeleteButton(paper);
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
  const bgColor = bgColorInput.value;
  const text = textInput.value;
  const imageFile = imageInput.files[0];
  const paperBgFile = paperBgImageInput ? paperBgImageInput.files[0] : null;

  const newPaper = document.createElement('div');
  newPaper.className = `paper ${shape !== 'square' ? shape : ''}`;
  
  if (shape !== 'polaroid') {
    newPaper.style.backgroundColor = bgColor;
    // Remove the texture background image so customized color shows cleanly
    newPaper.style.backgroundImage = 'none';
  }

  let contentHtml = '';
  
  if (text) {
    contentHtml += `<p class="p1" style="font-family: ${fontStyle.includes(' ') && !fontStyle.includes(',') ? `'${fontStyle}'` : fontStyle}, cursive; color: ${fontColor};">${text.replace(/\n/g, '<br>')}</p>`;
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
  document.body.appendChild(newPaper);
  
  // Initialize drag logic
  const p = new Paper();
  p.init(newPaper);
  attachDeleteButton(newPaper);
  
  // Reset modal
  textInput.value = '';
  imageInput.value = '';
  shapeInput.value = 'square';
  if (fontInput) fontInput.value = 'Zeyada';
  if (fontColorInput) fontColorInput.value = '#000064';
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
        document.body.style.backgroundImage = `url(${event.target.result})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
      };
      reader.readAsDataURL(file);
    }
  });
}

// --- Share / Sync Logic & Serialization ---

function serializePapers() {
  const papers = document.querySelectorAll('.paper');
  const data = [];
  papers.forEach(p => {
    const shapeClasses = Array.from(p.classList).filter(c => c !== 'paper' && !c.includes('dragging')).join(' ');
    data.push({
      shapeClasses: shapeClasses,
      htmlContent: p.innerHTML,
      bgColor: p.style.backgroundColor,
      bgImage: p.style.backgroundImage,
      transform: p.style.transform,
      zIndex: p.style.zIndex
    });
  });
  return data;
}

function deserializePapers(dataArray) {
  const existingPapers = document.querySelectorAll('.paper');
  existingPapers.forEach(p => p.remove());

  dataArray.forEach(item => {
    const newPaper = document.createElement('div');
    newPaper.className = `paper ${item.shapeClasses}`;
    
    if (item.bgColor) newPaper.style.backgroundColor = item.bgColor;
    if (item.bgImage) newPaper.style.backgroundImage = item.bgImage;
    if (item.transform) newPaper.style.transform = item.transform;
    if (item.zIndex) newPaper.style.zIndex = item.zIndex;

    newPaper.innerHTML = item.htmlContent;
    document.body.appendChild(newPaper);
    
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