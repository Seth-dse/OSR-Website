/* ============================================
   OSR — Operational Signal Reconnaissance
   JavaScript — Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========  STAR FIELD CANVAS  ========== */
  const canvas = document.getElementById('star-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COUNT = 200;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.3,
          alpha: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.3 + 0.05,
          drift: (Math.random() - 0.5) * 0.15,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2
        });
      }
    }

    function drawStars(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.alpha * (0.6 + 0.4 * twinkle);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
        ctx.fill();

        if (star.radius > 1) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.08})`;
          ctx.fill();
        }

        star.y += star.speed;
        star.x += star.drift;

        if (star.y > canvas.height) {
          star.y = -2;
          star.x = Math.random() * canvas.width;
        }
        if (star.x > canvas.width) star.x = 0;
        if (star.x < 0) star.x = canvas.width;
      });

      requestAnimationFrame(drawStars);
    }

    resizeCanvas();
    createStars();
    requestAnimationFrame(drawStars);
    window.addEventListener('resize', () => {
      resizeCanvas();
      createStars();
    });
  }


  /* ==========  NAV SCROLL BEHAVIOR  ========== */
  const navWrapper = document.getElementById('nav-wrapper');
  if (navWrapper) {
    // On subpages (non-home), always show solid nav
    const isHome = document.body.getAttribute('data-page') === 'home';
    if (!isHome) {
      navWrapper.classList.add('scrolled');
    }

    window.addEventListener('scroll', () => {
      if (isHome) {
        navWrapper.classList.toggle('scrolled', window.scrollY > 50);
      }
    });
  }


  /* ==========  MOBILE NAV TOGGLE  ========== */
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }


  /* ==========  SCROLL REVEAL  ========== */
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });
  revealElements.forEach(el => revealObserver.observe(el));


  /* ==========  HERO TYPING EFFECT (HOME ONLY)  ========== */
  const typingEl = document.getElementById('hero-typing');
  if (typingEl) {
    const phrases = [
      'SIGNAL ACQUIRED',
      'THREAT ASSESSMENT ACTIVE',
      'SECURE CHANNEL OPEN',
      'OPERATIONAL READINESS CONFIRMED',
      'STANDING BY FOR DIRECTIVE'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeDelay = 80;

    function typeLoop() {
      const current = phrases[phraseIndex];

      if (!isDeleting) {
        typingEl.textContent = current.substring(0, charIndex + 1);
        charIndex++;
        if (charIndex === current.length) {
          isDeleting = true;
          typeDelay = 2000;
        } else {
          typeDelay = 60 + Math.random() * 40;
        }
      } else {
        typingEl.textContent = current.substring(0, charIndex - 1);
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          typeDelay = 400;
        } else {
          typeDelay = 30;
        }
      }

      setTimeout(typeLoop, typeDelay);
    }
    setTimeout(typeLoop, 2000);
  }


  /* ==========  CAROUSEL (GALLERY PAGE)  ========== */
  const track = document.getElementById('carousel-track');
  const indicators = document.querySelectorAll('.carousel-indicator');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (track) {
    let currentSlide = 0;
    const slides = track.querySelectorAll('.carousel-slide');
    const total = slides.length;
    let autoplayInterval;

    function goToSlide(index) {
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      currentSlide = index;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      indicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === currentSlide);
      });
    }

    function startAutoplay() {
      autoplayInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }
    function stopAutoplay() {
      clearInterval(autoplayInterval);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoplay(); goToSlide(currentSlide - 1); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoplay(); goToSlide(currentSlide + 1); startAutoplay(); });

    indicators.forEach((ind, i) => {
      ind.addEventListener('click', () => { stopAutoplay(); goToSlide(i); startAutoplay(); });
    });

    startAutoplay();
  }


  /* ==========  COUNTER ANIMATION  ========== */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = el.getAttribute('data-count');
        const numTarget = parseInt(target.replace(/\D/g, ''));
        const hasPlus = target.includes('+');
        const hasTilde = target.includes('~');
        let current = 0;
        const increment = Math.ceil(numTarget / 60);
        const timer = setInterval(() => {
          current += increment;
          if (current >= numTarget) {
            current = numTarget;
            clearInterval(timer);
          }
          let display = current.toString();
          if (hasTilde) display = '~' + display;
          if (hasPlus) display = display + '+';
          el.textContent = display;
        }, 25);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObserver.observe(el));


  /* ==========  BACKGROUND AUDIO WITH PERSISTENCE  ========== */
  const audioToggle = document.getElementById('audio-toggle');
  const bgAudio = document.getElementById('bg-audio');

  if (audioToggle && bgAudio) {
    bgAudio.volume = 0.2;

    // Check if audio was playing on a previous page
    const audioWasPlaying = sessionStorage.getItem('osr-audio-playing') === 'true';
    const audioTime = parseFloat(sessionStorage.getItem('osr-audio-time') || '0');

    if (audioWasPlaying) {
      bgAudio.currentTime = audioTime;
      bgAudio.play().then(() => {
        audioToggle.classList.remove('muted');
      }).catch(() => {
        // Autoplay blocked — user must click
        audioToggle.classList.add('muted');
      });
    }

    // Toggle button
    audioToggle.addEventListener('click', () => {
      if (bgAudio.paused) {
        bgAudio.play().then(() => {
          audioToggle.classList.remove('muted');
          sessionStorage.setItem('osr-audio-playing', 'true');
        }).catch(() => {});
      } else {
        bgAudio.pause();
        audioToggle.classList.add('muted');
        sessionStorage.setItem('osr-audio-playing', 'false');
      }
    });

    // Save playback position before navigating away
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('osr-audio-time', bgAudio.currentTime.toString());
      if (!bgAudio.paused) {
        sessionStorage.setItem('osr-audio-playing', 'true');
      }
    });

    // Also try to auto-play on first user interaction if not already playing
    function tryAutoplayOnce() {
      if (bgAudio.paused && !audioWasPlaying) {
        bgAudio.play().then(() => {
          audioToggle.classList.remove('muted');
          sessionStorage.setItem('osr-audio-playing', 'true');
        }).catch(() => {});
      }
      document.removeEventListener('click', tryAutoplayOnce);
      document.removeEventListener('scroll', tryAutoplayOnce);
      document.removeEventListener('keydown', tryAutoplayOnce);
    }

    document.addEventListener('click', tryAutoplayOnce);
    document.addEventListener('scroll', tryAutoplayOnce);
    document.addEventListener('keydown', tryAutoplayOnce);
  }


  /* ==========  PARALLAX ON HERO  ========== */
  const heroBg = document.querySelector('.hero-bg img');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroBg.style.transform = `scale(1.1) translateY(${scrolled * 0.15}px)`;
      }
    });
  }

  /* ==========  PAGE HERO PARALLAX  ========== */
  const pageHeroBg = document.querySelector('.page-hero-bg img');
  if (pageHeroBg) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < 500) {
        pageHeroBg.style.transform = `scale(1.1) translateY(${scrolled * 0.2}px)`;
      }
    });
  }

});
