/**
 * Terraza La Opulenza - Main JavaScript
 * Carruseles coverflow centrados con auto-desplazamiento suave, 
 * vista previa lateral (peek), lightbox modal, categorías y menú móvil.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }

  initStickyHeader();
  initMobileDrawer();
  initCoverflowCarousels();
  initGalleryLightbox();
  initScrollSpy();
  initScrollAnimations();

  if (!window.location.hash) {
    setTimeout(() => window.scrollTo(0, 0), 120);
  }
});

/* ================= 1. STICKY HEADER (MÁS GRUESA AL INICIO, DELGADA AL SCROLL) ================= */
function initStickyHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ================= 2. MOBILE DRAWER ================= */
function initMobileDrawer() {
  const menuToggle = document.getElementById('menuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (!menuToggle || !mobileDrawer) return;

  let previousBodyOverflow = '';
  const getDrawerFocusableElements = () => Array.from(
    mobileDrawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter(element => element.getClientRects().length > 0);

  const openDrawer = () => {
    if (mobileDrawer.classList.contains('open')) return;
    previousBodyOverflow = document.body.style.overflow;
    mobileDrawer.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Cerrar menú de navegación');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const [firstFocusable] = getDrawerFocusableElements();
    if (firstFocusable) firstFocusable.focus();
  };

  const closeDrawer = (restoreFocus = true) => {
    if (!mobileDrawer.classList.contains('open')) return;
    mobileDrawer.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    mobileDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousBodyOverflow;
    if (restoreFocus) menuToggle.focus();
  };

  menuToggle.addEventListener('click', () => {
    if (mobileDrawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => closeDrawer(false));
  });

  document.addEventListener('click', (e) => {
    if (mobileDrawer.classList.contains('open') && 
        !mobileDrawer.contains(e.target) && 
        !menuToggle.contains(e.target)) {
      closeDrawer();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
      closeDrawer();
      return;
    }

    if (e.key === 'Tab' && mobileDrawer.classList.contains('open')) {
      const focusableElements = getDrawerFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) {
        e.preventDefault();
        mobileDrawer.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* ================= 3. CARRUSELES COVERFLOW CENTRADOS ================= */
function createCoverflowCarousel(root, options = {}) {
  const track = root.querySelector('.car-track');
  const dotsContainer = root.querySelector('.car-dots');
  const prevBtn = root.querySelector('.car-btn.pv');
  const nextBtn = root.querySelector('.car-btn.nx');

  if (!track) return null;

  let allSlides = Array.from(track.children);
  let visibleSlides = allSlides;
  let currentIndex = options.startIndex || 0;
  let isPaused = false;
  let isVisible = false;
  let rafId = null;
  let autoInterval = null;

  // Calcula la posición para centrar la diapositiva en el visor
  function getCenterPos(index) {
    if (!visibleSlides[index]) return 0;
    const slide = visibleSlides[index];
    return slide.offsetLeft + (slide.offsetWidth / 2) - (track.clientWidth / 2);
  }

  function goTo(index, smooth = true) {
    if (!visibleSlides.length) return;
    const targetIdx = Math.max(0, Math.min(visibleSlides.length - 1, index));
    const targetScroll = getCenterPos(targetIdx);
    
    track.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function centerActiveDot(smooth = true) {
    if (!dotsContainer || dotsContainer.scrollWidth <= dotsContainer.clientWidth) return;

    const activeDot = dotsContainer.children[currentIndex];
    if (!activeDot) return;

    const containerRect = dotsContainer.getBoundingClientRect();
    const dotRect = activeDot.getBoundingClientRect();
    const dotCenter = dotsContainer.scrollLeft + dotRect.left - containerRect.left + (dotRect.width / 2);
    const maxScroll = dotsContainer.scrollWidth - dotsContainer.clientWidth;
    const targetScroll = Math.max(0, Math.min(maxScroll, dotCenter - (dotsContainer.clientWidth / 2)));

    dotsContainer.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function updateActiveState() {
    rafId = null;
    if (!visibleSlides.length) return;

    const mid = track.scrollLeft + (track.clientWidth / 2);
    let bestDist = Infinity;
    let bestIdx = 0;

    visibleSlides.forEach((slide, i) => {
      const slideCenter = slide.offsetLeft + (slide.offsetWidth / 2);
      const dist = Math.abs(slideCenter - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });

    currentIndex = bestIdx;

    // Actualiza clases de diapositiva
    visibleSlides.forEach((slide, i) => {
      slide.classList.toggle('act', i === currentIndex);
    });

    // Actualiza puntos
    if (dotsContainer) {
      const dots = Array.from(dotsContainer.children);
      dots.forEach((dot, i) => {
        const isOn = i === currentIndex;
        dot.classList.toggle('on', isOn);
      });
      centerActiveDot();
    }

    // Botones anterior / siguiente
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === visibleSlides.length - 1;

    if (options.onChange) {
      options.onChange(currentIndex);
    }
  }

  function rebuildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    
    if (visibleSlides.length <= 1) {
      dotsContainer.style.display = 'none';
      return;
    }
    dotsContainer.style.display = 'flex';

    visibleSlides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `car-dot ${i === currentIndex ? 'on' : ''}`;
      dot.setAttribute('aria-label', `Ir a diapositiva ${i + 1}`);
      dot.onclick = () => goTo(i);
      dotsContainer.appendChild(dot);
    });
    centerActiveDot(false);
  }

  // Filtrado dinámico (para categorías de la galería)
  function filterSlides(predicate) {
    if (predicate) {
      visibleSlides = allSlides.filter(predicate);
      allSlides.forEach(slide => {
        slide.style.display = predicate(slide) ? '' : 'none';
      });
    } else {
      visibleSlides = allSlides;
      allSlides.forEach(slide => {
        slide.style.display = '';
      });
    }

    currentIndex = 0;
    rebuildDots();
    setTimeout(() => {
      goTo(0, false);
      updateActiveState();
    }, 50);
  }

  // Event Listeners de desplazamiento
  track.addEventListener('scroll', () => {
    if (!rafId) {
      rafId = requestAnimationFrame(updateActiveState);
    }
  }, { passive: true });

  if (prevBtn) {
    prevBtn.onclick = () => goTo(currentIndex - 1);
  }

  if (nextBtn) {
    nextBtn.onclick = () => goTo(currentIndex + 1);
  }

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(currentIndex - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(currentIndex + 1);
    }
  });

  // Clic en diapositivas
  allSlides.forEach((slide) => {
    slide.addEventListener('click', (e) => {
      const visibleIdx = visibleSlides.indexOf(slide);
      if (visibleIdx === -1) return;

      if (visibleIdx !== currentIndex) {
        e.preventDefault();
        goTo(visibleIdx);
      } else if (options.onSlideClick) {
        options.onSlideClick(visibleIdx, slide);
      }
    });
  });

  // Pausa del auto-desplazamiento al interactuar
  ['mouseenter', 'touchstart', 'focusin'].forEach(evt => {
    root.addEventListener(evt, () => {
      isPaused = true;
    }, { passive: true });
  });

  ['mouseleave', 'touchend'].forEach(evt => {
    root.addEventListener(evt, () => {
      isPaused = false;
    }, { passive: true });
  });

  window.addEventListener('resize', () => {
    goTo(currentIndex, false);
  }, { passive: true });

  // Auto-desplazamiento cada 4.5 segundos si la sección está en pantalla
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (options.auto && !prefersReducedMotion) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.2 });
      observer.observe(root);
    } else {
      isVisible = true;
    }

    autoInterval = setInterval(() => {
      if (!isPaused && isVisible && visibleSlides.length > 1) {
        const nextIdx = (currentIndex === visibleSlides.length - 1) ? 0 : currentIndex + 1;
        goTo(nextIdx);
      }
    }, 4500);
  }

  // Inicialización
  rebuildDots();
  setTimeout(() => {
    goTo(currentIndex, false);
    updateActiveState();
  }, 100);

  return {
    goTo,
    filterSlides,
    getVisibleSlides: () => visibleSlides,
    getCurrentIndex: () => currentIndex
  };
}

let galleryCarousel = null;
let packagesCarousel = null;

function initCoverflowCarousels() {
  const galRoot = document.getElementById('galRoot');
  const pkgRoot = document.getElementById('pkgRoot');

  // Inicializar carrusel de galería
  if (galRoot) {
    galleryCarousel = createCoverflowCarousel(galRoot, {
      auto: true,
      onSlideClick: (index, slide) => {
        openLightboxForSlide(slide);
      }
    });

    // Filtros de galería
    const filterBtns = document.querySelectorAll('.gallery-filters .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        const filter = btn.getAttribute('data-filter');
        if (galleryCarousel) {
          if (filter === 'all') {
            galleryCarousel.filterSlides(null);
          } else {
            galleryCarousel.filterSlides(slide => {
              const categories = slide.getAttribute('data-category') || '';
              return categories.split(' ').includes(filter);
            });
          }
        }
      });
    });
  }

  // Inicializar carrusel de paquetes (inicia en el paquete más popular: "Tarifa Sábado")
  if (pkgRoot) {
    packagesCarousel = createCoverflowCarousel(pkgRoot, {
      startIndex: 3,
      auto: true
    });
  }
}

/* ================= 4. GALLERY LIGHTBOX ================= */
let currentLightboxIndex = 0;
let currentLightboxList = [];
let lightboxReturnFocus = null;
let lightboxPreviousBodyOverflow = '';

function openLightboxForSlide(slide) {
  const galRoot = document.getElementById('galRoot');
  if (!galRoot) return;

  lightboxReturnFocus = document.activeElement;
  if (!lightboxReturnFocus || lightboxReturnFocus === document.body) {
    lightboxReturnFocus = galRoot.querySelector('.car-track');
  }

  const slides = galleryCarousel ? galleryCarousel.getVisibleSlides() : Array.from(galRoot.querySelectorAll('.car-slide'));
  currentLightboxList = slides;
  currentLightboxIndex = slides.indexOf(slide);
  if (currentLightboxIndex === -1) currentLightboxIndex = 0;

  showLightboxImage(currentLightboxIndex);

  const modal = document.getElementById('lightboxModal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    lightboxPreviousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeButton = document.getElementById('lightboxClose');
    if (closeButton) closeButton.focus();
  }
}

function showLightboxImage(index) {
  if (!currentLightboxList.length) return;
  currentLightboxIndex = (index + currentLightboxList.length) % currentLightboxList.length;
  const slide = currentLightboxList[currentLightboxIndex];

  const modalImg = document.getElementById('lightboxImg');
  const modalTitle = document.getElementById('lightboxTitle');
  const modalDesc = document.getElementById('lightboxDesc');
  const modalTag = document.getElementById('lightboxTag');
  const modalCounter = document.getElementById('lightboxCounter');

  if (modalImg && slide) {
    modalImg.src = slide.getAttribute('data-src') || '';
    modalImg.alt = slide.getAttribute('data-title') || '';
    if (modalTitle) modalTitle.textContent = slide.getAttribute('data-title') || '';
    if (modalDesc) modalDesc.textContent = slide.getAttribute('data-desc') || '';
    
    const tagEl = slide.querySelector('.item-tag');
    if (modalTag) {
      modalTag.textContent = tagEl ? tagEl.textContent.trim() : 'Terraza La Opulenza';
    }

    if (modalCounter) {
      modalCounter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxList.length}`;
    }
  }
}

function initGalleryLightbox() {
  const modal = document.getElementById('lightboxModal');
  const closeBtn = document.getElementById('lightboxClose');
  const overlay = document.getElementById('lightboxOverlay');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const container = modal ? modal.querySelector('.lightbox-container') : null;

  if (!modal) return;

  const closeLightbox = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = lightboxPreviousBodyOverflow;
    if (lightboxReturnFocus && lightboxReturnFocus.isConnected) lightboxReturnFocus.focus();
  };

  if (closeBtn) closeBtn.onclick = closeLightbox;
  if (overlay) overlay.onclick = closeLightbox;
  if (container) {
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        closeLightbox();
      }
    });
  }

  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      showLightboxImage(currentLightboxIndex - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      showLightboxImage(currentLightboxIndex + 1);
    };
  }

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightboxImage(currentLightboxIndex - 1);
    if (e.key === 'ArrowRight') showLightboxImage(currentLightboxIndex + 1);

    if (e.key === 'Tab') {
      const focusableElements = Array.from(modal.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getClientRects().length > 0);
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) {
        e.preventDefault();
        modal.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* ================= 5. SCROLL SPY ACTIVE NAV ================= */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');

  if (!sections.length || !navLinks.length) return;

  const onScroll = () => {
    const scrollPos = window.scrollY + 110;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ================= 6. SCROLL REVEAL ANIMATIONS ================= */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.feature-strip-item, .contact-big-card, .location-card, .map-embed-wrapper, .custom-quote-box, .calendar-card, .calendar-perk-card');

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-on-scroll', 'revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  animatedElements.forEach(el => {
    el.classList.add('reveal-on-scroll');
    observer.observe(el);
  });
}
