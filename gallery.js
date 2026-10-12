const galleryDialog = document.querySelector('.gallery-dialog');
const dialogImage = document.querySelector('#gallery-dialog-image');
const dialogCaption = document.querySelector('#gallery-dialog-caption');
const dialogCount = document.querySelector('#gallery-dialog-count');
const triggers = [...document.querySelectorAll('.gallery-trigger')];
const photos = triggers.map((trigger) => {
  const image = trigger.querySelector('img');
  const caption = trigger.closest('figure').querySelector('figcaption');

  return {
    image,
    caption: caption.textContent.trim().replace(/\s+/g, ' '),
  };
});

let activePhoto = 0;

function showPhoto(index) {
  activePhoto = (index + photos.length) % photos.length;
  const photo = photos[activePhoto];

  dialogImage.src = photo.image.currentSrc || photo.image.src;
  dialogImage.alt = photo.image.alt;
  dialogCaption.textContent = photo.caption;
  dialogCount.textContent = `${activePhoto + 1} / ${photos.length}`;
}

function movePhoto(direction) {
  showPhoto(activePhoto + direction);
}

triggers.forEach((trigger, index) => {
  trigger.addEventListener('click', () => {
    showPhoto(index);
    galleryDialog.showModal();
  });
});

document.querySelector('.gallery-prev').addEventListener('click', () => movePhoto(-1));
document.querySelector('.gallery-next').addEventListener('click', () => movePhoto(1));
document.querySelector('.gallery-close').addEventListener('click', () => galleryDialog.close());

galleryDialog.addEventListener('click', (event) => {
  if (event.target === galleryDialog) galleryDialog.close();
});

document.addEventListener('keydown', (event) => {
  if (!galleryDialog.open) return;

  if (event.key === 'Escape') galleryDialog.close();
  if (event.key === 'ArrowLeft') movePhoto(-1);
  if (event.key === 'ArrowRight') movePhoto(1);
});
