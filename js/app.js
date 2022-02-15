const optionsElem = document.querySelector('.options');
const selectWaveType = optionsElem.querySelector('#selectWaveType');
const slideOctaveRange = optionsElem.querySelector('#slideOctaveRange');
const numOctaveRange = optionsElem.querySelector('#numOctaveRange');

const pianoKeyboard = document.querySelector('.piano-keyboard');
const keys = pianoKeyboard.querySelectorAll('[data-key]');

const notes = {
    'c': 16.35,
    'c#': 17.32,
    'd': 18.35,
    'd#': 19.45,
    'e': 20.60,
    'f': 21.83,
    'f#': 23.12,
    'g': 24.50,
    'g#': 25.96,
    'a': 27.50,
    'a#': 29.14,
    'b': 30.87
}

let audioCtx;

let options = 
{
    octaveFactor: slideOctaveRange.value
}

pianoKeyboard.addEventListener('contextmenu', e => e.preventDefault());

keys.forEach(key =>
{
    let note = notes[key.dataset.key];
    let octave = key.parentElement.dataset.octave;
    let frequency = note * options.octaveFactor * octave;

    let gainNode;
    let oscillator;

    const updateFrequency = e =>
    {
        const factor = e.target.value;
        numOctaveRange.value = factor;
        slideOctaveRange.value = factor;
        slideOctaveRange.title = factor;
        options.octaveFactor = factor;
        frequency = note * options.octaveFactor * octave;
    }

    slideOctaveRange.addEventListener('input', updateFrequency);

    numOctaveRange.addEventListener('input', updateFrequency);

    const pressPianoKey = () =>
    {
        key.classList.add('active');

        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        oscillator = playNote(frequency, gainNode);
    }

    const pianoKeyDown = e =>
    {
        if(!audioCtx)
        {
            audioCtx = new AudioContext();
        }

        if(e.button !== undefined && e.button !== 0) return;

        pressPianoKey();        

        key.addEventListener('mouseup', pianoKeyUp);
        key.addEventListener('mouseleave', pianoKeyUp);
        key.addEventListener('mouseout', pianoKeyUp);
        
        // Mobile
        key.addEventListener('touchend', pianoKeyUp);
        key.addEventListener('touchcancel', pianoKeyUp);
    }
    
    const pianoKeyUp = e =>
    {
        if(e.button !== undefined && e.button !== 0) return;

        key.classList.remove('active');
        gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);
        oscillator.stop(audioCtx.currentTime + 1);

        key.removeEventListener('mouseup', pianoKeyUp);
        key.removeEventListener('mouseleave', pianoKeyUp);
        key.removeEventListener('mouseout', pianoKeyUp);

        // Mobile
        key.removeEventListener('touchend', pianoKeyUp);
        key.removeEventListener('touchcancel', pianoKeyUp);
    }

    
    key.addEventListener('mousedown', pianoKeyDown);
    key.addEventListener('touchstart', pianoKeyDown);
});

function playNote(frequency, gainNode, endcallback)
{
    const oscillator = audioCtx.createOscillator();
    oscillator.type = selectWaveType.value;
    oscillator.frequency.value = frequency;
    oscillator.connect(gainNode);

    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);

    if(endcallback)
    {
        oscillator.addEventListener('ended', endcallback);
    }

    oscillator.start();

    return oscillator;
}