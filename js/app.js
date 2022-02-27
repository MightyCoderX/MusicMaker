const optionsElem = document.querySelector('.options');
const selectWaveType = optionsElem.querySelector('#selectWaveType');
const slideOctaveOffset = optionsElem.querySelector('#slideOctaveOffset');
const numOctaveOffset = optionsElem.querySelector('#numOctaveOffset');
const numOctaveCount = optionsElem.querySelector('#numOctaveCount');
const numResonanceTime = optionsElem.querySelector('#numResonanceTime');

let keys = pianoKeyboard.querySelectorAll('[data-key]');

const notes = [
    'c', 'c#', 'd', 'd#', 
    'e', 'f', 'f#', 'g', 
    'g#', 'a', 'a#', 'b'
];

let getNoteFrequency = n => 16.35 * ((2**(1/12)) ** n)

let audioCtx;

//TODO: Limit octaveOffset and octaveCount to account for maximum frequency
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
        audioCtx = new AudioContext();
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

window.addEventListener('mousedown', mouseDownHandler);
window.addEventListener('touchstart', mouseDownHandler);

function setupKeyboard(octaveCount)
{
    generateOctaves(octaveCount);

    keys = pianoKeyboard.querySelectorAll('[data-key]');

    keys.forEach(key =>
    {
        let octave = key.parentElement.dataset.octave;
        let frequency = (2**octave * 2**Number(options.octaveOffset)) * getNoteFrequency(key.dataset.key);

        let gainNode;
        let oscillator;

        const updateFrequency = e =>
        {
            const factor = Number(e.target.value);
            numOctaveOffset.value = factor;
            // slideOctaveOffset.value = factor;
            // slideOctaveOffset.title = factor;
            options.octaveOffset = factor;
            frequency = (2**octave * 2**factor) * getNoteFrequency(key.dataset.key);
            
            saveOptions();
        }

        // slideOctaveOffset.addEventListener('input', updateFrequency);

        numOctaveOffset.addEventListener('input', updateFrequency);

        const pressPianoKey = () =>
        {
            key.classList.add('active');

            if(oscillator) oscillator.stop(audioCtx.currentTime);

            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
            console.log("Playing note", key.dataset.key, "(" + notes[key.dataset.key] + ")", 
                "of octave", octave, "with a frequency of", frequency);
            
            
            oscillator = playNote(frequency, gainNode);
        }

        const pianoKeyDown = e =>
        {
            navigator.vibrate(20);
            mouseDown = true;

            if(!audioCtx)
            {
                audioCtx = new AudioContext();
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

            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + options.resonanceTime);
            oscillator.stop(audioCtx.currentTime + options.resonanceTime);

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

window.addEventListener('close', saveOptions);