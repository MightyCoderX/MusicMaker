const selectWaveType = document.getElementById('selectWaveType');
const keys = document.querySelectorAll('[data-key]');

const audioCtx = new window.AudioContext();

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

keys.forEach(key =>
{
    key.addEventListener('mousedown', e =>
    {
        console.log(e.target);

        const note = notes[e.target.dataset.key]*8*e.target.parentElement.dataset.octave;

        console.log(note);
        
        const oscillator = playKey(note);

        const pianoKeyUp = () =>
        {
            oscillator.stop();
            key.removeEventListener('mouseup', pianoKeyUp);
            key.removeEventListener('mouseleave', pianoKeyUp);
            key.removeEventListener('mouseout', pianoKeyUp);
        }

        key.addEventListener('mouseup', pianoKeyUp);
        key.addEventListener('mouseleave', pianoKeyUp);
        key.addEventListener('mouseout', pianoKeyUp);
    });
});

function playKey(frequency, endcallback)
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