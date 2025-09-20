// script.js (Versi Final dengan Upload Background Kustom)

document.addEventListener('DOMContentLoaded', () => {
    // Referensi Elemen HTML
    const webcamFeed = document.getElementById('webcam-feed');
    const outputCanvas = document.getElementById('output-canvas');
    const outputCtx = outputCanvas.getContext('2d');
    const captureButton = document.getElementById('capture-button');
    const photoPreviewArea = document.getElementById('photo-preview-area');
    const cameraSelect = document.getElementById('camera-select');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const toggleBgBtn = document.getElementById('toggle-background-btn');
    const bgOptions = document.getElementById('background-options');
    const permissionModal = document.getElementById('permission-modal');
    const modalContent = document.getElementById('modal-content');
    const grantPermissionBtn = document.getElementById('grant-permission-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const uploadBgInput = document.getElementById('upload-bg-input'); // <-- Referensi baru

    // Variabel Global
    let currentStream = null;
    let isBgEffectActive = false;
    let selectedBgImage = null;
    let lastResults = null;

    // Inisialisasi Model AI MediaPipe
    const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`});
    selfieSegmentation.setOptions({ modelSelection: 1 });
    selfieSegmentation.onResults(onResults);

    function onResults(results) {
        lastResults = results;
        outputCanvas.width = results.image.width;
        outputCanvas.height = results.image.height;
        outputCtx.save();
        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        outputCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);
        if (isBgEffectActive) {
            outputCtx.globalCompositeOperation = 'destination-in';
            outputCtx.drawImage(results.segmentationMask, 0, 0, outputCanvas.width, outputCanvas.height);
            if (selectedBgImage) {
                outputCtx.globalCompositeOperation = 'destination-over';
                if (selectedBgImage.tagName === 'IMG') {
                    outputCtx.drawImage(selectedBgImage, 0, 0, outputCanvas.width, outputCanvas.height);
                } else if (selectedBgImage.id === 'blur-bg') {
                    outputCtx.filter = 'blur(8px)';
                    outputCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);
                }
            }
        }
        outputCtx.restore();
    }
    
    async function processFrame() {
        if (webcamFeed.readyState >= 2 && webcamFeed.videoWidth > 0) {
            await selfieSegmentation.send({image: webcamFeed});
        }
        requestAnimationFrame(processFrame);
    }

    async function startWebcam(deviceId) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined } };
        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            webcamFeed.srcObject = currentStream;
            webcamFeed.addEventListener('playing', () => {
                outputCanvas.width = webcamFeed.videoWidth;
                outputCanvas.height = webcamFeed.videoHeight;
                processFrame();
                hideLoadingOverlay();
            });
        } catch (err) {
            console.error("Gagal mengakses kamera: ", err);
            alert("Gagal mengakses kamera. Mohon izinkan akses kamera.");
            hideLoadingOverlay();
        }
    }

    async function getCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            cameraSelect.innerHTML = '';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.innerText = device.label || `Kamera ${cameraSelect.length + 1}`;
                cameraSelect.appendChild(option);
            });
        } catch (err) { console.error("Gagal mendapatkan daftar perangkat: ", err); }
    }

    function startCountdown() {
        captureButton.disabled = true;
        let count = 3;
        countdownText.innerText = count;
        countdownOverlay.classList.remove('hidden');
        countdownOverlay.classList.add('flex');
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.innerText = count;
            } else {
                clearInterval(timer);
                countdownText.innerText = '📸';
                flashEffect();
                capturePhoto();
                setTimeout(() => {
                    countdownOverlay.classList.add('hidden');
                    countdownOverlay.classList.remove('flex');
                    captureButton.disabled = false;
                }, 500);
            }
        }, 1000);
    }

    function flashEffect() {
        const flash = document.createElement('div');
        flash.className = 'absolute inset-0 bg-white opacity-75 animate-flash z-20';
        const style = document.createElement('style');
        style.innerHTML = `@keyframes flash-anim { from { opacity: 0.75; } to { opacity: 0; } } .animate-flash { animation: flash-anim 0.3s ease-out; }`;
        document.head.appendChild(style);
        outputCanvas.parentElement.appendChild(flash);
        setTimeout(() => { flash.remove(); style.remove(); }, 300);
    }

    function capturePhoto() {
        if (!lastResults) { console.error("Tidak ada data AI untuk diproses."); return; }
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        finalCanvas.width = lastResults.image.width;
        finalCanvas.height = lastResults.image.height;
        finalCtx.filter = outputCanvas.style.filter;
        finalCtx.save();
        finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
        finalCtx.drawImage(lastResults.image, 0, 0, finalCanvas.width, finalCanvas.height);
        if (isBgEffectActive) {
            finalCtx.globalCompositeOperation = 'destination-in';
            finalCtx.drawImage(lastResults.segmentationMask, 0, 0, finalCanvas.width, finalCanvas.height);
            if (selectedBgImage) {
                finalCtx.globalCompositeOperation = 'destination-over';
                if (selectedBgImage.tagName === 'IMG') {
                    finalCtx.drawImage(selectedBgImage, 0, 0, finalCanvas.width, finalCanvas.height);
                } else if (selectedBgImage.id === 'blur-bg') {
                    const tempBlurCanvas = document.createElement('canvas');
                    const tempBlurCtx = tempBlurCanvas.getContext('2d');
                    tempBlurCanvas.width = lastResults.image.width;
                    tempBlurCanvas.height = lastResults.image.height;
                    tempBlurCtx.filter = 'blur(8px)';
                    tempBlurCtx.drawImage(lastResults.image, 0, 0, tempBlurCanvas.width, tempBlurCanvas.height);
                    finalCtx.drawImage(tempBlurCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
                }
            }
        }
        finalCtx.restore();
        const imageDataURL = finalCanvas.toDataURL('image/png');
        displayPhoto(imageDataURL);
    }

    function displayPhoto(imageDataURL) {
        const photoContainer = document.createElement('div');
        photoContainer.className = 'relative bg-gray-700 rounded-lg overflow-hidden shadow-md group';
        const img = document.createElement('img');
        img.src = imageDataURL;
        img.className = 'w-full h-auto object-cover';
        const downloadButton = document.createElement('a');
        downloadButton.href = imageDataURL;
        downloadButton.download = `snapverse-photo-${Date.now()}.png`;
        downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>`;
        downloadButton.className = 'absolute bottom-2 right-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition duration-300 opacity-0 group-hover:opacity-100';
        photoContainer.appendChild(img);
        photoContainer.appendChild(downloadButton);
        photoPreviewArea.prepend(photoContainer);
    }
    
    function showPermissionModal() {
        hideLoadingOverlay();
        permissionModal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.parentElement.classList.add('visible');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 50);
    }

    function hidePermissionModal() {
        modalContent.parentElement.classList.remove('visible');
        modalContent.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => permissionModal.classList.add('hidden'), 300);
    }

    function hideLoadingOverlay() {
        loadingOverlay.classList.add('opacity-0');
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 500);
    }

    async function initializeApp() {
        captureButton.disabled = true;
        try {
            if (navigator.permissions) {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                if (permissionStatus.state === 'granted') {
                    startApp();
                } else {
                    showPermissionModal();
                }
            } else {
                showPermissionModal();
            }
        } catch (err) {
            showPermissionModal();
        }
    }
    
    async function startApp() {
        hidePermissionModal();
        loadingOverlay.classList.remove('hidden', 'opacity-0');
        loadingText.innerText = "Menyalakan Kamera...";
        await getCameras();
        if (cameraSelect.options.length > 0) {
            await startWebcam(cameraSelect.options[0].value);
        } else {
            await startWebcam(undefined);
        }
        document.querySelector('.filter-btn[data-filter="none"]').classList.add('active');
        captureButton.disabled = false;
    }

    // --- Event Listeners ---
    grantPermissionBtn.addEventListener('click', startApp);
    captureButton.addEventListener('click', startCountdown);
    cameraSelect.addEventListener('change', () => startWebcam(cameraSelect.value));

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            outputCanvas.style.filter = button.dataset.filter;
        });
    });

    toggleBgBtn.addEventListener('click', () => {
        isBgEffectActive = !isBgEffectActive;
        bgOptions.classList.toggle('hidden');
        toggleBgBtn.textContent = isBgEffectActive ? 'Matikan Efek' : 'Aktifkan Efek';
        toggleBgBtn.classList.toggle('bg-teal-500');
        toggleBgBtn.classList.toggle('bg-red-500');
        toggleBgBtn.classList.toggle('hover:bg-teal-600');
        toggleBgBtn.classList.toggle('hover:bg-red-600');
        if (!isBgEffectActive) {
            selectedBgImage = null;
            document.querySelectorAll('.background-img').forEach(img => img.classList.remove('border-purple-500'));
        }
    });
    
    // Event listener ini diubah untuk dinamis
    function addBgImageEventListeners() {
        document.querySelectorAll('.background-img').forEach(img => {
            // Hapus event listener lama untuk mencegah duplikasi
            img.replaceWith(img.cloneNode(true));
        });
        document.querySelectorAll('.background-img').forEach(img => {
            img.addEventListener('click', () => {
                document.querySelectorAll('.background-img').forEach(i => i.classList.remove('border-purple-500'));
                img.classList.add('border-purple-500');
                
                // Jika yang diklik adalah thumbnail upload-an, gunakan gambar aslinya
                if (img.id === 'uploaded-bg-thumbnail') {
                    selectedBgImage = window.uploadedImageObject;
                } else {
                    selectedBgImage = img;
                }
            });
        });
    }
    addBgImageEventListeners(); // Panggil pertama kali

    uploadBgInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadedImage = new Image();
            uploadedImage.crossOrigin = "anonymous";
            uploadedImage.onload = () => {
                window.uploadedImageObject = uploadedImage;

                const oldUpload = document.getElementById('uploaded-bg-thumbnail');
                if (oldUpload) oldUpload.remove();

                const newThumbnail = document.createElement('img');
                newThumbnail.id = 'uploaded-bg-thumbnail';
                newThumbnail.src = e.target.result;
                newThumbnail.alt = "Uploaded Background";
                newThumbnail.className = "background-img h-16 w-16 object-cover rounded-md cursor-pointer border-2";
                
                bgOptions.prepend(newThumbnail);
                addBgImageEventListeners(); // Daftarkan ulang event listener
                
                newThumbnail.click();
            };
            uploadedImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    initializeApp();
});