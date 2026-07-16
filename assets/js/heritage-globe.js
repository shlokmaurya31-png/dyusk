// Rotating globe on the Artisans page, marking the Indian craft-heritage
// regions DYUSK's pattern and print work draws inspiration from.
// cobe (https://github.com/shuding/cobe) is a plain canvas library — no
// React/build step needed, so it's loaded straight from a CDN here to
// match this site's plain HTML/CSS/JS stack. Loaded via dynamic import()
// inside a try/catch so a blocked/failed CDN fetch logs a clear console
// error instead of leaving a silently blank canvas.

const LOCATIONS = [
  { name: "Jaipur, Rajasthan", location: [26.9124, 75.7873] },
  { name: "Bagru, Rajasthan", location: [26.8998, 75.5322] },
  { name: "Kutch, Gujarat", location: [23.7337, 69.8597] },
  { name: "Varanasi, Uttar Pradesh", location: [25.3176, 82.9739] },
  { name: "Kanchipuram, Tamil Nadu", location: [12.8342, 79.7036] },
  { name: "Chanderi, Madhya Pradesh", location: [24.7186, 78.1358] },
  { name: "Srinagar, Kashmir", location: [34.0837, 74.7973] },
];

// DYUSK theme colours (assets/css/site.css :root / [data-theme="dark"])
// converted to the 0-1 RGB floats cobe expects.
const PALETTES = {
  light: { baseColor: [0.93, 0.89, 0.87], markerColor: [1, 0.05, 0.05], glowColor: [0.82, 0.79, 0.77], dark: 0.1 },
  dark:  { baseColor: [0.1, 0.09, 0.08],  markerColor: [1, 0.15, 0.15], glowColor: [0.93, 0.89, 0.87],  dark: 0.7 },
};

function currentTheme(){
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

(async function initHeritageGlobe(){
  const canvas = document.getElementById("heritageGlobe");
  if(!canvas) return;

  let createGlobe;
  try{
    const mod = await import("https://esm.sh/cobe@0.6.3");
    createGlobe = mod.default;
  }catch(err){
    console.error("[heritage-globe] failed to load cobe from CDN:", err);
    return;
  }

  let globe = null;
  let phi = 0;
  let width = 0;
  const pointerInteracting = { current: null };
  const pointerOffset = { current: 0 };
  let paused = false;

  function build(){
    if(globe) globe.destroy();
    width = canvas.offsetWidth;
    if(width === 0) return;

    const pal = PALETTES[currentTheme()];
    try{
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width, height: width,
        phi: 0, theta: 0.25, dark: pal.dark, diffuse: 1.3,
        mapSamples: 16000, mapBrightness: 6,
        baseColor: pal.baseColor,
        markerColor: pal.markerColor,
        glowColor: pal.glowColor,
        markerElevation: 0,
        opacity: 1,
        markers: LOCATIONS.map(function(l){ return { location: l.location, size: 0.06 }; }),
        onRender: function(state){
          if(!paused) phi += 0.0025;
          state.phi = phi + pointerOffset.current;
          state.theta = 0.25;
          state.width = width;
          state.height = width;
        },
      });
    }catch(err){
      console.error("[heritage-globe] createGlobe failed:", err);
    }
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

  if(canvas.offsetWidth > 0){
    build();
  } else {
    const ro = new ResizeObserver(function(entries){
      if(entries[0] && entries[0].contentRect.width > 0){
        ro.disconnect();
        build();
      }
    });
    ro.observe(canvas);
  }

  // re-render in the new palette when the cream/dark theme is switched
  document.querySelectorAll(".theme-dot").forEach(function(dot){
    dot.addEventListener("click", function(){ setTimeout(build, 50); });
  });

  var rT;
  window.addEventListener("resize", function(){
    clearTimeout(rT);
    rT = setTimeout(build, 200);
  });
})();
