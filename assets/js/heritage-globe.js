// Interactive globe on the Artisans page: every world-heritage craft
// tradition is a marker. Click a marker's label to jump straight to its
// entry in the region list below. Built on cobe v2 (verified against its
// real source — https://github.com/shuding/cobe — since this project has
// burned time before on mismatched/hallucinated cobe docs): the library
// exposes globe.update({phi, ...}) which you drive yourself in your own
// rAF loop, and a built-in anchor system (CSS anchor positioning) for
// pinning real HTML elements to a marker's live projected screen position.

const LOCATIONS = [
  { id: "madhubani-painting", name: "Madhubani Painting", location: [26.35, 86.07] },
  { id: "warli-painting", name: "Warli Painting", location: [19.70, 73.10] },
  { id: "pattachitra", name: "Pattachitra", location: [19.80, 85.83] },
  { id: "ukiyo-e", name: "Ukiyo-e", location: [35.68, 139.69] },
  { id: "sumi-e", name: "Sumi-e", location: [35.01, 135.77] },
  { id: "chinese-ink-wash", name: "Chinese Ink Wash Painting", location: [39.90, 116.41] },
  { id: "iznik-ceramics", name: "Iznik Ceramics", location: [40.43, 29.72] },
  { id: "ndebele-painting", name: "Ndebele House Painting", location: [-25.47, 29.98] },
  { id: "kente-weaving", name: "Kente Weaving", location: [6.69, -1.62] },
  { id: "yoruba-beadwork", name: "Yoruba Beadwork", location: [7.48, 4.56] },
  { id: "tuareg-silverwork", name: "Tuareg Silverwork", location: [16.97, 7.99] },
  { id: "rosemaling", name: "Rosemaling", location: [59.40, 8.30] },
  { id: "khokhloma", name: "Khokhloma", location: [56.65, 43.46] },
  { id: "celtic-knotwork", name: "Celtic Knotwork", location: [53.35, -6.26] },
  { id: "byzantine-mosaics", name: "Byzantine Mosaics", location: [44.42, 12.20] },
  { id: "alebrijes", name: "Alebrijes", location: [17.06, -96.73] },
  { id: "huichol-yarn-art", name: "Huichol Yarn Art", location: [22.15, -104.68] },
  { id: "navajo-weaving", name: "Navajo Weaving", location: [36.14, -109.82] },
  { id: "mola", name: "Mola", location: [9.55, -78.95] },
  { id: "aboriginal-dot-painting", name: "Aboriginal Dot Painting", location: [-23.70, 133.88] },
  { id: "maori-carving", name: "Māori Carving", location: [-38.14, 176.25] },
  { id: "tapa-cloth", name: "Tapa Cloth", location: [-18.14, 178.44] },
  { id: "islamic-geometric-art", name: "Islamic Geometric Art", location: [30.04, 31.24] },
  { id: "persian-miniature", name: "Persian Miniature", location: [32.65, 51.67] },
  { id: "zellige", name: "Zellige", location: [34.03, -5.00] },
];

(async function initHeritageGlobe(){
  const canvas = document.getElementById("heritageGlobe");
  if(!canvas) return;

  let createGlobe;
  try{
    const mod = await import("https://esm.sh/cobe@2.0.1");
    createGlobe = mod.default;
  }catch(err){
    console.error("[heritage-globe] failed to load cobe from CDN:", err);
    return;
  }

  const box = canvas.parentElement; // .hg-globe
  let width = 0;
  let globe = null;
  let phi = 0;
  const theta = 0.3;
  const pointerInteracting = { current: null };
  const pointerOffset = { current: 0 };
  let paused = false;
  let animationId = null;

  function jumpTo(id){
    const li = document.getElementById("loc-" + id);
    if(!li) return;
    li.scrollIntoView({ behavior: "smooth", block: "center" });
    const btn = li.querySelector(".hg-pin-btn");
    if(btn && btn.getAttribute("aria-expanded") !== "true") btn.click();
  }

  function buildLabels(wrapper){
    LOCATIONS.forEach(function(loc){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hg-marker-label";
      b.innerHTML = '<span class="hg-marker-icon">⊙</span><span class="hg-marker-name">' + loc.name + "</span>";
      b.style.positionAnchor = "--cobe-" + loc.id;
      b.style.left = "anchor(center)";
      b.style.top = "anchor(center)";
      b.style.opacity = "var(--cobe-visible-" + loc.id + ", 0)";
      b.addEventListener("click", function(){ jumpTo(loc.id); });
      wrapper.appendChild(b);
    });
  }

  function onPointerDown(e){
    pointerInteracting.current = e.clientX - pointerOffset.current * 200;
    canvas.style.cursor = "grabbing";
    paused = true;
  }
  function onPointerUp(){
    pointerInteracting.current = null;
    canvas.style.cursor = "grab";
    paused = false;
  }
  function onPointerMove(e){
    if(pointerInteracting.current !== null){
      pointerOffset.current = (e.clientX - pointerInteracting.current) / 200;
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  function frame(){
    if(globe){
      if(!paused) phi += 0.0022;
      globe.update({ phi: phi + pointerOffset.current, theta });
    }
    animationId = requestAnimationFrame(frame);
  }

  function start(){
    width = Math.round(box.offsetWidth);
    if(width === 0) return;
    canvas.style.width = width + "px";
    canvas.style.height = width + "px";

    globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width, height: width,
      phi: 0, theta,
      dark: 0.7, diffuse: 1.2,
      mapSamples: 18000, mapBrightness: 9,
      baseColor: [0.83, 0.68, 0.22],   // gold dots
      markerColor: [0.95, 0.93, 0.87], // cream pins
      glowColor: [0.55, 0.42, 0.15],
      markers: LOCATIONS.map(function(l){
        return { id: l.id, location: l.location, size: 0.045 };
      }),
    });

    // cobe moves the canvas into its own internal positioning wrapper —
    // that's what the anchor-positioned labels need to be siblings of.
    buildLabels(canvas.parentElement);
    frame();

    let rT;
    const ro = new ResizeObserver(function(){
      clearTimeout(rT);
      rT = setTimeout(function(){
        const w = Math.round(box.offsetWidth);
        if(!w || w === width || !globe) return;
        width = w;
        canvas.style.width = width + "px";
        canvas.style.height = width + "px";
        globe.update({ width, height: width });
      }, 150);
    });
    ro.observe(box);
  }

  if(box.offsetWidth > 0){
    start();
  }else{
    const ro = new ResizeObserver(function(entries){
      if(entries[0] && entries[0].contentRect.width > 0){
        ro.disconnect();
        start();
      }
    });
    ro.observe(box);
  }
})();

// Region-list accordion: click a heading to expand its short blurb.
(function initHeritagePins(){
  document.querySelectorAll(".hg-pin-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      var panel = btn.nextElementSibling;
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  });
})();
