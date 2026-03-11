// js/main.js

// Basit form gönderim işlemi
const form = document.getElementById('contact-form');
form.addEventListener('submit', function(e) {
e.preventDefault();
alert('Mesajınız gönderildi!');
form.reset();
});

// Scroll animasyonları için basit fade-in ekleme
const faders = document.querySelectorAll('.fade-in');
const appearOptions = {
threshold: 0.5,
rootMargin: "0px 0px -50px 0px"
};
const appearOnScroll = new IntersectionObserver(function(entries, appearOnScroll) {
entries.forEach(entry => {
if (!entry.isIntersecting) return;
entry.target.classList.add('appear');
appearOnScroll.unobserve(entry.target);
});
}, appearOptions);

faders.forEach(fader => {
appearOnScroll.observe(fader);
});
