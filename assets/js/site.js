(function(){
  // preloader
  window.addEventListener('load', function(){
    setTimeout(function(){
      var preloader = document.getElementById('preloader');
      if(preloader) preloader.classList.add('done');
      var heroEl = document.querySelector('.hero');
      if(heroEl) heroEl.classList.add('ready');
    }, 2100);
  });

  // theme toggle
  var themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme){
    if(theme === 'light'){
      document.documentElement.setAttribute('data-theme','light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if(themeToggle){
      themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
  }
  var savedTheme = 'dark';
  try{ savedTheme = localStorage.getItem('dyusk-theme') || 'dark'; }catch(e){}
  applyTheme(savedTheme);
  if(themeToggle){
    themeToggle.addEventListener('click', function(){
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try{ localStorage.setItem('dyusk-theme', next); }catch(e){}
    });
  }

  // header shrink
  var header = document.getElementById('siteHeader');
  if(header){
    window.addEventListener('scroll', function(){
      header.classList.toggle('scrolled', window.scrollY > 40);
    }, {passive:true});
  }

  // mobile nav
  var burger = document.getElementById('navBurger');
  var links = document.getElementById('navLinks');
  if(burger && links){
    burger.addEventListener('click', function(){ links.classList.toggle('open'); });
    links.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ links.classList.remove('open'); }); });
  }

  // cursor glow (desktop only, hero pages only)
  var glow = document.getElementById('cursorGlow');
  var hero = document.querySelector('.hero');
  if(hero && glow && window.matchMedia('(pointer:fine)').matches){
    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect();
      glow.style.transform = 'translate(' + (e.clientX - r.left - 300) + 'px,' + (e.clientY - r.top - 300) + 'px)';
    });
  }

  // reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){ en.target.classList.add('in'); }
    });
  }, {threshold:0.15});
  revealEls.forEach(function(el){ io.observe(el); });

  // counters
  var counted = false;
  var counters = document.querySelectorAll('.c-num');
  var statsIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting && !counted){
        counted = true;
        counters.forEach(function(c){
          var target = parseInt(c.getAttribute('data-target'),10);
          var dur = 1400; var startTime = null;
          function step(ts){
            if(!startTime) startTime = ts;
            var progress = Math.min((ts-startTime)/dur,1);
            var eased = 1 - Math.pow(1-progress,3);
            c.textContent = Math.floor(eased * target);
            if(progress < 1) requestAnimationFrame(step); else c.textContent = target;
          }
          requestAnimationFrame(step);
        });
      }
    });
  }, {threshold:0.4});
  var statsGrid = document.querySelector('.stats-grid');
  if(statsGrid) statsIO.observe(statsGrid);

  // product card / product-stage color + front-back interactivity
  (function(){
    var names = { black:'Onyx', steel:'Steel', white:'Arctic' };
    var params = new URLSearchParams(location.search);
    var initialColor = params.get('color');

    document.querySelectorAll('.product-card[data-sleeve]').forEach(function(card){
      var sleeve = card.getAttribute('data-sleeve');
      var photo = card.querySelector('.pc-photo');
      var label = card.querySelector('.pc-color-label');
      var flipBtn = card.querySelector('.pc-flip');
      var swatches = card.querySelectorAll('.pc-swatch');
      if(!photo || !swatches.length) return;
      var sleeveLabel = sleeve === 'full' ? 'Full Sleeve' : 'Half Sleeve';

      var startColor = 'black';
      if(card.classList.contains('stage') && initialColor && names[initialColor]){
        startColor = initialColor;
      }
      var state = { color: startColor, view: 'front' };

      function render(){
        photo.src = 'assets/products/' + sleeve + '-' + state.view + '-' + state.color + '.png';
        photo.alt = 'DYUSK ' + sleeveLabel + ' compression shirt, ' + names[state.color] + ', ' + state.view + ' view';
        if(label) label.textContent = names[state.color];
        if(card.tagName === 'A'){
          card.setAttribute('href', 'product-' + sleeve + '-sleeve.html?color=' + state.color);
        }
      }

      swatches.forEach(function(sw){
        sw.classList.toggle('active', sw.getAttribute('data-color') === state.color);
        sw.addEventListener('click', function(e){
          e.preventDefault(); e.stopPropagation();
          state.color = sw.getAttribute('data-color');
          swatches.forEach(function(s){ s.classList.remove('active'); });
          sw.classList.add('active');
          render();
        });
      });

      if(flipBtn){
        flipBtn.addEventListener('click', function(e){
          e.preventDefault(); e.stopPropagation();
          state.view = state.view === 'front' ? 'back' : 'front';
          render();
        });
      }

      render();
    });
  })();

  // built-for carousel autoplay
  (function(){
    var wrap = document.getElementById('bfCarousel');
    var track = document.getElementById('bfTrack');
    if(!wrap || !track) return;
    var paused = false;
    wrap.addEventListener('mouseenter', function(){ paused = true; });
    wrap.addEventListener('mouseleave', function(){ paused = false; });
    wrap.addEventListener('touchstart', function(){ paused = true; }, {passive:true});
    wrap.addEventListener('touchend', function(){ setTimeout(function(){ paused = false; }, 2500); }, {passive:true});
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion) return;
    setInterval(function(){
      if(paused) return;
      var card = track.querySelector('.bf-card');
      var step = card ? card.getBoundingClientRect().width + 16 : 184;
      var maxScroll = track.scrollWidth - track.clientWidth;
      if(track.scrollLeft >= maxScroll - 4){
        track.scrollTo({left:0, behavior:'smooth'});
      } else {
        track.scrollTo({left: track.scrollLeft + step, behavior:'smooth'});
      }
    }, 2200);
  })();

  // mode switching (toggle buttons + scroll-linked) -- index.html compare section only
  var btnFull = document.getElementById('btnFull');
  var btnHalf = document.getElementById('btnHalf');
  if(btnFull && btnHalf){
    var body = document.body;
    var garmentFull = document.getElementById('garmentFull');
    var garmentHalf = document.getElementById('garmentHalf');
    var visualTag = document.getElementById('visualTag');
    var visualPrice = document.getElementById('visualPrice');
    var specBlocks = document.querySelectorAll('.spec-block');

    var setMode = function(mode){
      body.setAttribute('data-mode', mode);
      document.documentElement.style.setProperty('--accent', mode === 'half' ? 'var(--flux)' : 'var(--pressure)');
      document.documentElement.style.setProperty('--accent-dim', mode === 'half' ? 'var(--flux-dim)' : 'var(--pressure-dim)');
      garmentFull.classList.toggle('hide', mode !== 'full');
      garmentHalf.classList.toggle('hide', mode !== 'half');
      btnFull.classList.toggle('active', mode === 'full');
      btnHalf.classList.toggle('active', mode === 'half');
      if(mode === 'full'){
        visualTag.textContent = 'Full Sleeve — 01';
        visualPrice.innerHTML = '₹2,499 <small>Full Sleeve — Onyx</small>';
      } else {
        visualTag.textContent = 'Half Sleeve — 02';
        visualPrice.innerHTML = '₹2,199 <small>Half Sleeve — Onyx</small>';
      }
    };

    btnFull.addEventListener('click', function(){
      setMode('full');
      specBlocks[0].scrollIntoView({behavior:'smooth', block:'center'});
    });
    btnHalf.addEventListener('click', function(){
      setMode('half');
      specBlocks[1].scrollIntoView({behavior:'smooth', block:'center'});
    });

    var specIO = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          setMode(en.target.getAttribute('data-mode'));
        }
      });
    }, {threshold:0.55});
    specBlocks.forEach(function(b){ specIO.observe(b); });
  }
})();
