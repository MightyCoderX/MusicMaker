const optionsElem = document.querySelector('.options');
const selectWaveType = optionsElem.querySelector('#selectWaveType');
const slideOctaveOffset = optionsElem.querySelector('#slideOctaveOffset');
const numOctaveOffset = optionsElem.querySelector('#numOctaveOffset');
const numOctaveCount = optionsElem.querySelector('#numOctaveCount');
const numResonanceTime = optionsElem.querySelector('#numResonanceTime');

let keys = pianoKeyboard.querySelectorAll('[data-key]');

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

let playingOscillators = {};

let audioCtx;
let channelMerger;

let options = 
{
    octaveCount: 2,
    octaveFactor: 10,
    resonanceTime: 1
}

let pianoKeyDownArray = [];

numOctaveCount.addEventListener('change', () =>
{
    options.octaveCount = Number(numOctaveCount.value);
    setupKeyboard(options.octaveCount);
});

numResonanceTime.addEventListener('change', () =>
{
    options.resonanceTime = Number(numResonanceTime.value);
});

setupKeyboard(options.octaveCount);

pianoKeyboard.addEventListener('contextmenu', e => e.preventDefault());

function setupKeyboard(octaveCount)
{
    generateOctaves(octaveCount);

    keys = pianoKeyboard.querySelectorAll('[data-key]');

    keys.forEach(key =>
    {
        let note = notes[key.dataset.key];
        let octave = key.parentElement.dataset.octave;
        let frequency = note * options.octaveFactor * octave;

        let gainNode;
        let oscillator;

        const updateFrequency = e =>
        {
            const factor = Number(e.target.value);
            numOctaveOffset.value = factor;
            // slideOctaveOffset.value = factor;
            // slideOctaveOffset.title = factor;
            options.octaveFactor = factor;
            frequency = note * options.octaveFactor * octave;
        }

        // slideOctaveOffset.addEventListener('input', updateFrequency);

        numOctaveOffset.addEventListener('input', updateFrequency);

        const pressPianoKey = () =>
        {
            key.classList.add('active');

            if(playingOscillators[key.dataset.key + octave]) playingOscillators[key.dataset.key + octave].stop();
            
            channelMerger = audioCtx.createChannelMerger(Object.keys(playingOscillators).length || 1);
            channelMerger.connect(audioCtx.destination);

            gainNode = audioCtx.createGain();
            gainNode.connect(channelMerger, 0);
            oscillator = playNote(frequency, gainNode);

            playingOscillators[key.dataset.key + octave] = oscillator;
        }

        const pianoKeyDown = e =>
        {
            if(!audioCtx)
            {
                audioCtx = new AudioContext();
                channelMerger = audioCtx.createChannelMerger(1);
                channelMerger.connect(audioCtx.destination);
            }

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