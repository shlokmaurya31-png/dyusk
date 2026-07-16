// Interactive globe on the Artisans page: every world-heritage craft
// tradition is a marker. Clicking a marker's label, or a name in the
// region list below, opens a full write-up in a modal. Built on cobe v2
// (verified against its real source — https://github.com/shuding/cobe —
// since this project has burned time before on mismatched/hallucinated
// cobe docs): the library exposes globe.update({phi, ...}) which you
// drive yourself in your own rAF loop, and a built-in anchor system (CSS
// anchor positioning) for pinning real HTML elements to a marker's live
// projected screen position.

const LOCATIONS = [
  { id: "madhubani-painting", name: "Madhubani Painting", region: "Asia", location: [26.35, 86.07],
    desc: "Madhubani painting originated in the Mithila region of Bihar, traditionally made by women on the mud walls of their homes to mark festivals and weddings. Every inch of the surface is filled with intricate patterns — fish, peacocks, the sun and moon, tree of life — rendered in bold outlines and filled with natural pigments from turmeric, indigo and soot. What began as a private domestic art became famous worldwide after a 1966 drought pushed artists to paint on paper to earn income, turning a wall tradition into a portable one without losing its density of pattern." },
  { id: "warli-painting", name: "Warli Painting", region: "Asia", location: [19.70, 73.10],
    desc: "Warli art comes from the Warli tribal communities of Maharashtra and traces back over 2,500 years, though it wasn't documented until the 1970s. Painted in white rice-paste on a mud-red or ochre background, it renders the human figure as two triangles joined at the point — a shape said to represent the balance of the material and spiritual worlds. The scenes are almost always communal: harvests, hunts, weddings and the circular tarpa dance, capturing everyday village life rather than gods or myths." },
  { id: "pattachitra", name: "Pattachitra", region: "Asia", location: [19.80, 85.83],
    desc: "Pattachitra — literally ‘cloth picture’ — is a scroll-painting tradition from Odisha built around retelling stories from the Jagannath and Vaishnava traditions in dense, continuous narrative panels. Artists prepare their own canvas by layering cloth with tamarind-seed glue and chalk, then outline every figure in fine black brush before filling it with mineral and vegetable colour, finishing with a lacquer coating that lets the scroll be rolled without cracking. The decorative border is as deliberate as the central story, framing the myth the way a stage frames a performance." },
  { id: "ukiyo-e", name: "Ukiyo-e", region: "Asia", location: [35.68, 139.69],
    desc: "Ukiyo-e — ‘pictures of the floating world’ — flourished in Edo-period Japan as woodblock prints depicting kabuki actors, courtesans, landscapes and the pleasures of city life, sold cheaply enough to be genuinely popular art rather than the property of the wealthy. Producing one required a team: an artist to design it, a carver to cut a separate block for each colour, and a printer to register and layer them by hand. Hokusai's Great Wave and Hiroshige's landscape series carried this technique out of Japan entirely, going on to reshape European painting through Impressionism and Art Nouveau." },
  { id: "sumi-e", name: "Sumi-e", region: "Asia", location: [35.01, 135.77],
    desc: "Sumi-e is ink-wash painting built on restraint: a single stick of pine-soot ink, ground fresh against a stone, and a brush loaded to hold several tones of grey in one stroke. Rooted in Zen practice, the discipline isn't in adding detail but in knowing what to leave out — a single reed, a mountain suggested by three strokes, negative space doing as much work as ink. A painting is typically made in one continuous sitting, since sumi ink can't be corrected once it meets the paper." },
  { id: "chinese-ink-wash", name: "Chinese Ink Wash Painting", region: "Asia", location: [39.90, 116.41],
    desc: "Chinese ink wash painting, or shui-mo hua, developed over more than a thousand years as a way of capturing not just a landscape's appearance but the philosophy behind it — the Daoist idea that mountains, water and mist are in constant, balanced motion. Painters work wet-on-wet and wet-on-dry in the same piece, letting ink bleed for mist and holding a dry brush for the texture of rock and bark. Poetry, seals and calligraphy are often worked directly into the composition, so the painting is read as much as it's viewed." },
  { id: "iznik-ceramics", name: "Iznik Ceramics", region: "Asia", location: [40.43, 29.72],
    desc: "Iznik ceramics take their name from the Ottoman town where, from the late 15th century, potters developed a fritware body and a palette of cobalt blue, turquoise, sage green and a distinctive coral red unmatched anywhere else at the time. Tulips, carnations, hyacinths and saz leaves were painted under a clear lead glaze fired at high heat, producing colour so stable it still reads bright on tiles half a millennium old. At its peak, Iznik workshops supplied tilework for imperial mosques across the Ottoman world, turning ceramic decoration into architecture." },
  { id: "ndebele-painting", name: "Ndebele House Painting", region: "Africa", location: [-25.47, 29.98],
    desc: "Ndebele house painting turns home exteriors into bold geometric murals — sharp triangles, chevrons and symmetrical bands in saturated colour, traditionally applied by the women of the household using fingers and homemade brushes before commercial paint became available. The patterns aren't random: certain motifs mark status, mourning or celebration, and the practice became a quiet act of cultural assertion during apartheid, when few other public expressions of Ndebele identity were tolerated. Esther Mahlangu carried the tradition onto a global stage, painting a BMW art car and murals for institutions worldwide without changing the hand-painted technique." },
  { id: "kente-weaving", name: "Kente Weaving", region: "Africa", location: [6.69, -1.62],
    desc: "Kente cloth is woven by the Akan people, most famously in Bonwire near Kumasi, on narrow strip looms that produce bands roughly four inches wide, later sewn together into the full cloth. Every colour and pattern carries meaning — gold for wealth, green for growth, specific geometric blocks tied to specific proverbs — so a finished cloth can be read almost like a sentence by someone who knows the code. Originally reserved for Ashanti royalty, kente is still woven by hand today, one narrow strip at a time, exactly as it was centuries ago." },
  { id: "yoruba-beadwork", name: "Yoruba Beadwork", region: "Africa", location: [7.48, 4.56],
    desc: "Yoruba beadwork reached its most elaborate form in the royal crowns, collars and footwear of Ife and Oyo, where thousands of tiny glass beads were strung and stitched into dense figurative and geometric patterns by specialist guild artisans. Beadwork wasn't decorative alone — a beaded crown's veil was believed to conceal a king's face from the direct gaze of his subjects, tying the craft to spiritual authority as much as status. The same beading techniques, passed down through apprenticeship, still produce ceremonial regalia for Yoruba royal courts today." },
  { id: "tuareg-silverwork", name: "Tuareg Silverwork", region: "Africa", location: [16.97, 7.99],
    desc: "Tuareg silverwork is made by inadan — a hereditary caste of Saharan blacksmith-artisans — using engraving, filigree and niello (a black metallic inlay) to produce jewelry, sword hilts and the famous Agadez cross, one of several regional cross designs each tied to a specific town. Pieces are rarely purely ornamental: a cross given to a child, or an amulet worn by a traveller, is meant to carry protection across the desert. The geometric restraint of the designs reflects Tuareg script and textile motifs as much as it does the material itself." },
  { id: "rosemaling", name: "Rosemaling", region: "Europe", location: [59.40, 8.30],
    desc: "Rosemaling — ‘rose painting’ — emerged in rural Norway in the 18th century as farmers who'd seen Baroque and Rococo church interiors began adapting those flowing, ornate flourishes onto furniture, walls and everyday wooden objects back home. No two regional styles are identical: Telemark's is dense and structured, Hallingdal's looser and more asymmetric, each passed down through informal apprenticeship rather than written pattern books. Norwegian immigrants carried it to the American Midwest, where it's still actively taught and practiced today, arguably in greater numbers than in Norway itself." },
  { id: "khokhloma", name: "Khokhloma", region: "Europe", location: [56.65, 43.46],
    desc: "Khokhloma is a lacquerware technique from villages near Nizhny Novgorod that produces the illusion of gilded wood without any real gold — a tin or aluminum powder is applied under layers of linseed-oil varnish, then oven-baked until the varnish yellows and reads as gold beneath the paint. Over that base, artisans paint stylised berries, leaves and firebirds in red and black, a palette so associated with Russian folk craft that it's now shorthand for the whole tradition. Every step, from turning the wood to the final baking, is still done by hand in the same villages where it began in the 17th century." },
  { id: "celtic-knotwork", name: "Celtic Knotwork", region: "Europe", location: [53.35, -6.26],
    desc: "Celtic knotwork is built from a single continuous line woven over and under itself with no visible beginning or end, a form that early Christian scribes adopted for illuminated manuscripts like the Book of Kells, reading the endless line as a symbol of eternity and the interconnectedness of all things. The patterns are mathematically precise — artisans plotted them on grids long before anyone called it geometry — yet the finished knotwork reads as organic, almost woven, rather than calculated. It appears everywhere from stone crosses to jewelry, always following the same unbroken-line logic regardless of the material." },
  { id: "byzantine-mosaics", name: "Byzantine Mosaics", region: "Europe", location: [44.42, 12.20],
    desc: "Byzantine mosaics turned walls and domes into shimmering fields of tiny glass tesserae, many backed with real gold or silver leaf and set at slight angles so they'd catch candlelight and shift as a viewer moved through the space. The style favoured flat, frontal, otherworldly figures over naturalistic ones — the point wasn't to depict a saint accurately but to suggest a presence beyond ordinary space. Ravenna's churches hold some of the best-preserved examples anywhere, having escaped the wave of destruction that damaged so much Byzantine work in Constantinople itself." },
  { id: "alebrijes", name: "Alebrijes", region: "Americas", location: [17.06, -96.73],
    desc: "Alebrijes are brightly painted, fantastical hybrid creatures — part lion, part bird, part dragon — carved from copal wood in Oaxaca or built from papier-mâché in Mexico City, a form invented by artist Pedro Linares in the 1930s after he reportedly dreamed of these creatures during a fever. What began as one artist's dream imagery became a full regional craft, with Oaxacan woodcarving families developing their own dense, hand-painted geometric patterning distinct from the original papier-mâché versions. Each piece is still individually carved and painted, so no two alebrijes are ever quite identical." },
  { id: "huichol-yarn-art", name: "Huichol Yarn Art", region: "Americas", location: [22.15, -104.68],
    desc: "Huichol (Wixárika) yarn art presses strands of brightly coloured yarn into a beeswax-and-resin base one line at a time, building dense, symmetrical compositions of deer, peyote flowers, eagles and corn that come directly out of Huichol religious cosmology and pilgrimage traditions. The imagery isn't decorative invention — it records visions and prayers tied to specific ceremonies, and the exacting symmetry is considered essential to the work's spiritual accuracy, not just its craft. The same visual language also appears in Huichol beadwork, making the two techniques close cousins in both meaning and pattern." },
  { id: "navajo-weaving", name: "Navajo Weaving", region: "Americas", location: [36.14, -109.82],
    desc: "Navajo (Diné) weaving is done on an upright loom with no mechanical parts, using hand-spun and naturally dyed wool to produce geometric blankets and rugs whose regional styles — Two Grey Hills, Ganado, Teec Nos Pos — are distinct enough that experienced buyers can identify a weaving's origin on sight. A single large rug can take months, with the weaver carrying the entire pattern in memory rather than working from a drawn template. What were originally trade blankets became, after railroads brought outside buyers to the Southwest in the late 1800s, some of the most recognized textile art in North America." },
  { id: "mola", name: "Mola", region: "Americas", location: [9.55, -78.95],
    desc: "Mola is the reverse-appliqué textile technique of the Guna people of Panama's San Blas islands, built by stacking several layers of different coloured cotton, then cutting through the top layers to reveal the colours beneath — the opposite of standard appliqué, where fabric is added rather than cut away. Designs range from geometric abstraction to birds, sea creatures and, more recently, scenes drawn from daily life, all finished with extremely fine, near-invisible stitching along every cut edge. Molas were originally worn as the front and back panels of a Guna woman's blouse, and the best examples are still judged by stitch density as much as design." },
  { id: "aboriginal-dot-painting", name: "Australian Aboriginal Dot Painting", region: "Oceania", location: [-23.70, 133.88],
    desc: "Aboriginal dot painting as it's known today is a relatively recent form — it began in 1971 at Papunya, where teacher Geoffrey Bardon encouraged Central Desert artists to paint traditional ground and body designs onto boards. Dots weren't purely decorative; artists used them to obscure sacred iconography, letting a painting be shown publicly while still protecting knowledge meant only for initiated community members. Each work maps to a specific Dreaming story and Country, tying the abstract pattern to real geography and ancestral narrative rather than free invention." },
  { id: "maori-carving", name: "Māori Carving", region: "Oceania", location: [-38.14, 176.25],
    desc: "Whakairo, Māori carving, is worked primarily in wood, bone and pounamu (greenstone), producing the spiral koru forms and ancestor figures found on wharenui (meeting houses), waka (canoes) and personal ornaments. Carving was traditionally restricted to men trained through years of apprenticeship under a tohunga whakairo (master carver), and every element — the tools, the wood chosen, even the carving sequence — followed protocol tied to whakapapa, or genealogy. A finished wharenui's carved panels function as a physical family tree, each figure representing a specific ancestor rather than a generic decorative motif." },
  { id: "tapa-cloth", name: "Tapa Cloth", region: "Oceania", location: [-18.14, 178.44],
    desc: "Tapa cloth is made not by weaving but by beating — strips of inner mulberry or breadfruit bark are soaked, then pounded flat and wide with a wooden mallet, felting the fibres together into a paper-like cloth without a single stitch. Once dry, it's often stamped, painted or smoked with natural dyes in patterns specific to the island it comes from — Fijian masi, Tongan ngatu and Samoan siapo are all recognizably different traditions under the same broad technique. Historically used for clothing, bedding and ceremonial gifts, tapa-making survives today largely through the work of women's collectives across the Pacific." },
  { id: "islamic-geometric-art", name: "Islamic Geometric Art", region: "Middle East & North Africa", location: [30.04, 31.24],
    desc: "Islamic geometric art developed as an alternative to figurative religious imagery, building entire decorative systems out of repeating polygons, stars and interlocking lines constructed with nothing more than a compass and straightedge. The patterns are mathematically rigorous — many are built on the same underlying grids mathematicians would later formalize as tessellations — yet the intent was devotional: infinite, non-repeating-seeming pattern as a visual expression of the infinite nature of the divine. The same underlying geometric systems recur from Andalusian tilework to Central Asian architecture, adapted to local materials but built on shared mathematical bones." },
  { id: "persian-miniature", name: "Persian Miniature", region: "Middle East & North Africa", location: [32.65, 51.67],
    desc: "Persian miniature painting illustrated manuscripts of poetry, history and royal chronicles with extraordinarily fine detail — court scenes, gardens and battles rendered in flat, jewel-toned colour with no single vanishing-point perspective, so a viewer's eye can move through multiple moments in the same scene at once. Isfahan and Shiraz became major centres of the form under Safavid patronage, with master painters like Reza Abbasi elevating manuscript illustration into an art form collected in its own right, apart from the text it accompanied. Pigments were often ground from genuine lapis lazuli and gold leaf, making a single finished folio a significant undertaking in materials alone." },
  { id: "zellige", name: "Zellige", region: "Middle East & North Africa", location: [34.03, -5.00],
    desc: "Zellige is Moroccan mosaic tilework built from individually chiselled geometric tile pieces, each cut by hand from a single fired, glazed tile block using a hammer and chisel called a manqash — no two zellige workshops cut a star or cross exactly the same way. Master craftsmen in Fez still train apprentices for years before they're trusted to cut, following geometric patterns passed down without written blueprints. Assembled face-down and set into plaster before being flipped into place, a finished zellige wall or fountain reads as a single continuous geometric field despite being built from thousands of separately cut pieces." },
];

const LOCATIONS_BY_ID = {};
LOCATIONS.forEach(function(l){ LOCATIONS_BY_ID[l.id] = l; });

// ---------- craft detail modal ----------
(function initCraftModal(){
  const modal = document.getElementById("craftModal");
  if(!modal) return;
  const titleEl = document.getElementById("craftModalTitle");
  const regionEl = document.getElementById("craftModalRegion");
  const descEl = document.getElementById("craftModalDesc");
  const closeBtn = document.getElementById("craftModalClose");
  const scrim = document.getElementById("craftModalScrim");
  let lastFocused = null;

  function openCraftModal(id){
    const loc = LOCATIONS_BY_ID[id];
    if(!loc) return;
    titleEl.textContent = loc.name;
    regionEl.textContent = loc.region;
    descEl.textContent = loc.desc;
    lastFocused = document.activeElement;
    modal.hidden = false;
    closeBtn.focus();
    document.body.style.overflow = "hidden";
  }
  function closeCraftModal(){
    modal.hidden = true;
    document.body.style.overflow = "";
    if(lastFocused) lastFocused.focus();
  }

  closeBtn.addEventListener("click", closeCraftModal);
  scrim.addEventListener("click", closeCraftModal);
  window.addEventListener("keydown", function(e){
    if(e.key === "Escape" && !modal.hidden) closeCraftModal();
  });

  window.dyuskOpenCraft = openCraftModal;

  document.querySelectorAll(".hg-pin-btn").forEach(function(btn){
    const li = btn.closest(".hg-pin");
    const id = li && li.id ? li.id.replace(/^loc-/, "") : null;
    if(!id) return;
    btn.addEventListener("click", function(){ openCraftModal(id); });
  });
})();

// ---------- globe ----------
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
      b.addEventListener("click", function(){
        if(window.dyuskOpenCraft) window.dyuskOpenCraft(loc.id);
      });
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
    requestAnimationFrame(frame);
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
