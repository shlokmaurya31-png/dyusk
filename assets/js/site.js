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

  // sewing thread — spools out of the machine sketch, laces through the
  // scattered products and ties off at the ©26 in the footer. The path is
  // rebuilt from real element positions, so it survives any layout change.
  (function(){
    var layer = document.getElementById('threadLayer');
    var svg = document.getElementById('threadSvg');
    if(!layer || !svg) return;
    var maskEl = svg.querySelector('mask');
    var maskPath = document.getElementById('threadMaskPath');
    var ropePaths = svg.querySelectorAll('g path');
    var len = 0, startY = 0, endY = 1, built = false;
    var cur = 0, targetP = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function rect(sel){
      var el = document.querySelector(sel);
      if(!el) return null;
      var r = el.getBoundingClientRect();
      var sx = window.pageXOffset, sy = window.pageYOffset;
      return { left:r.left+sx, top:r.top+sy, right:r.right+sx, bottom:r.bottom+sy,
               w:r.width, h:r.height,
               cx:r.left+sx+r.width/2, cy:r.top+sy+r.height/2 };
    }

    // catmull-rom spline through the waypoints -> one smooth cubic path
    function spline(pts){
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for(var i = 0; i < pts.length - 1; i++){
        var p0 = pts[Math.max(i-1,0)], p1 = pts[i], p2 = pts[i+1],
            p3 = pts[Math.min(i+2, pts.length-1)];
        d += 'C' + [
          p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6,
          p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6,
          p2[0], p2[1]
        ].map(function(n){ return n.toFixed(1); }).join(' ');
      }
      return d;
    }

    function build(){
      if(window.innerWidth < 900){ built = false; return; }
      var m = rect('.hg-brand img'), why = rect('.hg-why'),
          quote = rect('.script-quote'), art = rect('.art-band'),
          nl = rect('.newsletter'), fy = rect('.f-year'),
          w4 = rect('.sc-link.w4');
      var t = [];
      for(var i = 1; i <= 6; i++) t.push(rect('.sc-item.t' + i + ' .media'));
      if(!m || !why || !quote || !art || !nl || !fy || !w4 ||
         t.some(function(x){ return !x || !x.h; }) || m.h < 40) return;

      var W = document.documentElement.clientWidth;
      var P = [];
      function pt(x, y){ P.push([x, y]); }
      function loop(cx, cy, r, dir, turns){
        turns = turns || 1;
        var steps = 6 * turns;
        for(var k = 0; k <= steps; k++){
          var a = -Math.PI/2 + dir * (k/steps) * Math.PI * 2 * turns;
          pt(cx + Math.cos(a)*r + (turns > 1 ? k*1.2 : 0), cy + Math.sin(a)*r*0.8);
        }
      }

      // off the needle of the sewing machine
      pt(m.left + m.w*0.86, m.top + m.h*0.16);
      pt(m.right + 30, m.top + m.h*0.52);
      // lasso around the WHY? block
      pt(why.left - 50, why.bottom + 20);
      pt(why.left - 75, why.top - 5);
      pt(why.cx - 40, why.top - 45);
      pt(why.right + 70, why.top + why.h*0.25);
      pt(why.cx + 60, why.bottom + 55);
      pt(why.left + 30, why.bottom + 25);
      // sweep right under the © 2026, dive into the scatter
      pt(W*0.72, why.bottom + 150);
      pt(W*0.9, t[0].top - 60);
      // tuck under the first tile's right edge
      pt(t[0].right - 28, t[0].top + t[0].h*0.22);
      pt(t[0].right + 70, t[0].top + t[0].h*0.5);
      // loop in the blank between t1 and t2
      loop((t[0].right + t[1].left)/2, t[0].bottom - t[0].h*0.15, 62, 1);
      // under t2's left edge, out its bottom
      pt(t[1].left + 30, t[1].cy - 30);
      pt(t[1].cx - 30, t[1].bottom - 18);
      pt(t[1].cx - 90, t[1].bottom + 70);
      // across to t3: under its top-right corner, out the left side
      pt(t[2].right - 35, t[2].top + 22);
      pt(t[2].left + 25, t[2].cy - 20);
      pt(t[2].left - 90, t[2].cy + 50);
      // loop-de-loop in the blank before t4
      loop(W*0.30, (t[2].bottom + t[3].top)/2 + 20, 68, -1);
      // t4: in the top, out the right edge — everything after stays BELOW
      // the Philanthropy word so the thread never crosses it
      var dipY = Math.max(t[3].bottom, w4.bottom) + 60;
      pt(t[3].cx - 40, t[3].top + 20);
      pt(t[3].right - 18, Math.min(t[3].bottom - 50, Math.max(t[3].cy + 20, w4.bottom + 35)));
      pt(t[3].right + 80, Math.max(t[3].cy + 140, w4.bottom + 70));
      pt((t[3].right + t[4].left)/2, dipY);
      pt(t[4].left + 28, Math.max(t[4].bottom - t[4].h*0.25, w4.bottom + 30));
      pt(t[4].cx, t[4].bottom - 22);
      pt(t[4].cx - 20, t[4].bottom + 80);
      // loop in the blank right of t6, then in its right edge, out bottom-left
      loop(Math.min(t[5].right + 150, W - 90), t[5].top + 30, 58, 1);
      pt(t[5].right - 30, t[5].top + t[5].h*0.3);
      pt(t[5].left + 35, t[5].bottom - 20);
      pt(t[5].left - 90, t[5].bottom + 60);
      // hug the far-left margin past the quote, smile under it
      pt(W*0.12, quote.top - 20);
      pt(W*0.15, quote.bottom + 50);
      pt(quote.cx, quote.bottom + 75);
      pt(W*0.82, (quote.bottom + art.top)/2 + 20);
      pt(W - 70, art.top + art.h*0.45);
      // slide down the right edge, cut through the newsletter's column gap
      pt(W - 60, (art.bottom + nl.top)/2 + 40);
      pt(W*0.56, nl.cy);
      pt(W*0.52, nl.bottom + 50);
      // drop through the blank corridor left of the ©26, tie off in a knot
      pt(fy.left - 70, (nl.bottom + fy.top)/2 + 30);
      pt(fy.left - 85, fy.cy);
      loop(fy.cx - 40, fy.bottom + 55, 26, 1, 2);
      pt(fy.cx - 12, fy.bottom + 6);

      var d = spline(P);
      for(var j = 0; j < ropePaths.length; j++) ropePaths[j].setAttribute('d', d);
      maskPath.setAttribute('d', d);
      len = maskPath.getTotalLength();
      maskPath.setAttribute('stroke-dasharray', String(len));
      maskPath.setAttribute('stroke-dashoffset', String(len * (1 - cur)));
      var H = document.documentElement.scrollHeight;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', String(W));
      svg.setAttribute('height', String(H));
      layer.style.height = H + 'px';
      maskEl.setAttribute('x', '0'); maskEl.setAttribute('y', '0');
      maskEl.setAttribute('width', String(W)); maskEl.setAttribute('height', String(H));
      startY = m.top;
      endY = fy.bottom + 140;
      built = true;
    }

    function computeTarget(){
      if(!built || !len) return;
      var p = (window.pageYOffset + window.innerHeight*0.85 - startY) / ((endY - startY) || 1);
      targetP = Math.max(0, Math.min(1, p));
    }

    (function frame(){
      if(built && len){
        if(reduced){ cur = 1; }
        else{ computeTarget(); cur += (targetP - cur) * 0.075; }
        maskPath.setAttribute('stroke-dashoffset', String(len * (1 - cur)));
      }
      requestAnimationFrame(frame);
    })();

    function rebuild(){ build(); computeTarget(); }
    rebuild();
    window.addEventListener('load', rebuild);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
    var rT;
    window.addEventListener('resize', function(){
      clearTimeout(rT);
      rT = setTimeout(rebuild, 200);
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
