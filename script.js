const root = document.documentElement;
const light = document.querySelector('[data-light]');
const lightLabel = document.querySelector('[data-light-label]');
const header = document.querySelector('[data-header]');
const blind = document.querySelector('[data-blind]');
const lightEffect = document.querySelector('[data-light-effect]');
const heroShade = document.querySelector('.hero-shade');
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#mobile-navigation');
const scrollProgress = document.querySelector('[data-scroll-progress]');
let scrollFrame = 0;

function setMenuOpen(isOpen) {
  header.classList.toggle('menu-open', isOpen);
  menu.setAttribute('aria-expanded', String(isOpen));
  menu.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
}

menu.addEventListener('click', () => setMenuOpen(menu.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenuOpen(false);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 820) setMenuOpen(false);
}, { passive: true });

function setLight(value) {
  const openness = Number(value) / 100;
  blind.style.transform = `translateX(${openness * 88}%)`;
  lightEffect.style.opacity = String(0.08 + openness * 0.52);
  heroShade.style.opacity = String(0.92 - openness * 0.22);
  lightLabel.textContent = `${value}%`;
  light.setAttribute('aria-valuetext', `${value}% de luz natural`);
  window.dispatchEvent(new CustomEvent('blackout:light', { detail: { openness } }));
}

setLight(light.value);
light.addEventListener('input', (event) => setLight(event.target.value));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((element, index) => {
  if (element.closest('.hero')) element.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
  observer.observe(element);
});

function updateScrollState() {
  scrollFrame = 0;
  header.classList.toggle('scrolled', window.scrollY > 40);
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  scrollProgress.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
}

function requestScrollStateUpdate() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState);
}

updateScrollState();
window.addEventListener('scroll', requestScrollStateUpdate, { passive: true });
window.addEventListener('resize', requestScrollStateUpdate, { passive: true });
