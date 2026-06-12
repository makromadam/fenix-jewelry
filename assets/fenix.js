/* ============================================================
   FENIX JEWELRY — shared behaviour
   ============================================================ */
(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- OPENING LOADER: wait for the first hero image ---------- */
  var loader = document.querySelector('[data-site-loader]');
  var pageReadyResolve;
  if(loader){
    window.fenixPageReady = new Promise(function(resolve){ pageReadyResolve = resolve; });
    var loaderStarted = Date.now();
    var loaderFinished = false;
    var loaderMinimum = reduce ? 100 : 500;
    function finishLoader(){
      if(loaderFinished) return;
      loaderFinished = true;
      var remaining = Math.max(0, loaderMinimum - (Date.now() - loaderStarted));
      setTimeout(function(){
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        if(pageReadyResolve) pageReadyResolve();
        setTimeout(function(){ if(loader.parentNode) loader.parentNode.removeChild(loader); }, 700);
      }, remaining);
    }
    var firstHeroImage = document.querySelector('[data-hero] .hero-slide.active .hero-img');
    var background = firstHeroImage && firstHeroImage.style.backgroundImage;
    var imageMatch = background && background.match(/^url\(["']?(.*?)["']?\)$/);
    if(imageMatch && imageMatch[1]){
      var preloadImage = new Image();
      preloadImage.onload = finishLoader;
      preloadImage.onerror = finishLoader;
      preloadImage.src = imageMatch[1];
      if(preloadImage.complete) finishLoader();
    } else {
      finishLoader();
    }
    setTimeout(finishLoader, 4500);
  }

  /* ---------- NAV: solid on scroll ---------- */
  var nav = document.querySelector('.nav');
  var heroEl = document.querySelector('[data-hero]');
  function navState(){
    if(!nav) return;
    if(window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  navState();
  window.addEventListener('scroll', navState, {passive:true});

  /* ---------- MOBILE MENU ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var mobile = document.querySelector('.mobile-menu');
  if(toggle && mobile){
    toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click', function(){
      var open = mobile.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobile.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
        document.body.style.overflow='';
      });
    });
  }

  /* ---------- CONTACT DROPDOWN ---------- */
  var cWrap = document.querySelector('.contact-wrap');
  var cBtn = document.querySelector('#contactBtn');
  if(cWrap && cBtn){
    cBtn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var open = cWrap.classList.toggle('open');
      cBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(e){
      if(!cWrap.contains(e.target)){ cWrap.classList.remove('open'); cBtn.setAttribute('aria-expanded','false'); }
    });
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape'){ cWrap.classList.remove('open'); cBtn.setAttribute('aria-expanded','false'); }
    });
  }

  /* ---------- REVEAL ON SCROLL ---------- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* ---------- PARALLAX (data-parallax = speed, negative = slower) ---------- */
  var pxEls = [].slice.call(document.querySelectorAll('[data-parallax]'));
  function parallax(){
    if(reduce) return;
    var vh = window.innerHeight;
    pxEls.forEach(function(el){
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      var r = el.getBoundingClientRect();
      var center = r.top + r.height/2;
      var off = (center - vh/2) * speed;
      el.style.transform = 'translate3d(0,'+off.toFixed(2)+'px,0)';
    });
  }
  var ticking=false;
  function onScroll(){
    if(!ticking){ requestAnimationFrame(function(){ parallax(); ticking=false; }); ticking=true; }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', parallax);
  parallax();

  /* ---------- HERO SLIDESHOW ---------- */
  var hero = document.querySelector('[data-hero]');
  var slides = [].slice.call(document.querySelectorAll('[data-hero] .hero-slide'));
  if(slides.length){
    var idx = slides.findIndex(function(s){ return s.classList.contains('active'); });
    if(idx < 0){ idx = 0; slides[0].classList.add('active'); }
    function startHero(){
      // Enable crossfades after the opening image is ready and fully covered.
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ if(hero) hero.classList.add('hero-ready'); }); });
      setTimeout(function(){ if(hero) hero.classList.add('hero-ready'); }, 400);
      setInterval(function(){
        slides[idx].classList.remove('active');
        idx = (idx+1) % slides.length;
        slides[idx].classList.add('active');
      }, 5200);
    }
    if(window.fenixPageReady) window.fenixPageReady.then(startHero);
    else startHero();
  }

  /* ---------- WHATSAPP FLOAT: scroll-interactive ---------- */
  var wa = document.querySelector('.wa-float');
  if(wa){
    var lastY = window.scrollY, collapseTimer=null;
    function waUpdate(){
      var y = window.scrollY;
      // show once past hero (or 70% viewport if no hero)
      var threshold = heroEl ? heroEl.offsetHeight * 0.7 : window.innerHeight*0.7;
      if(y > threshold){ wa.classList.add('show'); }
      else { wa.classList.remove('show','expanded'); lastY=y; return; }
      // scrolling up -> expand, down -> collapse
      if(y < lastY - 4){
        wa.classList.add('expanded');
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(function(){ if(!wa.matches(':hover')) wa.classList.remove('expanded'); }, 1600);
      } else if(y > lastY + 4){
        wa.classList.remove('expanded');
      }
      lastY = y;
    }
    window.addEventListener('scroll', waUpdate, {passive:true});
    wa.addEventListener('mouseenter', function(){ if(wa.classList.contains('show')) wa.classList.add('expanded'); });
    wa.addEventListener('mouseleave', function(){ wa.classList.remove('expanded'); });
    waUpdate();
  }

  /* ---------- BACK TO TOP ---------- */
  document.querySelectorAll('[data-top]').forEach(function(b){
    b.addEventListener('click', function(e){ e.preventDefault(); window.scrollTo({top:0,behavior:reduce?'auto':'smooth'}); });
  });

  /* ---------- MAGNETIC BUTTONS ---------- */
  if(!reduce){
    document.querySelectorAll('.btn').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width/2;
        var my = e.clientY - r.top - r.height/2;
        btn.style.transform = 'translate('+(mx*0.18).toFixed(1)+'px,'+(my*0.3).toFixed(1)+'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform=''; });
    });
  }

  /* ---------- 3D DIAMOND: scroll-linked rotation ---------- */
  var dia = document.querySelector('[data-diamond]');
  if(dia && !reduce){
    function spin(){
      var r = dia.getBoundingClientRect();
      var prog = (window.innerHeight - r.top) / (window.innerHeight + r.height);
      var deg = prog * 360;
      dia.style.setProperty('--spin', deg.toFixed(1)+'deg');
    }
    window.addEventListener('scroll', spin, {passive:true});
    spin();
  }

  /* ---------- STAGGER GRID reveal index (for product cards) ---------- */
  document.querySelectorAll('[data-stagger] > *').forEach(function(el,i){
    el.style.transitionDelay = (0.06*i)+'s';
  });

})();
