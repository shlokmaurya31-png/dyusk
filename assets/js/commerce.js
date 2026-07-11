/* DYUSK commerce layer — cart, drawer, shop filters, PDP controls, size guide.
   Runs on every page; each block feature-detects its own markup.
   Cart persists in localStorage; images resolve via window.DYUSK_IMG (Odoo)
   or fall back to local asset paths (static site). */
(function(){
  'use strict';

  var PRODUCTS = {
    full: { name:'Full Sleeve Compression', price:2499 },
    half: { name:'Half Sleeve Compression', price:2199 }
  };
  var COLORS = { black:'Onyx', steel:'Steel', white:'Arctic' };
  var SIZES  = ['S','M','L','XL','XXL'];
  var FREE_SHIP = 2999;
  var KEY = 'dyusk-cart';

  function imgFor(sleeve, view, color){
    var k = sleeve + '-' + view + '-' + color;
    var map = window.DYUSK_IMG || {};
    return map[k] || ('assets/products/' + k + '.png');
  }
  function inr(n){ return '₹' + Number(n).toLocaleString('en-IN'); }
  function lineKey(i){ return i.sleeve + '|' + i.color + '|' + i.size; }

  /* ---- state ---- */
  function load(){
    try{ var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; }
    catch(e){ return []; }
  }
  function save(c){ try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){} }
  var cart = load();

  function count(){ return cart.reduce(function(s,i){ return s + i.qty; }, 0); }
  function subtotal(){ return cart.reduce(function(s,i){ return s + i.qty * (PRODUCTS[i.sleeve] ? PRODUCTS[i.sleeve].price : 0); }, 0); }

  function addItem(sleeve, color, size, qty){
    qty = qty || 1;
    var found = null;
    for(var j=0;j<cart.length;j++){ if(lineKey(cart[j]) === sleeve+'|'+color+'|'+size){ found = cart[j]; break; } }
    if(found){ found.qty += qty; }
    else{ cart.push({ sleeve:sleeve, color:color, size:size, qty:qty }); }
    save(cart); syncBadge(true); renderCart();
  }
  function setQty(k, delta){
    for(var j=0;j<cart.length;j++){
      if(lineKey(cart[j]) === k){
        cart[j].qty += delta;
        if(cart[j].qty <= 0){ cart.splice(j,1); }
        break;
      }
    }
    save(cart); syncBadge(false); renderCart();
  }
  function removeItem(k){
    cart = cart.filter(function(i){ return lineKey(i) !== k; });
    save(cart); syncBadge(false); renderCart();
  }

  /* ---- header badge ---- */
  function syncBadge(bump){
    var badges = document.querySelectorAll('.cart-count');
    var n = count();
    badges.forEach(function(b){
      b.textContent = n;
      b.classList.toggle('on', n > 0);
    });
    if(bump){
      document.querySelectorAll('.cart-btn').forEach(function(btn){
        btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
      });
    }
  }

  /* ---- toast ---- */
  var toastEl, toastT;
  function toast(msg){
    if(!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'dtoast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 2200);
  }

  /* ---- cart drawer ---- */
  var scrim = document.getElementById('cartScrim');
  var drawer = document.getElementById('cartDrawer');

  function openCart(){ if(!drawer) return; scrim.classList.add('open'); drawer.classList.add('open'); document.body.classList.add('no-scroll'); }
  function closeCart(){ if(!drawer) return; scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.classList.remove('no-scroll'); }

  function renderCart(){
    var list = document.getElementById('cartItems');
    if(!list) return;
    if(!cart.length){
      list.innerHTML =
        '<div class="cart-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>' +
        '<p>Your bag is empty</p>' +
        '<a href="shop.html" class="btn solid" data-cart-shop>Shop the drop</a>' +
        '</div>';
    } else {
      var html = '';
      cart.forEach(function(i){
        var p = PRODUCTS[i.sleeve]; if(!p) return;
        var k = lineKey(i);
        html +=
          '<div class="cart-line" data-k="' + k + '">' +
            '<div class="cart-line-img"><img src="' + imgFor(i.sleeve,'front',i.color) + '" alt="' + p.name + '"></div>' +
            '<div class="cart-line-info">' +
              '<h4>' + p.name + '</h4>' +
              '<div class="cart-line-meta">' + (COLORS[i.color]||i.color) + ' / Size ' + i.size + '</div>' +
              '<button class="cart-line-remove" data-remove="' + k + '">Remove</button>' +
              '<div class="cart-line-foot">' +
                '<div class="cart-qty">' +
                  '<button data-dec="' + k + '" aria-label="Decrease quantity">−</button>' +
                  '<span>' + i.qty + '</span>' +
                  '<button data-inc="' + k + '" aria-label="Increase quantity">+</button>' +
                '</div>' +
                '<div class="cart-line-price">' + inr(i.qty * p.price) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      });
      list.innerHTML = html;
    }

    // ship progress
    var sub = subtotal();
    var ship = document.getElementById('shipBar');
    if(ship){
      var track = ship.querySelector('i');
      var msg = ship.querySelector('p');
      if(sub >= FREE_SHIP){
        if(msg) msg.innerHTML = '<b>Unlocked ✓</b> Free shipping applied';
        if(track) track.style.width = '100%';
      } else {
        var left = FREE_SHIP - sub;
        if(msg) msg.innerHTML = 'Add <b>' + inr(left) + '</b> for free shipping';
        if(track) track.style.width = (sub / FREE_SHIP * 100) + '%';
      }
    }
    var subEl = document.getElementById('cartSub');
    if(subEl) subEl.textContent = inr(sub);
    var footEl = document.getElementById('cartFoot');
    if(footEl) footEl.style.display = cart.length ? 'block' : 'none';
  }

  if(scrim) scrim.addEventListener('click', closeCart);
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t.closest('.cart-btn')){ e.preventDefault(); openCart(); return; }
    if(t.closest('.cart-close')){ closeCart(); return; }
    if(t.closest('[data-cart-shop]')){ closeCart(); return; }
    var inc = t.closest('[data-inc]'); if(inc){ setQty(inc.getAttribute('data-inc'), 1); return; }
    var dec = t.closest('[data-dec]'); if(dec){ setQty(dec.getAttribute('data-dec'), -1); return; }
    var rm = t.closest('[data-remove]'); if(rm){ removeItem(rm.getAttribute('data-remove')); return; }
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ closeCart(); closeGuide(); } });

  /* ---- announcement bar rotation + chrome-min on scroll ---- */
  (function(){
    var track = document.getElementById('announceTrack');
    if(track){
      var msgs = track.querySelectorAll('.announce-msg');
      if(msgs.length > 1){
        var idx = 0;
        msgs.forEach(function(m,n){ m.style.display = n === 0 ? '' : 'none'; });
        setInterval(function(){
          msgs[idx].style.display = 'none';
          idx = (idx + 1) % msgs.length;
          msgs[idx].style.display = '';
        }, 3800);
      }
    }
    if(document.querySelector('.announce')){
      window.addEventListener('scroll', function(){
        document.body.classList.toggle('chrome-min', window.scrollY > 40);
      }, {passive:true});
    }
  })();

  /* ---- size guide modal ---- */
  var guide = document.getElementById('sizeGuide');
  function openGuide(){ if(guide){ guide.classList.add('open'); document.body.classList.add('no-scroll'); } }
  function closeGuide(){ if(guide){ guide.classList.remove('open'); if(!drawer || !drawer.classList.contains('open')) document.body.classList.remove('no-scroll'); } }
  document.addEventListener('click', function(e){
    if(e.target.closest('[data-size-guide]')){ e.preventDefault(); openGuide(); }
    if(e.target.closest('[data-guide-close]') || e.target === guide){ closeGuide(); }
  });

  /* ---- PDP controls (product detail page) ---- */
  (function(){
    var pdp = document.querySelector('[data-pdp]');
    if(!pdp) return;
    var sleeve = pdp.getAttribute('data-pdp'); // 'full' | 'half'
    var state = { color: 'black', size: null, view: 'front', qty: 1 };

    var params = new URLSearchParams(location.search);
    var pc = params.get('color');
    if(pc && COLORS[pc]) state.color = pc;

    var stageFront = pdp.querySelector('.pd-stage .stage-front');
    var stageBack  = pdp.querySelector('.pd-stage .stage-back');
    var thumbs = pdp.querySelectorAll('.pd-thumb');
    var colorBtns = pdp.querySelectorAll('.pd-color');
    var colorName = pdp.querySelector('[data-color-name]');
    var sizeWrap = pdp.querySelector('.pd-sizes');
    var qtyVal = pdp.querySelector('[data-qty-val]');
    var addBtn = pdp.querySelector('.add-to-cart');
    var hint = pdp.querySelector('.add-hint');

    function paintImages(){
      if(stageFront) stageFront.src = imgFor(sleeve,'front',state.color);
      if(stageBack)  stageBack.src  = imgFor(sleeve,'back',state.color);
      thumbs.forEach(function(tb){
        var v = tb.getAttribute('data-view');
        var im = tb.querySelector('img');
        if(im) im.src = imgFor(sleeve, v, state.color);
      });
      showView(state.view);
    }
    function showView(v){
      state.view = v;
      if(stageFront) stageFront.classList.toggle('on', v === 'front');
      if(stageBack)  stageBack.classList.toggle('on', v === 'back');
      thumbs.forEach(function(tb){ tb.classList.toggle('active', tb.getAttribute('data-view') === v); });
    }

    // build size buttons
    if(sizeWrap){
      sizeWrap.innerHTML = SIZES.map(function(s){
        return '<button type="button" class="size-btn" data-size="' + s + '">' + s + '</button>';
      }).join('');
      sizeWrap.addEventListener('click', function(e){
        var b = e.target.closest('.size-btn'); if(!b || b.classList.contains('oos')) return;
        state.size = b.getAttribute('data-size');
        sizeWrap.querySelectorAll('.size-btn').forEach(function(x){ x.classList.remove('active'); });
        b.classList.add('active');
        if(hint) hint.textContent = '';
      });
    }

    colorBtns.forEach(function(cb){
      cb.classList.toggle('active', cb.getAttribute('data-color') === state.color);
      cb.addEventListener('click', function(){
        state.color = cb.getAttribute('data-color');
        colorBtns.forEach(function(x){ x.classList.remove('active'); });
        cb.classList.add('active');
        if(colorName) colorName.textContent = COLORS[state.color];
        paintImages();
      });
    });

    thumbs.forEach(function(tb){ tb.addEventListener('click', function(){ showView(tb.getAttribute('data-view')); }); });

    if(qtyVal){
      pdp.querySelector('[data-qty-dec]').addEventListener('click', function(){ state.qty = Math.max(1, state.qty - 1); qtyVal.textContent = state.qty; });
      pdp.querySelector('[data-qty-inc]').addEventListener('click', function(){ state.qty = Math.min(10, state.qty + 1); qtyVal.textContent = state.qty; });
    }

    function doAdd(){
      if(!state.size){
        if(hint) hint.textContent = 'Select a size first';
        var sw = pdp.querySelector('.pd-sizes');
        if(sw) sw.scrollIntoView({behavior:'smooth', block:'center'});
        return;
      }
      addItem(sleeve, state.color, state.size, state.qty);
      toast('Added to bag');
      openCart();
    }
    if(addBtn) addBtn.addEventListener('click', doAdd);

    // mobile sticky buy bar — shows once the main Add button scrolls away
    var sticky = document.querySelector('.pd-sticky');
    var actions = pdp.querySelector('.pd-actions');
    if(sticky && actions && 'IntersectionObserver' in window){
      var sObs = new IntersectionObserver(function(es){
        es.forEach(function(en){ sticky.classList.toggle('show', !en.isIntersecting); });
      }, {threshold:0, rootMargin:'-40px 0px 0px 0px'});
      sObs.observe(actions);
      var sAdd = sticky.querySelector('.sticky-add');
      if(sAdd) sAdd.addEventListener('click', doAdd);
    }

    if(colorName) colorName.textContent = COLORS[state.color];
    colorBtns.forEach(function(x){ x.classList.toggle('active', x.getAttribute('data-color') === state.color); });
    paintImages();
  })();

  /* ---- shop page: filters, sort, quick-add ---- */
  (function(){
    var grid = document.getElementById('shopGrid');
    if(!grid) return;
    var tiles = Array.prototype.slice.call(grid.querySelectorAll('.shop-tile'));
    var filters = { fit:'all', color:'all' };

    function apply(){
      var shown = 0;
      tiles.forEach(function(t){
        var okFit = filters.fit === 'all' || t.getAttribute('data-fit') === filters.fit;
        var okCol = filters.color === 'all' || t.getAttribute('data-color') === filters.color;
        var vis = okFit && okCol;
        t.classList.toggle('hide', !vis);
        if(vis) shown++;
      });
      var c = document.getElementById('shopCount');
      if(c) c.textContent = shown + (shown === 1 ? ' style' : ' styles');
    }

    document.querySelectorAll('.filter-chip').forEach(function(chip){
      chip.addEventListener('click', function(){
        var dim = chip.getAttribute('data-filter');
        var val = chip.getAttribute('data-value');
        filters[dim] = val;
        chip.parentNode.querySelectorAll('.filter-chip').forEach(function(x){ x.classList.remove('active'); });
        chip.classList.add('active');
        apply();
      });
    });

    var sortSel = document.getElementById('shopSort');
    if(sortSel){
      sortSel.addEventListener('change', function(){
        var v = sortSel.value;
        var arr = tiles.slice();
        if(v === 'price-asc' || v === 'price-desc'){
          arr.sort(function(a,b){
            var pa = +a.getAttribute('data-price'), pb = +b.getAttribute('data-price');
            return v === 'price-asc' ? pa - pb : pb - pa;
          });
        } else {
          arr.sort(function(a,b){ return (+a.getAttribute('data-order')) - (+b.getAttribute('data-order')); });
        }
        arr.forEach(function(t){ grid.appendChild(t); });
      });
    }

    apply();
  })();

  /* ---- quick-add for any .shop-tile (shop grid + cross-sell rows) ---- */
  document.addEventListener('click', function(e){
    var qa = e.target.closest('.st-quick-add');
    if(qa){
      e.preventDefault();
      var quick = qa.closest('.st-quick');
      quick.innerHTML = SIZES.map(function(s){
        return '<button type="button" class="st-size" data-qsize="' + s + '">' + s + '</button>';
      }).join('');
      return;
    }
    var sz = e.target.closest('.st-size');
    if(sz){
      e.preventDefault();
      var tile = sz.closest('.shop-tile'); if(!tile) return;
      addItem(tile.getAttribute('data-sleeve'), tile.getAttribute('data-color'), sz.getAttribute('data-qsize'), 1);
      toast('Added — ' + (COLORS[tile.getAttribute('data-color')] || ''));
      openCart();
      var quick2 = sz.closest('.st-quick');
      quick2.innerHTML = '<button type="button" class="st-quick-add">Quick Add +</button>';
    }
  });

  /* ---- newsletter / drop signup (client-side confirm) ---- */
  document.querySelectorAll('.nl-form').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var wrap = f.parentNode;
      f.style.display = 'none';
      var ok = document.createElement('p');
      ok.className = 'nl-ok';
      ok.textContent = "You're on the list — first access to the next drop is yours.";
      wrap.appendChild(ok);
    });
  });

  /* ---- init ---- */
  syncBadge(false);
  renderCart();
})();
