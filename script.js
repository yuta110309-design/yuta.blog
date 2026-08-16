const reveals = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

reveals.forEach((el) => observer.observe(el));

// Maker teaser: category tabs only switch the preview emoji row (no placement/ranking yet)
const makerTabs = document.querySelectorAll('.maker-tab');
makerTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const cat = tab.dataset.cat;
    makerTabs.forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('[data-cat-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.catPanel !== cat;
    });
  });
});
