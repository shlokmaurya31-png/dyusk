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
          nl = rect('.newsletter'), fy = rect('.f-year');
      var t = [];
      for(var i = 1; i <= 6; i++) t.push(rect('.sc-item.t' + i + ' .media'));
      if(!m || !why || !quote || !art || !nl || !fy ||
         t.some(function(x){ return !x || !x.h; }) || m.h < 40) return;

      var W = document.documentElement.clientWidth;
      var P = [];
      function pt(x, y){ P.push([x, y]); }
      // a cursive rope curl: the thread comes in along its travel line,
      // climbs over the top, and crosses itself once at the base — the
      // way a loose loop of real rope sits. (cx,cy) is the visual centre,
      // r the loop radius; dir=1 for rightward travel, -1 for leftward.
      var CURL = [[-1.9,0.3],[-0.5,0.0],[0.55,-0.25],[0.95,-0.85],
                  [0.35,-1.75],[-0.75,-1.45],[-0.95,-0.55],[-0.2,0.18],
                  [0.9,0.35],[2.0,0.45]];
      function coil(cx, cy, r, dir){
        for(var k = 0; k < CURL.length; k++){
          pt(cx + dir * CURL[k][0] * r, cy + (CURL[k][1] + 0.65) * r);
        }
      }
      var A = []; // label anchors — one per page word, in markup order
      function mark(x, y){ A.push([x, y]); pt(x, y); }

      // out of the sewing machine, coiling loose across the top band
      pt(m.right - 30, m.top + m.h*0.55);
      pt(m.right + 40, m.bottom + 20);
      var heroY = (Math.max(why.bottom, m.bottom) + t[0].top)/2 + 10;
      coil(W*0.32, heroY - 15, 46, 1);
      coil(W*0.47, heroY + 15, 52, 1);
      coil(W*0.62, heroY - 10, 46, 1);
      pt(W*0.86, heroY + 30);
      // hook down under the first product's right edge
      pt(t[0].right - 25, t[0].top + t[0].h*0.35);
      pt(t[0].right + 70, t[0].top + t[0].h*0.55);
      // कहानी rides the arc across to product 2, one curl on the way
      mark((t[0].right + t[1].left)/2 + 20, t[0].top + t[0].h*0.62);
      coil(t[1].left - 45, t[1].cy - 150, 36, 1);
      pt(t[1].left + 25, t[1].cy);
      pt(t[1].cx - 40, t[1].bottom - 15);
      pt(t[1].left - 60, t[1].bottom + 80);
      // double coil on the way back to the left margin
      coil(W*0.42, (t[1].bottom + t[2].top)/2, 55, -1);
      coil(W*0.24, (t[1].bottom + t[2].top)/2 + 55, 55, -1);
      pt(W*0.07, t[2].top + 60);
      // About Us rides the descending run back in to product 3
      mark((W*0.07 + t[2].left)/2 + 30, t[2].top + 110);
      pt(t[2].left + 25, t[2].top + 155);
      pt(t[2].cx + 40, t[2].bottom - 15);
      // Artisans carries on out to a curl at the right margin
      mark((t[2].right + W*0.84)/2, t[2].bottom + 100);
      coil(W*0.88, t[2].bottom + 210, 42, 1);
      // wavy double-coil return across the page to product 4
      coil(W*0.55, (t[2].bottom + 190 + t[3].top)/2 + 20, 55, -1);
      coil(W*0.33, (t[2].bottom + 190 + t[3].top)/2 + 70, 48, -1);
      pt(t[3].cx - 30, t[3].top + 20);
      pt(t[3].right - 18, t[3].cy + 10);
      // Philanthropy rides a gentle sag across to product 5
      mark((t[3].right + t[4].left)/2, t[3].cy + 100);
      pt(t[4].left + 25, t[4].bottom - t[4].h*0.32);
      pt(t[4].cx, t[4].bottom - 20);
      // curl below product 5's caption, sweep under product 4's caption
      coil(t[4].left + 40, t[4].bottom + 115, 42, -1);
      pt(W*0.45, t[3].bottom + 130);
      // double curl trailing off to the left margin
      coil(W*0.155, t[5].top - 25, 38, -1);
      coil(W*0.075, t[5].top + 25, 32, -1);
      // Contact Us rides the run in to product 6
      mark((W*0.075 + t[5].left)/2 + 20, t[5].top + 55);
      pt(t[5].left + 25, t[5].top + t[5].h*0.45);
      pt(t[5].cx + 30, t[5].bottom - 15);
      pt(t[5].right + 60, t[5].bottom + 50);
      // curl in the open right half, then down the margin to the quote
      coil(W*0.78, (t[5].bottom + quote.top)/2, 55, 1);
      pt(W*0.88, quote.top + 10);
      pt(W*0.85, quote.bottom + 30);
      pt(quote.cx, quote.bottom + 75);
      // curl low on the left before slipping behind the art band
      coil(W*0.18, (quote.bottom + art.top)/2 + 30, 48, -1);
      pt(W*0.5, art.top + art.h*0.55);
      pt(W - 70, (art.bottom + nl.top)/2 + 20);
      // cut through the newsletter's column gap
      pt(W*0.56, nl.cy);
      pt(W*0.52, nl.bottom + 40);
      // one last curl above the footer rule, then down the free right
      // margin past the ©26 and hook in to end beneath it
      coil(W - 130, (nl.bottom + fy.top)/2 - 10, 38, 1);
      pt(W - 45, fy.top + 80);
      pt(W - 52, fy.cy + 40);
      pt(fy.cx + 70, fy.bottom + 55);
      pt(fy.cx - 8, fy.bottom + 16);

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
      var lbl = document.getElementById('threadLabels');
      var lblPath = document.getElementById('labelPath');
      if(lbl && lblPath){
        lblPath.setAttribute('d', d);
        lbl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        lbl.setAttribute('width', String(W));
        lbl.setAttribute('height', String(H));
        lbl.style.height = H + 'px';
      }
      maskEl.setAttribute('x', '0'); maskEl.setAttribute('y', '0');
      maskEl.setAttribute('width', String(W)); maskEl.setAttribute('height', String(H));
      // arc-length -> page-XY lookup: lets the drawn tip track the middle
      // of the viewport, and pins each page word to its spot on the thread
      var N = Math.min(400, Math.max(150, Math.round(len/50)));
      sampleY = new Array(N + 1);
      var sampleX = new Array(N + 1);
      sampleMaxY = 0;
      for(var k = 0; k <= N; k++){
        var sp = maskPath.getPointAtLength(len * k / N);
        sampleX[k] = sp.x; sampleY[k] = sp.y;
        if(sampleY[k] > sampleMaxY) sampleMaxY = sampleY[k];
      }
      if(lbl){
        var tps = lbl.querySelectorAll('textPath');
        var texts = lbl.querySelectorAll('text');
        var SIZES = [84, 40, 58, 72, 46];
        var fscale = Math.max(0.7, W/1600);
        for(var q = 0; q < tps.length && q < A.length; q++){
          var best = 0, bd = Infinity;
          for(var k2 = 0; k2 <= N; k2++){
            var dx = sampleX[k2] - A[q][0], dy2 = sampleY[k2] - A[q][1];
            var dd = dx*dx + dy2*dy2;
            if(dd < bd){ bd = dd; best = k2; }
          }
          tps[q].setAttribute('startOffset', (best / N * 100).toFixed(2) + '%');
          texts[q].setAttribute('font-size', String(Math.round(SIZES[q] * fscale)));
        }
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
