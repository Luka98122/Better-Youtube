// Function to toggle the blur effect
const toggleBlur = () => {
  const video = document.querySelector('video');
  if (!video) return;

  if (document.hidden) {
    video.style.filter = 'blur(20px)';
    video.style.transition = 'filter 0.3s ease'; // Smoothly blur
  } else {
    video.style.filter = 'none';
  }
};

// Listen for tab switching
document.addEventListener('visibilitychange', toggleBlur);

// Optional: Listen for window focus/blur (e.g., clicking on another app)
window.addEventListener('blur', () => {
  const video = document.querySelector('video');
  if (video) video.style.filter = 'blur(20px)';
});

window.addEventListener('focus', () => {
  const video = document.querySelector('video');
  if (video) video.style.filter = 'none';
});