// Artisans page: clickable heritage-craft pins, grouped by region.
// Each expands a small inline panel instead of linking to a separate page.
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
