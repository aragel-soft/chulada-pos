export const playSound = (type: 'success' | 'error') => {
  try {
    const audio = new Audio(
      type === 'success' 
        ? '/sounds/beep-success.mp3' 
        : '/sounds/beep-error.mp3'
    );
    audio.volume = 0.5; 
    audio.play().catch(e => console.warn("Error reproduciendo sonido:", e));
  } catch (error) {
    console.error("Audio no soportado o archivo faltante", error);
  }
};