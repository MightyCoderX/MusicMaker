const pianoKeyboard = document.querySelector('.piano-keyboard');
const octaveTemplate = document.getElementById('octaveTemplate');

function generateOctaves(count)
{
    pianoKeyboard.innerHTML = '';
    for(let i = 1; i <= count; i++)
    {
        const newOctave = octaveTemplate.content.cloneNode(true).firstElementChild;

        newOctave.dataset.octave = i;

        newOctave.style.animationDelay = `${i*0.1}s`;
        newOctave.style.animationPlayState = 'running';
        pianoKeyboard.appendChild(newOctave);
    }
}