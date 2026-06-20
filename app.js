// DOM Elements
const bookTitleInput = document.getElementById('book-title');
const bookAuthorInput = document.getElementById('book-author');
const bookSynopsisInput = document.getElementById('book-synopsis');
const bookContentInput = document.getElementById('book-content');

const coverDropzone = document.getElementById('cover-dropzone');
const coverInput = document.getElementById('cover-input');
const coverPreviewWrapper = document.getElementById('cover-preview-wrapper');
const coverPreviewImg = document.getElementById('cover-preview-img');
const btnRemoveCover = document.getElementById('btn-remove-cover');
const uploaderPrompt = document.getElementById('uploader-prompt');

const charCounter = document.getElementById('char-counter');
const chapterCounter = document.getElementById('chapter-counter');
const chaptersListEmpty = document.getElementById('chapters-list-empty');
const chaptersList = document.getElementById('chapters-list');

const btnGenerate = document.getElementById('btn-generate');
const progressModal = document.getElementById('progress-modal');
const modalStatusText = document.getElementById('modal-status-text');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercent = document.getElementById('progress-percent');

// Force Book Title to uppercase
bookTitleInput.addEventListener('input', () => {
    bookTitleInput.value = bookTitleInput.value.toUpperCase();
});

// Application State
let uploadedCoverDataUrl = null;
let parsedChapters = [];
let parsedPreface = [];
let parseTimeout = null;

/* ----------------------------------------------------
   1. COVER IMAGE UPLOAD & PREVIEW LOGIC
   ---------------------------------------------------- */

// Open file picker on click
coverDropzone.addEventListener('click', (e) => {
    // Avoid triggering file picker when clicking the remove button
    if (e.target.closest('#btn-remove-cover')) return;
    coverInput.click();
});

// Cover file input changes
coverInput.addEventListener('change', () => {
    handleFiles(coverInput.files);
});

// Drag & drop handlers
coverDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    coverDropzone.classList.add('dragover');
});

['dragleave', 'dragend'].forEach(eventName => {
    coverDropzone.addEventListener(eventName, () => {
        coverDropzone.classList.remove('dragover');
    });
});

coverDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    coverDropzone.classList.remove('dragover');
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

// Process files
function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    
    // Validate image format
    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chỉ tải lên các định dạng ảnh (JPG, PNG, WEBP).');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedCoverDataUrl = e.target.result;
        coverPreviewImg.src = uploadedCoverDataUrl;
        uploaderPrompt.style.display = 'none';
        coverPreviewWrapper.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

// Remove cover
btnRemoveCover.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop opening file dialog
    uploadedCoverDataUrl = null;
    coverInput.value = ''; // Reset input
    coverPreviewImg.src = '';
    coverPreviewWrapper.style.display = 'none';
    uploaderPrompt.style.display = 'flex';
});

/* ----------------------------------------------------
   2. TEXT PARSING & LIVE PREVIEW LOGIC
   ---------------------------------------------------- */

function parseContent(rawText) {
    const lines = rawText.split(/\r?\n/);
    const chapters = [];
    let currentChapter = null;
    const preface = [];
    
    // Pattern to match "Chương" followed by a number (digits, roman numerals, or Vietnamese written numbers)
    const chapterRegex = /^\s*Chương\s+(?:\d+|[ivxlcdm]+|không|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|trăm|nghìn|vạn)\b/i;
    
    for (let line of lines) {
        const trimmedLine = line.trim();
        if (chapterRegex.test(trimmedLine)) {
            // Found a new chapter
            currentChapter = {
                title: trimmedLine,
                lines: []
            };
            chapters.push(currentChapter);
        } else {
            if (currentChapter) {
                currentChapter.lines.push(line);
            } else {
                preface.push(line);
            }
        }
    }
    
    return { preface, chapters };
}

// Listen to keypress / input in content box
bookContentInput.addEventListener('input', () => {
    const text = bookContentInput.value;
    charCounter.textContent = `${text.length.toLocaleString('vi-VN')} ký tự`;
    
    // Debounce processing to prevent lag
    clearTimeout(parseTimeout);
    parseTimeout = setTimeout(() => {
        const parsed = parseContent(text);
        parsedPreface = parsed.preface;
        parsedChapters = parsed.chapters;
        updateChapterPreviewList(parsedChapters);
    }, 300);
});

// Render the parsed chapters list
function updateChapterPreviewList(chapters) {
    if (chapters.length === 0) {
        chaptersListEmpty.style.display = 'block';
        chaptersList.style.display = 'none';
        chapterCounter.textContent = '0 chương';
    } else {
        chaptersListEmpty.style.display = 'none';
        chaptersList.style.display = 'flex';
        chapterCounter.textContent = `${chapters.length} chương`;
        
        const listHtml = chapters.map((ch, idx) => {
            const cleanTitle = ch.title;
            const paragraphsCount = ch.lines.filter(l => l.trim().length > 0).length;
            
            return `
                <li>
                    <span class="chapter-number-tag">Chương ${idx + 1}</span>
                    <span class="chapter-title-text" title="${escapeHtml(cleanTitle)}">${escapeHtml(cleanTitle)}</span>
                    <span class="chapter-lines-tag">${paragraphsCount} đoạn văn</span>
                </li>
            `;
        }).join('');
        
        chaptersList.innerHTML = listHtml;
    }
}

/* ----------------------------------------------------
   3. DECORATIVE COVER GENERATION FALLBACK
   ---------------------------------------------------- */

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, font) {
    ctx.font = font;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    const words = text.split(' ');
    let line = '';
    let lines = [];
    
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    // Draw lines centered vertically around initial Y position
    let currentY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
        // Subtle drop shadow for text readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(lines[i].trim(), x, currentY);
        currentY += lineHeight;
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function generateCanvasCover(title, author) {
    const canvas = document.getElementById('cover-canvas');
    const ctx = canvas.getContext('2d');
    
    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#121324'); // deep indigo-black
    grad.addColorStop(0.4, '#311242'); // deep royal violet
    grad.addColorStop(1, '#08080f'); // solid dark
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Outer border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 16;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Elegant accent border
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.25)'; // pink-500 overlay
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);
    
    // Category text
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#a78bfa'; // violet 400
    if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '6px';
    }
    ctx.textAlign = 'center';
    ctx.fillText('TÁC PHẨM SÁCH ĐIỆN TỬ', canvas.width / 2, 120);
    if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '0px';
    }
    
    // Elegant tiny ornament line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 40, 150);
    ctx.lineTo(canvas.width / 2 + 40, 150);
    ctx.stroke();
    
    // Draw Title
    const titleFont = 'bold 36px "Lora", Georgia, serif';
    const maxTitleWidth = canvas.width - 140;
    drawWrappedText(ctx, title, canvas.width / 2, canvas.height / 2 - 50, maxTitleWidth, 54, titleFont);
    
    // Ornament at bottom center
    ctx.font = '24px Georgia, serif';
    ctx.fillStyle = 'rgba(217, 70, 239, 0.4)';
    ctx.fillText('✦ ⚜ ✦', canvas.width / 2, canvas.height - 230);
    
    // Draw Author Label
    ctx.font = 'italic 16px "Lora", Georgia, serif';
    ctx.fillStyle = '#94a3b8'; // slate 400
    ctx.fillText('Tác giả', canvas.width / 2, canvas.height - 180);
    
    // Draw Author Name
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(author || 'Ẩn Danh', canvas.width / 2, canvas.height - 145);
    
    // Return as JPEG Data URL
    return canvas.toDataURL('image/jpeg', 0.9);
}

/* ----------------------------------------------------
   4. UTILITY HELPERS FOR EPUB PACKAGING
   ---------------------------------------------------- */

// Helper for yielding thread control to let browser repaint
const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Convert data URL to Blob directly without network fetch
function dataURLtoBlob(dataurl) {
    const parts = dataurl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function sanitizeFilename(name) {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD') // decompose characters to separate diacritics
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9_-]/g, '_') // substitute other chars with underscores
        .replace(/_+/g, '_') // compress multiple underscores
        .replace(/^_+|_+$/g, ''); // strip outer underscores
}

function formatLinesToHtml(lines) {
    return lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<p>${escapeHtml(line)}</p>`)
        .join('\n        ');
}

// Progress overlay controllers
function showProgress(status) {
    // Reset modal elements back to loading state
    document.getElementById('modal-title').textContent = 'Đang đóng gói file EPUB...';
    document.querySelector('.modal-spinner').style.display = 'block';
    document.querySelector('.progress-bar-container').style.display = 'block';
    document.getElementById('progress-percent').style.display = 'block';
    document.getElementById('modal-success-area').style.display = 'none';

    progressModal.style.display = 'flex';
    updateProgressState(0, status);
}

function updateProgressState(percent, status) {
    progressBarFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
    if (status) {
        modalStatusText.textContent = status;
    }
}

function hideProgress() {
    progressModal.style.display = 'none';
}

/* ----------------------------------------------------
   5. EPUB CREATION ENGINE
   ---------------------------------------------------- */

btnGenerate.addEventListener('click', async () => {
    // Form verification
    const title = bookTitleInput.value.trim();
    const author = bookAuthorInput.value.trim() || 'Ẩn Danh';
    const synopsis = bookSynopsisInput.value.trim();
    const rawContent = bookContentInput.value.trim();
    
    if (!title) {
        alert('Vui lòng nhập Tên truyện.');
        bookTitleInput.focus();
        return;
    }
    
    if (!rawContent) {
        alert('Vui lòng nhập nội dung truyện.');
        bookContentInput.focus();
        return;
    }

    // Disable button to prevent spamming
    btnGenerate.disabled = true;
    const originalBtnHtml = btnGenerate.innerHTML;
    btnGenerate.innerHTML = `
        <svg class="btn-icon spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M22 12a10 10 0 0 1-10 10"></path>
        </svg>
        <span>Đang tạo EPUB...</span>
    `;
    
    try {
        showProgress('Đang xử lý nội dung...');
        await sleep(100); // Allow modal overlay to paint
        
        // 1. Parse content
        updateProgressState(10, 'Đang phân tích các chương...');
        await sleep(50); // Yield to render progress
        const parsed = parseContent(rawContent);
        const preface = parsed.preface;
        const chapters = parsed.chapters;
        
        if (chapters.length === 0) {
            // If no chapters detected, treat the entire body as Chapter 1
            chapters.push({
                title: 'Chương 1: Phần Mở Đầu',
                lines: rawContent.split(/\r?\n/)
            });
        }
        
        const hasSynopsis = synopsis.length > 0;
        const hasPreface = preface.filter(l => l.trim().length > 0).length > 0;
        
        // 2. Prepare Cover image
        updateProgressState(25, 'Đang xử lý bìa truyện...');
        await sleep(50); // Yield to render progress
        let coverBlob = null;
        
        let coverDataUrlToUse = uploadedCoverDataUrl;
        if (!coverDataUrlToUse) {
            coverDataUrlToUse = generateCanvasCover(title, author);
        }
        
        coverBlob = dataURLtoBlob(coverDataUrlToUse);
        
        // 3. Initialize JSZip
        updateProgressState(40, 'Khởi tạo file nén EPUB...');
        await sleep(50); // Yield to render progress
        const zip = new JSZip();
        const uuid = generateUUID();
        const nowStr = new Date().toISOString().split('.')[0] + 'Z';
        
        // mimetype - MUST be the first file and uncompressed
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
        
        // META-INF/container.xml
        zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`);
        
        // OEBPS/Styles/style.css
        updateProgressState(50, 'Thêm các stylesheet...');
        await sleep(50); // Yield to render progress
        zip.file("OEBPS/Styles/style.css", `@charset "utf-8";
body {
    font-family: "Lora", "Georgia", "Times New Roman", serif;
    line-height: 1.65;
    margin: 6%;
    padding: 0;
    color: #1a1a1a;
    background-color: #fcfcfc;
}
h1, h2, h3, h4 {
    font-family: "Plus Jakarta Sans", "Helvetica Neue", "Arial", sans-serif;
    text-align: center;
    color: #0f172a;
    margin-top: 1.8em;
    margin-bottom: 0.8em;
    font-weight: 700;
    line-height: 1.25;
}
h1 {
    font-size: 1.8em;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.4em;
    margin-top: 0.5em;
}
h2 {
    font-size: 1.5em;
}
p {
    text-indent: 1.8em;
    margin-top: 0;
    margin-bottom: 0.8em;
    text-align: justify;
}
.cover-container {
    text-align: center;
    padding: 0;
    margin: 0;
    height: 100%;
}
.cover-image {
    max-width: 100%;
    max-height: 100vh;
    height: auto;
    object-fit: contain;
}
.synopsis-container, .preface-container {
    padding: 2% 0;
}
.synopsis-text {
    font-style: italic;
    color: #334155;
    line-height: 1.7;
}`);
        
        // OEBPS/Images/cover.jpg
        zip.file("OEBPS/Images/cover.jpg", coverBlob);
        
        // 4. Create text pages inside OEBPS/Text
        updateProgressState(60, 'Tạo các trang chương...');
        await sleep(50); // Yield to render progress
        
        // OEBPS/Text/cover.xhtml
        zip.file("OEBPS/Text/cover.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Bìa sách</title>
    <link rel="stylesheet" type="text/css" href="../Styles/style.css" />
    <style type="text/css">
        @page { padding: 0; margin: 0; }
        body { text-align: center; padding: 0; margin: 0; background-color: #070a13; }
    </style>
</head>
<body>
    <div class="cover-container">
        <img class="cover-image" src="../Images/cover.jpg" alt="Bìa sách" />
    </div>
</body>
</html>`);
        
        // OEBPS/Text/synopsis.xhtml (Synopsis)
        if (hasSynopsis) {
            zip.file("OEBPS/Text/synopsis.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Văn án</title>
    <link rel="stylesheet" type="text/css" href="../Styles/style.css" />
</head>
<body>
    <section class="synopsis-container" epub:type="preface">
        <h1>Văn án</h1>
        <div class="synopsis-text">
            ${synopsis.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0).map(line => `<p>${escapeHtml(line)}</p>`).join('\n            ')}
        </div>
    </section>
</body>
</html>`);
        }
        
        // OEBPS/Text/preface.xhtml (Preface/Introduction)
        if (hasPreface) {
            zip.file("OEBPS/Text/preface.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Lời nói đầu</title>
    <link rel="stylesheet" type="text/css" href="../Styles/style.css" />
</head>
<body>
    <section class="preface-container" epub:type="preface">
        <h1>Lời nói đầu</h1>
        ${formatLinesToHtml(preface)}
    </section>
</body>
</html>`);
        }
        
        // Chapters files
        chapters.forEach((ch, index) => {
            const chIndex = index + 1;
            zip.file(`OEBPS/Text/chapter_${chIndex}.xhtml`, `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(ch.title)}</title>
    <link rel="stylesheet" type="text/css" href="../Styles/style.css" />
</head>
<body>
    <section epub:type="bodymatter">
        <h1>${escapeHtml(ch.title)}</h1>
        ${formatLinesToHtml(ch.lines)}
    </section>
</body>
</html>`);
        });
        
        // 5. XML files manifest (content.opf)
        updateProgressState(75, 'Tạo các tệp tin cấu hình...');
        await sleep(50); // Yield to render progress
        
        let manifestItems = `
        <item id="style" href="Styles/style.css" media-type="text/css" />
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        <item id="cover-image" href="Images/cover.jpg" media-type="image/jpeg" />
        <item id="cover-page" href="Text/cover.xhtml" media-type="application/xhtml+xml" />`;
        
        if (hasSynopsis) {
            manifestItems += `\n        <item id="synopsis-page" href="Text/synopsis.xhtml" media-type="application/xhtml+xml" />`;
        }
        if (hasPreface) {
            manifestItems += `\n        <item id="preface-page" href="Text/preface.xhtml" media-type="application/xhtml+xml" />`;
        }
        chapters.forEach((ch, index) => {
            const chIndex = index + 1;
            manifestItems += `\n        <item id="chapter_${chIndex}" href="Text/chapter_${chIndex}.xhtml" media-type="application/xhtml+xml" />`;
        });
        
        let spineItems = `
        <itemref idref="cover-page" />`;
        if (hasSynopsis) {
            spineItems += `\n        <itemref idref="synopsis-page" />`;
        }
        if (hasPreface) {
            spineItems += `\n        <itemref idref="preface-page" />`;
        }
        chapters.forEach((ch, index) => {
            const chIndex = index + 1;
            spineItems += `\n        <itemref idref="chapter_${chIndex}" />`;
        });
        
        let metadata = `
        <dc:title id="title">${escapeHtml(title)}</dc:title>
        <dc:creator id="creator">${escapeHtml(author)}</dc:creator>
        <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
        <dc:language>vi</dc:language>
        <meta property="dcterms:modified">${nowStr}</meta>
        <meta name="cover" content="cover-image" />`;
        
        if (synopsis) {
            metadata += `\n        <dc:description>${escapeHtml(synopsis)}</dc:description>`;
        }
        
        const opfContent = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
    <metadata>${metadata}
    </metadata>
    <manifest>${manifestItems}
    </manifest>
    <spine toc="ncx">${spineItems}
    </spine>
</package>`;
        
        zip.file("OEBPS/content.opf", opfContent);
        
        // 6. Navigation files (toc.ncx and nav.xhtml)
        // toc.ncx
        let ncxNavPoints = '';
        let playOrder = 1;
        
        ncxNavPoints += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>Bìa sách</text></navLabel>
      <content src="Text/cover.xhtml"/>
    </navPoint>`;
        playOrder++;
        
        if (hasSynopsis) {
            ncxNavPoints += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>Văn án</text></navLabel>
      <content src="Text/synopsis.xhtml"/>
    </navPoint>`;
            playOrder++;
        }
        if (hasPreface) {
            ncxNavPoints += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>Lời nói đầu</text></navLabel>
      <content src="Text/preface.xhtml"/>
    </navPoint>`;
            playOrder++;
        }
        chapters.forEach((ch, index) => {
            const chIndex = index + 1;
            ncxNavPoints += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>${escapeHtml(ch.title)}</text></navLabel>
      <content src="Text/chapter_${chIndex}.xhtml"/>
    </navPoint>`;
            playOrder++;
        });
        
        const ncxContent = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeHtml(title)}</text>
  </docTitle>
  <navMap>${ncxNavPoints}
  </navMap>
</ncx>`;
        
        zip.file("OEBPS/toc.ncx", ncxContent);
        
        // nav.xhtml
        let navList = `
            <li><a href="Text/cover.xhtml">Bìa sách</a></li>`;
        if (hasSynopsis) {
            navList += `\n            <li><a href="Text/synopsis.xhtml">Văn án</a></li>`;
        }
        if (hasPreface) {
            navList += `\n            <li><a href="Text/preface.xhtml">Lời nói đầu</a></li>`;
        }
        chapters.forEach((ch, index) => {
            const chIndex = index + 1;
            navList += `\n            <li><a href="Text/chapter_${chIndex}.xhtml">${escapeHtml(ch.title)}</a></li>`;
        });
        
        const navContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Mục lục</title>
    <link rel="stylesheet" type="text/css" href="Styles/style.css" />
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>Mục lục</h1>
        <ol>${navList}
        </ol>
    </nav>
</body>
</html>`;
        
        zip.file("OEBPS/nav.xhtml", navContent);
        
        // 7. Generate zip archive & download
        updateProgressState(85, 'Đang mã hóa ZIP và chuẩn bị tải xuống...');
        await sleep(50); // Yield to render progress
        
        const epubBlob = await zip.generateAsync({ type: "blob" }, (metadata) => {
            // Keep status update smooth between 85% and 100%
            const percent = 85 + (metadata.percent * 0.15);
            updateProgressState(percent, `Đang nén tập tin...`);
        });
        
        // 8. Update UI to Success State
        updateProgressState(100, 'Đã hoàn thành!');
        await sleep(50); // Yield to render progress

        const cleanName = sanitizeFilename(title) || 'truyen_epub';
        const filename = `${cleanName}.epub`;
        const downloadUrl = URL.createObjectURL(epubBlob);

        // Update Modal elements
        document.getElementById('modal-title').textContent = 'Tạo file EPUB thành công!';
        modalStatusText.textContent = 'File của bạn đã sẵn sàng. Nếu trình duyệt không tự động tải, hãy bấm nút dưới đây.';

        document.querySelector('.modal-spinner').style.display = 'none';
        document.querySelector('.progress-bar-container').style.display = 'none';
        document.getElementById('progress-percent').style.display = 'none';

        // Setup download link fallback
        const downloadLink = document.getElementById('btn-download-link');
        downloadLink.href = downloadUrl;
        downloadLink.download = filename;

        // Show success area
        document.getElementById('modal-success-area').style.display = 'flex';

        // Hook close button
        const closeBtn = document.getElementById('btn-close-modal');
        closeBtn.onclick = () => {
            hideProgress();
        };

        // 9. Proactively trigger browser download (automatic)
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error(err);
        hideProgress();
        alert('Đã xảy ra lỗi trong quá trình tạo file EPUB: ' + err.message);
    } finally {
        // Restore button state
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = originalBtnHtml;
    }
});

/* ----------------------------------------------------
   6. PASSWORD GATE AUTHENTICATION SYSTEM
   ---------------------------------------------------- */
const gatePasswordInput = document.getElementById('gate-password');
const togglePwBtn = document.getElementById('toggle-pw-btn');
const eyeIconShow = document.getElementById('eye-icon-show');
const eyeIconHide = document.getElementById('eye-icon-hide');

const passwordGate = document.getElementById('password-gate');
const appContainer = document.getElementById('app-container');
const btnVerifyPw = document.getElementById('btn-verify-pw');
const passwordError = document.getElementById('password-error');
const passwordCard = document.getElementById('password-card');

const CORRECT_PASSWORD = 'hh$&Ffu!gzB4ut+svPRY';

// Reveal/Hide password toggle
if (togglePwBtn && gatePasswordInput) {
    togglePwBtn.addEventListener('click', () => {
        if (gatePasswordInput.type === 'password') {
            gatePasswordInput.type = 'text';
            eyeIconShow.style.display = 'none';
            eyeIconHide.style.display = 'block';
        } else {
            gatePasswordInput.type = 'password';
            eyeIconShow.style.display = 'block';
            eyeIconHide.style.display = 'none';
        }
    });
}

// Verification function
function verifyPassword() {
    if (!gatePasswordInput) return;
    const entered = gatePasswordInput.value;
    if (entered === CORRECT_PASSWORD) {
        // Correct Password
        sessionStorage.setItem('epub_forge_auth', 'true');
        passwordGate.style.display = 'none';
        appContainer.style.display = 'flex';
        passwordError.style.display = 'none';
    } else {
        // Wrong Password
        passwordError.style.display = 'block';
        
        // Shake feedback animation
        passwordCard.classList.remove('shake-animation');
        void passwordCard.offsetWidth; // force redraw/reflow to restart animation
        passwordCard.classList.add('shake-animation');
        
        gatePasswordInput.focus();
    }
}

// Bind Verify actions
if (btnVerifyPw) {
    btnVerifyPw.addEventListener('click', verifyPassword);
}

if (gatePasswordInput) {
    gatePasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            verifyPassword();
        }
    });
}

// Immediate load autologin check
(function initAuth() {
    if (sessionStorage.getItem('epub_forge_auth') === 'true') {
        if (passwordGate) passwordGate.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
    } else {
        if (passwordGate) passwordGate.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (gatePasswordInput) gatePasswordInput.focus();
    }
})();
