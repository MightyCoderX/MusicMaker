import { generateOctaves } from './generate-octaves.js';

const optionsElem = document.querySelector('.options');
const selectWaveType = optionsElem.querySelector('#selectWaveType');
const numOctaveOffset = optionsElem.querySelector('#numOctaveOffset');
const numOctaveCount = optionsElem.querySelector('#numOctaveCount');
const numResonanceTime = optionsElem.querySelector('#numResonanceTime');
const recordButton = optionsElem.querySelector('#btnRecord');
const recordedAudioElem = optionsElem.querySelector('#recordedAudio');
const pianoKeyboard = document.querySelector('.piano-keyboard');
const octaveTemplate = document.getElementById('octaveTemplate');


let keys = pianoKeyboard.querySelectorAll('[data-key]');

const notes = [
    'c', 'c#', 'd', 'd#',
    'e', 'f', 'f#', 'g',
    'g#', 'a', 'a#', 'b'
];

let getNoteFrequency = n => 16.35 * ((2**(1/12)) ** n)

let audioCtx;
let masterGain;
let dest;
let mediaRecorder;
let chunks = [];
let keyState = null;

function initializeAudioContext()
{
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;

    dest = audioCtx.createMediaStreamDestination();

    masterGain.connect(limiter);
    limiter.connect(audioCtx.destination);
    limiter.connect(dest);

    mediaRecorder = new MediaRecorder(dest.stream);

    mediaRecorder.addEventListener('dataavailable', e => chunks.push(e.data));
    mediaRecorder.addEventListener('stop', _ =>
    {
        const blob = new Blob(chunks, { 'type' : 'audio/mp3; codecs=opus' });
        recordedAudioElem.src = URL.createObjectURL(blob);
        chunks = [];
    });
}

let options = {
    octaveCount: window.innerWidth < 700 ? 1 : 2,
    octaveOffset: 10,
    resonanceTime: 1
}

loadOptions();

function loadOptions()
{
    if(!localStorage.getItem('options')) return;

    options = JSON.parse(localStorage.getItem('options'));
}

function saveOptions()
{
    localStorage.setItem('options', JSON.stringify(options));
}

numOctaveCount.value = options.octaveCount;
numOctaveOffset.value = options.octaveOffset;
numResonanceTime.value = options.resonanceTime;

numOctaveCount.addEventListener('change', () =>
{
    options.octaveCount = Number(numOctaveCount.value);
    setupKeyboard(options.octaveCount);
    saveOptions();
});

numResonanceTime.addEventListener('change', () =>
{
    options.resonanceTime = Number(numResonanceTime.value);
    saveOptions();
});

numOctaveOffset.addEventListener('input', () => {
    const factor = Number(numOctaveOffset.value);
    numOctaveOffset.value = factor;
    options.octaveOffset = factor;
    saveOptions();
});

setupKeyboard(options.octaveCount);

pianoKeyboard.addEventListener('contextmenu', e => e.preventDefault());

let leftMouseDown;
let mouseButton;

//TODO: Fix for mobile
const mouseDownHandler = e =>
{
    mouseButton = e.button;

    if(mouseButton !== undefined && mouseButton !== 0) return;

    leftMouseDown = true;

    if(!audioCtx)
    {
        initializeAudioContext();
    }

    const mouseUpHandler = e =>
    {
        if(e.button !== undefined && e.button !== 0) return;

        leftMouseDown = false;

        window.removeEventListener('mouseup', mouseUpHandler);
        window.removeEventListener('mouseleave', mouseUpHandler);
        window.removeEventListener('touchend', mouseUpHandler);
        window.removeEventListener('touchcancel', mouseUpHandler);

        window.removeEventListener('blur', mouseUpHandler);
    }

    window.addEventListener('mouseup', mouseUpHandler);
    window.addEventListener('mouseleave', mouseUpHandler);
    window.addEventListener('touchend', mouseUpHandler);
    window.addEventListener('touchcancel', mouseUpHandler);

    window.addEventListener('blur', mouseUpHandler);
}

recordButton.addEventListener('click', e =>
{
    if(mediaRecorder.state === 'recording')
    {
        mediaRecorder.stop();
        recordButton.textContent = 'Start Recording';
    }
    else
    {
        mediaRecorder.start();
        recordButton.textContent = 'Stop Recording';

    }
});

window.addEventListener('mousedown', mouseDownHandler);
window.addEventListener('touchstart', mouseDownHandler);

export const pressKey = key => {
    const state = keyState.get(key);
    if(!state || state.nodes) return;

    if(!audioCtx) initializeAudioContext();

    key.classList.add('active');
    state.nodes = playNote(state.note, state.octave, audioCtx, masterGain)
}

export const releaseKey = key => {
    const state = keyState.get(key);
    if(!state || !state.nodes) return;

    key.classList.remove('active');
    stopFrequency(state.nodes.oscillator, state.nodes.gainNode, audioCtx);
    state.nodes = null;
}

function setupKeyboard(octaveCount)
{
    generateOctaves(pianoKeyboard, octaveTemplate, octaveCount);
    keys = pianoKeyboard.querySelectorAll('[data-key]');

    keyState = new Map();

    keys.forEach(key => keyState.set(key, {
        octave: key.parentElement.dataset.octave,
        nodes: null,
        note: notes[key.dataset.key],
    }));

    let currentKey = null;

    pianoKeyboard.addEventListener("mousedown", e => {
        if(e.button !== 0) return;

        const key = e.target.closest('[data-key]');
        if(!key) return;

        currentKey = key;
        pressKey(key);
    });

    pianoKeyboard.addEventListener("mousemove", e => {
        if(!leftMouseDown) return;

        const key = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-key]");
        if(key === currentKey) return;

        if(currentKey) releaseKey(currentKey);
        currentKey = key;
        if(key) pressKey(key);
    });

    const stopOnRelease = () => {
        if(currentKey) releaseKey(currentKey);
        currentKey = null;
    }

    window.addEventListener("mouseup", stopOnRelease);
    window.addEventListener("mouseleave", stopOnRelease);
    window.addEventListener("blur", stopOnRelease);

    let touchMap = new Map();

    const isKeyHeldByAnyFinger = key => {
        for(const keySet of touchMap.values()) {
            if(keySet.has(key)) return true;
        }
        return false;
    }

    const getKeysByTouch = touch => {
        const { clientX: x, clientY: y }  = touch;
        const rx = touch.radiusX + 5 || 12; // fallback radius in px if device doesn't report contact size
        const ry = touch.radiusY + 5 || 12;

        const offsets = [
            [0, 0],
            [rx, 0], [-rx, 0], [0, ry], [0, -ry],
            [rx, ry], [-rx, ry], [rx, -ry], [-rx, -ry],
        ];

        const keys = new Set();
        for (const [dx, dy] of offsets) {
            const el = document.elementFromPoint(x + dx, y + dy)?.closest('[data-key]');
            if (el) keys.add(el);
        }
        return keys;
    }

    pianoKeyboard.addEventListener("touchstart", e => {
        for(const touch of e.touches) {
            const keys = getKeysByTouch(touch);
            touchMap.set(touch.identifier, keys);
            keys.forEach(pressKey);
        }
    });

    pianoKeyboard.addEventListener("touchmove", e => {
        for(const touch of e.touches) {
            const oldKeys = touchMap.get(touch.identifier);
            if(!oldKeys) continue;

            const newKeys = getKeysByTouch(touch);

            for(const key of oldKeys) {
                if(newKeys.has(key)) continue;
                oldKeys.delete(key);
                if(!isKeyHeldByAnyFinger(key)) releaseKey(key);
            }

            for(const key of newKeys) {
                if(oldKeys.has(key)) continue;
                oldKeys.add(key);
                pressKey(key);
            }
        }
    });

    const endTouch = e => {
        for(const touch of e.changedTouches) {
            const keySet = touchMap.get(touch.identifier);
            if(!keySet) continue;

            for(const key of keySet) {
                keySet.delete(key);
                if(!isKeyHeldByAnyFinger(key)) releaseKey(key);
            }

            touchMap.delete(touch.identifier);
        }
    }
    pianoKeyboard.addEventListener("touchend", endTouch);
    pianoKeyboard.addEventListener("touchcancel", endTouch);

    pianoKeyboard.addEventListener('touchstart', e => {
        if(e.touches.length > 1) e.preventDefault(); 
    }, { passive: false });

    pianoKeyboard.addEventListener('touchmove', e => { 
        if(e.touches.length > 1) e.preventDefault();
    }, { passive: false });
}

export function playNoteFor(note, octave = 0, dur) {
    const nodes = playNote(note, octave);
    setTimeout(() => {
        stopFrequency(nodes.oscillator, nodes.gainNode);
    }, dur);
}

function playNote(note, octave)
{
    if(!notes.includes(note.toLowerCase())) return;

    const steps = notes.indexOf(note.toLowerCase());
    const frequency = getNoteFrequency(steps) * (2**octave * 2**Number(options.octaveOffset));

    console.log('Playing note', `${note.toUpperCase()}${Number(octave) + options.octaveOffset}`, 'with a frequency of', frequency);

    return playFrequency(frequency, audioCtx, masterGain);
}

function playFrequency(freq)
{
    const attack_ms = 8;
    const startTime = audioCtx.currentTime;

    const gainNode = audioCtx.createGain();
    const oscillator = audioCtx.createOscillator();

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attack_ms / 1000);

    oscillator.frequency.setValueAtTime(freq, startTime);
    oscillator.type = selectWaveType.value;
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    oscillator.start(startTime);

    return { oscillator, gainNode };
}

function stopFrequency(oscillator, gainNode)
{
    const attack = 1;
    const release = options.resonanceTime * 100;

    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime + attack / 1000, release / 1000);

    setTimeout(() =>
    {
        oscillator.stop();
        oscillator.disconnect(gainNode);
        gainNode.disconnect();
    }, attack * 10 + release * 10);
}

window.addEventListener('close', saveOptions);
