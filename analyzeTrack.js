let globalAudioContext = null;
let globalAnalyser = null;
let globalAnimationFrame = null;
let sourceNode = null;
let analyzerPaused = false;
let ctx = null;
let width = null;
let height = null;
let samples = null;
let duration = null;
let dbValues = null;

function drawWaveform() {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#0cf';
    ctx.beginPath();
    const step = Math.ceil(samples.length / width);
    for (let x = 0; x < width; x++) {
        const slice = samples.slice(x * step, (x + 1) * step);
        const min = Math.min(...slice);
        const max = Math.max(...slice);
        const y1 = (1 - (min + 1) / 2) * height / 3;
        const y2 = (1 - (max + 1) / 2) * height / 3;
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
    }
    ctx.stroke();
}


function drawVolumePlot() {
    const top = height / 2;
    const plotHeight = height / 2;

    // Grid lines & labels
    const dbTicks = [0, -5, -10, -20, -40, -60];
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;

    dbTicks.forEach(db => {
        const y = top - (db / 60) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText(`${db} dB`, 40, y - 2);
    });

    // Plot RMS line
    ctx.strokeStyle = '#f50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
        const index = Math.floor(x / width * dbValues.length);
        const db = dbValues[index];
        const y = top - (db / 60) * plotHeight;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function drawLive() {
    if (analyzerPaused) return; // skip drawing
    drawWaveform();
    drawVolumePlot();

    // Playback position marker
    const currentTime = player.currentTime;
    const x = (currentTime / duration) * width;
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // FFT spectrum below
    const freqData = new Uint8Array(globalAnalyser.frequencyBinCount);
    globalAnalyser.getByteFrequencyData(freqData);
    const barWidth = width / freqData.length;
    for (let i = 0; i < freqData.length; i++) {
        const barHeight = freqData[i] / 255 * (height / 3);
        ctx.fillStyle = `hsl(${i / freqData.length * 240}, 100%, 50%)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }

    globalAnimationFrame = requestAnimationFrame(drawLive);
}

function toggleAnalyzer() {
    analyzerPaused = !analyzerPaused;
    if (!analyzerPaused) drawLive();
}

function analyzeTrack(player) {
    // Initialize AudioContext once
    if (!globalAudioContext) {
        globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        globalAnalyser = globalAudioContext.createAnalyser();
        globalAnalyser.fftSize = 512;

        sourceNode = globalAudioContext.createMediaElementSource(player);
        sourceNode.connect(globalAnalyser);
        globalAnalyser.connect(globalAudioContext.destination);

        console.log('AudioContext and Analyser initialized');
    }

    // If suspended (e.g., first user gesture), resume context
    if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume();
    }

    const canvas = document.getElementById('analysisCanvas');
    ctx = canvas.getContext('2d');
    width = canvas.width;
    height = canvas.height;

    // === Precompute RMS (dB) over time ===
    fetch(player.src)
        .then(r => r.arrayBuffer())
        .then(buffer => globalAudioContext.decodeAudioData(buffer))
        .then(audioBuffer => {
            samples = audioBuffer.getChannelData(0);
            duration = audioBuffer.duration;

            dbValues = [];
            const windowSize = 2048;
            for (let i = 0; i < samples.length; i += windowSize) {
                const slice = samples.slice(i, i + windowSize);
                let sumSq = 0;
                for (let j = 0; j < slice.length; j++) {
                    sumSq += slice[j] * slice[j];
                }
                const rms = Math.sqrt(sumSq / slice.length);
                const db = 20 * Math.log10(rms || 1e-8);
                dbValues.push(db);
            }

            // Cancel previous animation frame if any
            if (globalAnimationFrame) {
                cancelAnimationFrame(globalAnimationFrame);
            }
            drawLive();
        })
        .catch(err => console.warn('Error decoding audio buffer for analysis:', err));
}
