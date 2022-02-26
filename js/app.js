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

let pianoKeyDownArray = [];

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

function setupKeyboard(octaveCount)
{
    generateOctaves(octaveCount);

    keys = pianoKeyboard.querySelectorAll('[data-key]');

    //TODO: Optimize by not declaring the same functions for every key
    keys.forEach(key =>
    {
        let octave = key.parentElement.dataset.octave;
        let frequency = (octave * 2**Number(options.octaveOffset)) * getNoteFrequency(key.dataset.key);

        let gainNode;
        let oscillator;

        const updateFrequency = e =>
        {
            const factor = Number(e.target.value);
            numOctaveOffset.value = factor;
            // slideOctaveOffset.value = factor;
            // slideOctaveOffset.title = factor;
            options.octaveOffset = factor;
            frequency = (octave * 2**factor) * getNoteFrequency(key.dataset.key);
            
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
            if(!audioCtx)
            {
                audioCtx = new AudioContext();
            }

            navigator.vibrate(20);

            if(e.button !== undefined && e.button !== 0) return;

            pressPianoKey();        

            key.addEventListener('mouseleave', pianoKeyUp);
            key.addEventListener('mouseup', pianoKeyUp);
            
            // Mobile
            key.addEventListener('touchcancel', pianoKeyUp);
            key.addEventListener('touchend', pianoKeyUp);
        }

        pianoKeyDownArray.push(pianoKeyDown);
        
        const pianoKeyUp = e =>
        {
            if(e.button !== undefined && e.button !== 0) return;

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