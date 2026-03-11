const form = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');
const menuToggle = document.getElementById('menu-toggle');
const menu = document.getElementById('menu');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name');
    formMessage.textContent = `Teşekkürler ${name}, talebinizi aldık. 24 saat içinde dönüş yapacağız.`;
    form.reset();
  });
}

if (menuToggle && menu) {
  menuToggle.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

const faders = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('appear');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

faders.forEach((el) => observer.observe(el));
