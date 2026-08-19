/* ---- 11 / SCROLL REVEAL ---- */
(function(){
  var items = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){
    items.forEach(function(el){el.classList.add('is-visible');});
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  },{threshold:0.12, rootMargin:'0px 0px -60px 0px'});
  items.forEach(function(el){io.observe(el);});
})();

/* ---- CAROUSELS ---- */
document.querySelectorAll('[data-scroll]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var track = document.getElementById(btn.dataset.target);
    if(!track) return;
    var card = track.querySelector(':scope > *');
    var step = card ? card.getBoundingClientRect().width + 24 : track.clientWidth * 0.6;
    track.scrollBy({left: btn.dataset.scroll === 'next' ? step : -step, behavior:'smooth'});
  });
});

/* ---- FAQ ACCORDION ---- */
document.querySelectorAll('.faq-q').forEach(function(q){
  q.addEventListener('click', function(){
    var item = q.parentElement;
    var open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i){
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight = null;
      i.querySelector('.sign').textContent = '+';
      i.querySelector('.faq-q').setAttribute('aria-expanded','false');
    });
    if(!open){
      var panel = item.querySelector('.faq-a');
      item.classList.add('open');
      panel.style.maxHeight = panel.scrollHeight + 'px';
      q.querySelector('.sign').textContent = '\u2212';
      q.setAttribute('aria-expanded','true');
    }
  });
});
/* open the first FAQ item on load, as designed */
window.addEventListener('load', function(){
  var first = document.querySelector('.faq-item.open .faq-a');
  if(first) first.style.maxHeight = first.scrollHeight + 'px';
});

/* ---- MOBILE NAV ---- */
(function(){
  var toggle = document.querySelector('.nav-toggle');
  var links  = document.querySelector('.nav-links');
  if(!toggle) return;
  toggle.addEventListener('click', function(){
    var shown = links.style.display === 'flex';
    links.style.display = shown ? '' : 'flex';
    links.style.position = 'absolute';
    links.style.top = (document.querySelector('.site-header').offsetHeight)+'px';
    links.style.left = '0';
    links.style.right = '0';
    links.style.flexDirection = 'column';
    links.style.alignItems = 'flex-start';
    links.style.gap = '4px';
    links.style.background = '#fff';
    links.style.borderBottom = '1px solid var(--border-grey)';
    links.style.padding = '16px 20px 20px';
    links.style.margin = '0';
  });
})();

/* ---- FORM ---- */
document.querySelectorAll('form[data-booking]').forEach(function(form){
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    if(!btn) return;
    btn.textContent = 'Meeting requested.';
    btn.disabled = true;
  });
});

/* ---- PORTFOLIO FILTERS ---- */
(function(){
  var chips = document.querySelectorAll('.filter-chip');
  if(!chips.length) return;
  var cards = document.querySelectorAll('.work-card');
  chips.forEach(function(chip){
    chip.addEventListener('click', function(){
      chips.forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');
      var f = chip.dataset.filter;
      cards.forEach(function(card){
        var show = (f === 'all' || card.dataset.category === f);
        card.style.display = show ? '' : 'none';
        if(show){ card.classList.remove('is-visible'); void card.offsetWidth; card.classList.add('is-visible'); }
      });
    });
  });
})();

/* ---- LOAD MORE ---- */
(function(){
  var btn = document.querySelector('[data-loadmore]');
  if(!btn) return;
  btn.addEventListener('click', function(){
    btn.textContent = 'Archive request sent.';
    btn.disabled = true;
  });
})();
