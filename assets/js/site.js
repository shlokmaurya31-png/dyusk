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
  applyTheme(saved || 'dark');
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
    var autoEl = document.getElementById('threadAuto');
    var autoImg = autoEl ? autoEl.querySelector('img') : null;
    var autoLabel = autoEl ? autoEl.querySelector('.ta-label') : null;
    var WORDSTOPS = [];   // {p, name} — where each page-word sits along the track

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
      // loops/knots removed — the thread now just flows through the layout
      // as one smooth curve. coil() drops a single gentle waypoint at its
      // centre so the route still weaves, without the rope curls.
      function coil(cx, cy, r, dir){ pt(cx, cy + r * 0.65); }
      var A = []; // label anchors — one per page word, in markup order
      function mark(x, y){ A.push([x, y]); pt(x, y); }

      if(W < 900){
        // ---- phone: weave down the stacked tiles, dodging the HTML
        // words (which stay visible and tappable on small screens) ----
        var wd = [];
        for(var iw = 1; iw <= 5; iw++) wd.push(rect('.sc-link.w' + iw));
        if(wd.some(function(x){ return !x || !x.h; })) return;

        // start under the top product, out of its right edge
        pt(t[0].cx, t[0].cy);
        pt(t[0].right - 15, t[0].top + t[0].h*0.55);
        pt(Math.min((t[0].right + W)/2, W - 20), t[0].top + t[0].h*0.85);
        // slip past कहानी on its free side, curl, tuck under product 2
        pt(wd[0].left - 22, wd[0].cy);
        coil(W*0.30, (wd[0].bottom + t[1].top)/2 + 6, 20, -1);
        pt(t[1].left + 16, t[1].top + t[1].h*0.35);
        pt(t[1].cx - 15, t[1].bottom - 12);
        // past About Us, curl, under product 3
        pt(wd[1].right + 22, wd[1].cy);
        coil(W*0.66, (wd[1].bottom + t[2].top)/2 + 6, 20, 1);
        pt(t[2].right - 16, t[2].top + t[2].h*0.35);
        pt(t[2].cx + 15, t[2].bottom - 12);
        // past Artisans, curl, under product 4
        pt(wd[2].left - 22, wd[2].cy);
        coil(W*0.30, (wd[2].bottom + t[3].top)/2 + 6, 20, -1);
        pt(t[3].left + 16, t[3].top + t[3].h*0.35);
        pt(t[3].cx - 15, t[3].bottom - 12);
        // past Philanthropy, curl, under product 5
        pt(wd[3].right + 20, wd[3].cy);
        coil(W*0.68, (wd[3].bottom + t[4].top)/2 + 6, 20, 1);
        pt(t[4].right - 16, t[4].top + t[4].h*0.35);
        pt(t[4].cx + 15, t[4].bottom - 12);
        // past Contact Us, curl, under product 6
        pt(Math.max(wd[4].left - 22, 20), wd[4].cy);
        coil(W*0.5, (wd[4].bottom + t[5].top)/2 + 6, 20, 1);
        pt(t[5].left + 16, t[5].top + t[5].h*0.35);
        pt(t[5].cx, t[5].bottom - 12);
        // hug the left margin past the quote, smile under it
        pt(W*0.10, (t[5].bottom + quote.top)/2 + 20);
        pt(W*0.06, quote.cy);
        pt(quote.cx, quote.bottom + 35);
        pt(W - 9, (quote.bottom + art.top)/2 + 10);
        pt(W - 9, art.cy);
        // straight down the right margin past trust, newsletter and the
        // footer statement (on phones the ©26 sits below the statement)
        pt(W - 9, (art.bottom + nl.top)/2);
        pt(W - 9, nl.bottom - 60);
        pt(W - 9, fy.top - 30);
        // the ©26 block stretches full width on phones — measure the
        // actual glyphs off the font height, curl beside them, end beneath
        var gw = fy.h * 1.8, gcx = fy.left + gw/2;
        coil(Math.min(fy.left + gw + 130, W*0.66), fy.cy - 10, 18, -1);
        pt(fy.left + gw + 35, fy.bottom - 12);
        pt(gcx + 10, fy.bottom + 20);
      } else {

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
      }

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
        var hText = lbl.querySelectorAll('text.tlabel');
        var cText = lbl.querySelectorAll('text.tcap');
        var SIZES = [84, 40, 58, 72, 46];
        var fscale = Math.max(0.7, W/1600);
        var capSize = Math.max(12, Math.round(19 * fscale));
        WORDSTOPS = [];
        for(var q = 0; q < hText.length && q < A.length; q++){
          var best = 0, bd = Infinity;
          for(var k2 = 0; k2 <= N; k2++){
            var dx = sampleX[k2] - A[q][0], dy2 = sampleY[k2] - A[q][1];
            var dd = dx*dx + dy2*dy2;
            if(dd < bd){ bd = dd; best = k2; }
          }
          WORDSTOPS.push({ p: best / N, name: (hText[q].textContent || '').trim() });
          var off = (best / N * 100).toFixed(2) + '%';
          var htp = hText[q].querySelector('textPath');
          if(htp) htp.setAttribute('startOffset', off);
          hText[q].setAttribute('font-size', String(Math.round(SIZES[q] * fscale)));
          if(cText[q]){
            var ctp = cText[q].querySelector('textPath');
            // caption rides the same thread at the same offset, pushed just
            // below the line via dy (perpendicular to the path) so it reads
            // like a newspaper deck tucked under the word
            if(ctp) ctp.setAttribute('startOffset', off);
            cText[q].setAttribute('font-size', String(capSize));
            cText[q].setAttribute('dy', String(capSize + 16));
          }
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
        // the needle sits at the drawing tip, so the thread spools out behind it
        if(autoEl){
          var al = len * cur;
          var ap0 = maskPath.getPointAtLength(al);
          var ap1 = maskPath.getPointAtLength(Math.min(len, al + 8));
          autoEl.style.transform = 'translate(' + ap0.x.toFixed(1) + 'px,' + ap0.y.toFixed(1) +
            'px) translate(-50%,-55%)';
          // face the way it's driving; flip only the art so the label stays legible
          if(autoImg) autoImg.style.transform = 'scaleX(' + ((ap1.x - ap0.x) < 0 ? -1 : 1) + ')';
          if(!autoEl.classList.contains('on')) autoEl.classList.add('on');
          if(autoLabel && WORDSTOPS.length){
            var nm = WORDSTOPS[0].name;
            for(var ws = 0; ws < WORDSTOPS.length; ws++){ if(WORDSTOPS[ws].p <= cur + 0.015) nm = WORDSTOPS[ws].name; }
            if(autoLabel.textContent !== nm) autoLabel.textContent = nm;
          }
        }
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

  // milestones reel — a pinned 3D cylinder that turns as you scroll the
  // section past. Each milestone sits on the wall of the cylinder; the one
  // facing front is the "active" year. Reduced-motion falls back to a list.
  (function(){
    var sec = document.getElementById('miles');
    if(!sec) return;
    var reel = sec.querySelector('.miles-reel');
    var items = Array.prototype.slice.call(sec.querySelectorAll('.mile'));
    if(!reel || !items.length) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      sec.classList.add('flat'); return;
    }
    var STEP = 20;              // degrees between milestones on the wheel
    var R = 300;                // cylinder radius (matches .miles-list translateZ)
    var N = items.length;
    var ready = false, ticking = false;

    function render(){
      ticking = false;
      var rect = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      var span = rect.height - vh;
      var p = span > 0 ? (-rect.top) / span : 0;
      if(p < 0) p = 0; else if(p > 1) p = 1;
      var rot = -p * (N - 1) * STEP;          // active item's net angle -> 0
      for(var i = 0; i < N; i++){
        var deg = i * STEP + rot;
        var rad = deg * Math.PI / 180;
        var y = R * Math.sin(rad);
        var z = R * Math.cos(rad);
        var el = items[i];
        el.style.transform = 'translate(-50%,-50%) translate3d(0,' +
          y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateX(' + (-deg).toFixed(1) + 'deg)';
        var ad = Math.abs(deg);
        el.style.opacity = Math.max(0, 1 - ad / 74).toFixed(3);
        el.style.zIndex = String(Math.round(1000 - ad));
        var on = ad < STEP / 2;
        if(on !== el.classList.contains('on')) el.classList.toggle('on', on);
      }
      if(!ready){ ready = true; sec.classList.add('ready'); }
    }
    function onScroll(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    }
    render();
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
  })();

  // header hides on scroll down, returns on scroll up
  var header = document.getElementById('siteHeader');
  if(header){
    var lastY = 0;
    window.addEventListener('scroll', function(){
      var y = window.scrollY;
      // never hide the header while the mobile menu is open (its X lives there)
      if(document.body.classList.contains('menu-open')){ header.style.transform=''; lastY=y; return; }
      header.style.transform = (y > 160 && y > lastY) ? 'translateY(-110%)' : '';
      lastY = y;
    }, {passive:true});
  }

  // mobile menu open/close
  (function(){
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobileMenu');
    if(!toggle || !menu) return;
    function setOpen(open){
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    toggle.addEventListener('click', function(){
      setOpen(!document.body.classList.contains('menu-open'));
    });
    // any tap inside the menu (link or bag) closes the overlay
    menu.querySelectorAll('a,.mm-bag').forEach(function(el){
      el.addEventListener('click', function(){ setOpen(false); });
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') setOpen(false);
    });
    // close if we grow past the desktop breakpoint mid-open
    window.addEventListener('resize', function(){
      if(window.innerWidth >= 1000) setOpen(false);
    });
  })();

  // mark the current page's links active in both navs
  (function(){
    var here = (location.pathname.split('/').pop() || '').toLowerCase() || 'index.html';
    document.querySelectorAll('#siteHeader .nav-links a, #mobileMenu a').forEach(function(a){
      if((a.getAttribute('href') || '').toLowerCase() === here) a.classList.add('on');
    });
  })();
})();
