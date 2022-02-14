const selectWaveType = document.getElementById('selectWaveType');
const keys = document.querySelectorAll('[data-key]');

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

let touchActive = false;

keys.forEach(key =>
{
    const note = notes[key.dataset.key]*8*key.parentElement.dataset.octave;
    console.log(note);

    let oscillator;

    const pianoKeyDown = e =>
    {
        if(!audioCtx)
        {
            audioCtx = new window.AudioContext();
        }

        console.log(e.target);

        key.classList.add('active');

        oscillator = playNote(note);

        key.addEventListener('mouseup', pianoKeyUp);
        key.addEventListener('mouseleave', pianoKeyUp);
        key.addEventListener('mouseout', pianoKeyUp);
        
        // Mobile
        key.addEventListener('touchend', touchEnd);
        key.addEventListener('touchcancel', pianoKeyUp);
    }
    
    const pianoKeyUp = () =>
    {
        key.classList.remove('active');
        oscillator.stop();

        key.removeEventListener('mouseup', pianoKeyUp);
        key.removeEventListener('mouseleave', pianoKeyUp);
        key.removeEventListener('mouseout', pianoKeyUp);

        // Mobile
        key.removeEventListener('touchmove', touchMove);
        key.removeEventListener('touchend', touchEnd);
        key.removeEventListener('touchcancel', pianoKeyUp);
    }

    
    key.addEventListener('mousedown', pianoKeyDown);

    // Mobile
    const touchMove = e =>
    {
        if(touchActive)
        {
            note = notes[e.target.dataset.key]*8*e.target.parentElement.dataset.octave;
            oscillator = playNote(note);
        }
        else
        {
            pianoKeyUp();
        }
    }

    const touchEnd = e =>
    {
        touchActive = false;
        pianoKeyUp(e);
    }

    key.addEventListener('touchmove', touchMove);
    key.addEventListener('touchstart', e =>
    {
        touchActive = true;
        pianoKeyDown(e);
    });
});

function playNote(frequency, endcallback)
{
    const oscillator = audioCtx.createOscillator();
    oscillator.type = selectWaveType.value;
    oscillator.frequency.value = frequency;
    oscillator.connect(audioCtx.destination);
    if(endcallback)
    {
        oscillator.addEventListener('ended', endcallback);
    }
    oscillator.start(0);

    return oscillator;
}