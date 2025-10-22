'use strict';

// ---------------- DOM Elements ----------------
const audioFileInput = document.getElementById('audioFile');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const recordButton = document.getElementById('recordButton');
const analyzeBtn = document.getElementById('analyzeBtn');
const audioPlayer = document.getElementById('audioPlayer');
const fileName = document.getElementById('fileName');
const sceneDescriptionBox = document.getElementById('sceneDescriptionBox');
const errorMessage = document.getElementById('errorMessage');
const loadingMessage = document.getElementById('loadingMessage');
const initialMessage = document.getElementById('initialMessage');
const analysisResults = document.getElementById('analysisResults');
const overviewTab = document.getElementById('overviewTab');
const detailsTab = document.getElementById('detailsTab');
const exportTab = document.getElementById('exportTab');

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// ---------------- Event Listeners ----------------
chooseFileBtn.addEventListener('click', () => audioFileInput.click());
audioFileInput.addEventListener('change', handleFileSelect);
recordButton.addEventListener('click', toggleRecording);
analyzeBtn.addEventListener('click', analyzeAudio);

// ---------------- File Upload ----------------
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        showError('Please select a valid audio file.');
        return;
    }

    fileName.textContent = file.name;

    const audioURL = URL.createObjectURL(file);
    audioPlayer.src = audioURL;
    audioPlayer.style.display = 'block';
}

// ---------------- Recording ----------------
function toggleRecording() {
    if (!isRecording) startRecording();
    else stopRecording();
}

function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Your browser does not support audio recording.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioURL = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioURL;
                audioPlayer.style.display = 'block';
                fileName.textContent = `recording_${Date.now()}.webm`;
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordButton.textContent = 'Stop Recording';
        })
        .catch(err => showError('Could not access microphone: ' + err));
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordButton.textContent = 'Start Recording';
    }
}

// ---------------- Analyze Audio ----------------
async function analyzeAudio() {
    if (!audioPlayer.src || audioPlayer.src === '') {
        showError('Please upload or record an audio file first.');
        return;
    }

    showElement(loadingMessage);
    hideElement(errorMessage);

    try {
        let audioBlob;

        // Uploaded file
        if (audioFileInput.files.length > 0) {
            audioBlob = audioFileInput.files[0];
        } 
        // Recorded audio
        else {
            const response = await fetch(audioPlayer.src);
            audioBlob = await response.blob();
        }

        const formData = new FormData();
        formData.append('file', audioBlob, 'input_audio.wav');

        const res = await fetch('http://127.0.0.1:8000/transcribe', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        hideElement(loadingMessage);

        if (data.transcription) {
            // Hide initial message
            hideElement(initialMessage);

            // Show results container
            showElement(analysisResults);

            // Update transcription text
            sceneDescriptionBox.textContent = data.transcription;

            // Show Overview tab and hide others
            overviewTab.classList.add('active');
            detailsTab.classList.remove('active');
            exportTab.classList.remove('active');

        } else if (data.error) {
            showError(data.error);
        } else {
            showError('No transcription returned from server.');
        }

    } catch (error) {
        hideElement(loadingMessage);
        showError('Error during analysis: ' + error.message);
    }
}

// ---------------- Helpers ----------------
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideElement(el) { if (el) el.style.display = 'none'; }
function showElement(el) { if (el) el.style.display = 'block'; }
