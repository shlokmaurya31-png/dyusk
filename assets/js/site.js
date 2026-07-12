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

  // the left border rail needs the content gutter pushed clear of it
  if(document.getElementById('sideBorder')) document.body.classList.add('has-rail');

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
    var len = 0, built = false;
    var sampleY = null, sampleMaxY = 0;
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

      // one continuous serpentine: uniform, generous curves, no
      // self-crossings — always descending so the tip can track scroll
      // out of the actual needle tip of the sewing machine
      pt(m.left + m.w*0.81, m.top + m.h*0.74);
      pt(m.right + 60, m.bottom + 40);
      // wide sweep right through the blank band under the WHY? text,
      // then back down under the first tile's top edge — never crossing itself
      pt(why.cx + 80, Math.max(why.bottom + 90, m.bottom + 80));
      pt(W*0.62, (Math.max(why.bottom + 120, m.bottom + 130) + t[0].top)/2);
      pt(t[0].cx + 60, t[0].top + 25);
      pt(t[0].right - 25, t[0].top + t[0].h*0.4);
      pt(t[0].right + 70, t[0].top + t[0].h*0.62);
      // gentle wave through the blank middle, under t2's left edge
      pt((t[0].right + t[1].left)/2, t[0].bottom - 40);
      pt(t[1].left + 30, t[1].cy);
      pt(t[1].cx, t[1].bottom - 20);
      pt(t[1].cx - 70, t[1].bottom + 90);
      // across to t3: under its top-right corner, out the left side
      pt(t[2].right - 35, t[2].top + 25);
      pt(t[2].left + 25, t[2].cy);
      pt(t[2].left - 80, t[2].cy + 70);
      // wide sweep to the left margin, then into t4
      pt(W*0.15, (t[2].bottom + t[3].top)/2 + 30);
      // t4: in the top, out the right edge — everything after stays BELOW
      // the Philanthropy word so the thread never crosses it
      var dipY = Math.max(t[3].bottom, w4.bottom) + 60;
      pt(t[3].cx - 40, t[3].top + 25);
      pt(t[3].right - 18, Math.min(t[3].bottom - 50, Math.max(t[3].cy + 20, w4.bottom + 35)));
      pt(t[3].right + 80, Math.max(t[3].cy + 140, w4.bottom + 70));
      pt((t[3].right + t[4].left)/2, dipY);
      pt(t[4].left + 28, Math.max(t[4].bottom - t[4].h*0.25, w4.bottom + 30));
      pt(t[4].cx, t[4].bottom - 22);
      pt(t[4].cx - 30, t[4].bottom + 90);
      // wide swing out to the right margin, then under t6's right edge
      pt(Math.min(t[5].right + 140, W - 80),
         (t[4].bottom + 90 + t[5].top + t[5].h*0.3)/2);
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
      // drop through the blank corridor left of the ©26 and end beneath it
      pt(fy.left - 70, (nl.bottom + fy.top)/2 + 30);
      pt(fy.left - 85, fy.cy);
      pt(fy.cx - 60, fy.bottom + 45);
      pt(fy.cx - 8, fy.bottom + 14);

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
      var sb = document.getElementById('sideBorder');
      if(sb) sb.style.height = H + 'px';
      maskEl.setAttribute('x', '0'); maskEl.setAttribute('y', '0');
      maskEl.setAttribute('width', String(W)); maskEl.setAttribute('height', String(H));
      // arc-length -> page-Y lookup, so the drawn tip can track the
      // middle of the viewport no matter how much the path meanders
      var N = Math.min(400, Math.max(150, Math.round(len/50)));
      sampleY = new Array(N + 1);
      sampleMaxY = 0;
      for(var k = 0; k <= N; k++){
        sampleY[k] = maskPath.getPointAtLength(len * k / N).y;
        if(sampleY[k] > sampleMaxY) sampleMaxY = sampleY[k];
      }
      built = true;
    }

    function computeTarget(){
      if(!built || !len || !sampleY) return;
      var tipY = window.pageYOffset + window.innerHeight * 0.5;
      if(tipY <= sampleY[0]){ targetP = 0; return; }
      if(tipY >= sampleMaxY - 4){ targetP = 1; return; }
      var k = 0;
      while(k < sampleY.length - 1 && sampleY[k] < tipY) k++;
      targetP = k / (sampleY.length - 1);
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
