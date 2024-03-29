export function generateOctaves(pianoKeyboard, octaveTemplate, count)
{
    document.documentElement.style
    .setProperty('--octave-count', ` ${count}`);

    pianoKeyboard.innerHTML = '';
    for(let i = 0; i < count; i++)
    {
        const newOctave = octaveTemplate.content.cloneNode(true).firstElementChild;

        newOctave.dataset.octave = i;

        newOctave.style.animationDelay = `${i*0.1}s`;
        newOctave.style.animationPlayState = 'running';
        pianoKeyboard.appendChild(newOctave);
    }
}