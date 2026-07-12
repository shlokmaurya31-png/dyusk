(function(){
  // preloader — counts up, then wipes away
  var pre = document.getElementById('preloader');
  if(pre){
    var countEl = pre.querySelector('.pre-count');
    var n = 0;
    var tick = setInterval(function(){
      n = Math.min(100, n + Math.ceil(Math.random() * 18));
      if(countEl) countEl.textContent = ('00' + n).slice(-3);
      if(n >= 100) clearInterval(tick);
    }, 90);
    window.addEventListener('load', function(){
      setTimeout(function(){
        if(countEl) countEl.textContent = '100';
        pre.classList.add('done');
      }, 900);
    });
    // failsafe — never trap the page behind the loader
    setTimeout(function(){ pre.classList.add('done'); }, 4000);
  }

  // theme switcher — cream (default) / dark / red
  function applyTheme(t){
    if(t === 'dark' || t === 'red'){
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  var saved = null;
  try{ saved = localStorage.getItem('dyusk-theme'); }catch(e){}
  if(saved) applyTheme(saved);
  document.querySelectorAll('.theme-dot').forEach(function(dot){
    dot.addEventListener('click', function(){
      var t = dot.getAttribute('data-set');
      applyTheme(t);
      try{ localStorage.setItem('dyusk-theme', t); }catch(e){}
    });
  });

  // reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, {threshold:0.12});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // art marquee — infinite scroll; eases to 90% speed while hovered
  (function(){
    var wrap = document.getElementById('artMarquee');
    if(!wrap) return;
    var track = wrap.querySelector('.art-track');
    if(!track || !track.children.length) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // duplicate the set once so the loop is seamless
    Array.prototype.slice.call(track.children).forEach(function(node){
      var c = node.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
    // cruises at 1.5x, eases down to 1x while hovered
    var x = 0, mult = 1.5, target = 1.5;
    var BASE = 60; // px per second at 1x
    wrap.addEventListener('mouseenter', function(){ target = 1; });
    wrap.addEventListener('mouseleave', function(){ target = 1.5; });
    var last = null;
    function frame(ts){
      if(last === null) last = ts;
      var dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      mult += (target - mult) * 0.06;
      x -= BASE * mult * dt;
      var half = track.scrollWidth / 2;
      if(half > 0 && -x >= half) x += half;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  // contact form — creates a CRM lead in the Odoo backend via website_form
  (function(){
    var form = document.getElementById('contactForm');
    if(!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var hint = form.querySelector('.cf-hint');
      var btn = form.querySelector('button[type="submit"]');
      var name = (form.contact_name.value || '').trim();
      var email = (form.email_from.value || '').trim();
      var msg = (form.description.value || '').trim();
      if(!name || !email.includes('@') || !msg){
        if(hint) hint.textContent = 'Please fill name, email and message.';
        return;
      }
      // on the live store website.layout defines odoo.csrf_token; in a static
      // preview there is no backend at all, so fall back to plain email there
      if(location.protocol === 'file:'){
        window.location.href = 'mailto:shlok@dyusk.com?subject=' +
          encodeURIComponent('Website enquiry — ' + name) +
          '&body=' + encodeURIComponent(msg);
        return;
      }
      var token = (window.odoo && window.odoo.csrf_token) || '';
      var fd = new FormData(form);
      fd.append('name', 'Website enquiry — ' + name);
      if(token) fd.append('csrf_token', token);
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/website/form/crm.lead', { method:'POST', body: fd, credentials:'same-origin' })
        .then(function(r){ return r.json(); })
        .then(function(res){
          if(res && (res.id || (res.result && res.result.id))){
            form.reset();
            btn.textContent = 'Sent';
            if(hint) hint.textContent = 'Got it — we reply within 24 hours.';
          } else { throw new Error('rejected'); }
        })
        .catch(function(){
          btn.disabled = false; btn.textContent = 'Send Message';
          if(hint) hint.textContent = 'Could not send — email shlok@dyusk.com instead.';
        });
    });
  })();

  // header hides on scroll down, returns on scroll up
  var header = document.getElementById('siteHeader');
  if(header){
    var lastY = 0;
    window.addEventListener('scroll', function(){
      var y = window.scrollY;
      header.style.transform = (y > 160 && y > lastY) ? 'translateY(-110%)' : '';
      lastY = y;
    }, {passive:true});
  }
})();
