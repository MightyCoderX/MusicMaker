import { generateOctaves } from './generate-octaves.js';

const optionsElem = document.querySelector('.options');
const selectWaveType = optionsElem.querySelector('#selectWaveType');
const slideOctaveOffset = optionsElem.querySelector('#slideOctaveOffset');
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
let dest;
let mediaRecorder;
let chunks = [];

function initializeAudioContext()
{
    audioCtx = new AudioContext();

    dest = audioCtx.createMediaStreamDestination();
    mediaRecorder = new MediaRecorder(dest.stream);

    mediaRecorder.addEventListener('dataavailable', e => chunks.push(e.data));

    mediaRecorder.addEventListener('stop', e =>
    {
        const blob = new Blob(chunks, { 'type' : 'audio/mp3; codecs=opus' });
        recordedAudioElem.src = URL.createObjectURL(blob);
        chunks = [];
    });
}

let options = 
{
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

setupKeyboard(options.octaveCount);

pianoKeyboard.addEventListener('contextmenu', e => e.preventDefault());

let mouseDown;
let mouseButton;

//TODO: Fix for mobile
const mouseDownHandler = e =>
{
    mouseDown = true;
    mouseButton = e.button;

    if(!audioCtx)
    {
        initializeAudioContext();
    }

    const mouseUpHandler = e =>
    {
        mouseDown = false;

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

function setupKeyboard(octaveCount)
{
    generateOctaves(pianoKeyboard, octaveTemplate, octaveCount);

    keys = pianoKeyboard.querySelectorAll('[data-key]');

    keys.forEach(key =>
    {
        let octave = key.parentElement.dataset.octave;
        let nodes = {
            oscillator: null, 
            gainNode: null
        };

        const updateFrequency = e =>
        {
            const factor = Number(e.target.value);
            numOctaveOffset.value = factor;
            // slideOctaveOffset.value = factor;
            // slideOctaveOffset.title = factor;
            options.octaveOffset = factor;
            
            saveOptions();
        }

        // slideOctaveOffset.addEventListener('input', updateFrequency);

        numOctaveOffset.addEventListener('input', updateFrequency);

        const pressPianoKey = () =>
        {
            key.classList.add('active');
            
            nodes = playNote(notes[key.dataset.key], octave, audioCtx);

            nodes.gainNode.connect(dest);
        }

        const pianoKeyDown = e =>
        {
            navigator?.vibrate?.(20);
            mouseDown = true;

            if(!audioCtx)
            {
                initializeAudioContext();
            }

            if(mouseButton !== undefined && mouseButton !== 0) return;

            pressPianoKey();        

            key.addEventListener('mouseleave', pianoKeyUp);
            key.addEventListener('mouseup', pianoKeyUp);
            
            // Mobile
            key.addEventListener('touchcancel', pianoKeyUp);
            key.addEventListener('touchend', pianoKeyUp);
        }
        
        const pianoKeyUp = e =>
        {
            if(mouseButton !== undefined && mouseButton !== 0) return;

            key.classList.remove('active');

            stopFrequency(nodes.oscillator, nodes.gainNode, audioCtx);

            key.removeEventListener('mouseleave', pianoKeyUp);
            key.removeEventListener('mouseup', pianoKeyUp);

            // Mobile
            key.removeEventListener('touchcancel', pianoKeyUp);
            key.removeEventListener('touchend', pianoKeyUp);
        }

        const mouseOverHandler = () => {
            if(!mouseDown) return;
            
            pianoKeyDown();
        }

        key.addEventListener('mouseover', mouseOverHandler);
        key.addEventListener('touchmove', mouseOverHandler);
        
        key.addEventListener('mousedown', pianoKeyDown);
        key.addEventListener('touchstart', pianoKeyDown);
    });
}

function playNote(note, octave, audioCtx)
{
    if(!notes.includes(note.toLowerCase())) return;

    const steps = notes.indexOf(note.toLowerCase());
    const frequency = getNoteFrequency(steps) * (2**octave * 2**Number(options.octaveOffset));

    console.log('Playing note', note, 'of octave', Number(octave), 'with a frequency of', frequency);

    return playFrequency(frequency, audioCtx);
}

function playFrequency(freq, audioCtx)
{
    const attack = 1;
    const gainNode = audioCtx.createGain();
    const oscillator = audioCtx.createOscillator();

    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.setTargetAtTime(1, audioCtx.currentTime, attack / 1000);
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    oscillator.type = selectWaveType.value;
    oscillator.connect(gainNode);
    oscillator.start();

    return { oscillator, gainNode };
}

function stopFrequency(oscillator, gainNode, audioCtx)
{
    const attack = 1;
    const release = options.resonanceTime*100;

    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime + attack / 1000, release / 1000);
    setTimeout(() =>
    {
        oscillator.stop();
        oscillator.disconnect(gainNode);
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.disconnect(audioCtx.destination);
    }, attack * 10 + release * 10);
}

window.addEventListener('close', saveOptions);
