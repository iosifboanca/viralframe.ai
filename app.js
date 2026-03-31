/* ================================================
   VIRALFRAME — APP.JS v2
   Three.js Hero + GSAP ScrollTrigger
   ================================================ */

(function () {
  'use strict';

  // ─── REGISTER GSAP PLUGINS ───
  gsap.registerPlugin(ScrollTrigger);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ─── THREE.JS WEBGL DISPLACEMENT HERO ───
  function initHeroScene() {
    const canvas = document.getElementById('hero-canvas');
    const heroSection = document.getElementById('hero');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Shader Uniforms
    const uniforms = {
      u_time: { value: 0.0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_color1: { value: new THREE.Color(0x8B5CF6) }, // Violet
      u_color2: { value: new THREE.Color(0xEC4899) }, // Pink
      u_color3: { value: new THREE.Color(0x06B6D4) }  // Cyan
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform vec2 u_resolution;
        uniform vec3 u_color1;
        uniform vec3 u_color2;
        uniform vec3 u_color3;
        varying vec2 vUv;

        float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}
        float noise(vec3 p){
            vec3 a = floor(p);
            vec3 d = p - a;
            d = d * d * (3.0 - 2.0 * d);
            vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
            vec4 k1 = perm(b.xyxy);
            vec4 k2 = perm(k1.xyxy + b.zzww);
            vec4 c = k2 + a.zzzz;
            vec4 k3 = perm(c);
            vec4 k4 = perm(c + 1.0);
            vec4 o1 = fract(k3 * (1.0 / 41.0));
            vec4 o2 = fract(k4 * (1.0 / 41.0));
            vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
            vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
            return o4.y * d.y + o4.x * (1.0 - d.y);
        }

        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          st.x *= u_resolution.x / u_resolution.y;

          float dist = distance(st, u_mouse);
          float mouseForce = exp(-dist * 2.5) * 1.5;
          
          vec2 pos = st * 1.5;
          float n = noise(vec3(pos.x, pos.y + u_time * 0.1, u_time * 0.05));
          
          float q = noise(vec3(pos + n * 2.0 + mouseForce * 2.0, u_time * 0.1));
          
          vec3 color = mix(u_color1, u_color2, q);
          color = mix(color, u_color3, noise(vec3(pos.x + q, pos.y - q, u_time * 0.15)));
          
          float vignette = smoothstep(1.5, 0.1, length(vUv - 0.5));
          
          // Increase opacity and brightness of the liquid shader to make it incredibly dense
          gl_FragColor = vec4(color * vignette * 1.2, vignette * 0.7);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let targetMouseX = 0.5, targetMouseY = 0.5;
    let mouseX = 0.5, mouseY = 0.5;

    const syncRendererSize = () => {
      const pixelRatioCap = window.innerWidth > 1024 ? 1.5 : 1.2;
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };

    syncRendererSize();

    if (supportsHover) {
      document.addEventListener('mousemove', (e) => {
        targetMouseX = e.clientX / window.innerWidth;
        targetMouseY = 1.0 - (e.clientY / window.innerHeight);
        targetMouseX *= window.innerWidth / window.innerHeight;
      });
    }

    const clock = new THREE.Clock();
    let frameId = null;
    let heroInView = true;

    function animate() {
      frameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      uniforms.u_time.value = time;
      uniforms.u_mouse.value.set(mouseX, mouseY);

      renderer.render(scene, camera);
    }

    function updateAnimationState() {
      if (prefersReducedMotion) return;

      const shouldAnimate = heroInView && !document.hidden;
      if (shouldAnimate && frameId === null) {
        animate();
      } else if (!shouldAnimate && frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    window.addEventListener('resize', syncRendererSize, { passive: true });

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
      return;
    }

    if (heroSection && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        heroInView = entry.isIntersecting;
        updateAnimationState();
      }, { rootMargin: '200px 0px' });

      observer.observe(heroSection);
    }

    document.addEventListener('visibilitychange', updateAnimationState);
    updateAnimationState();
  }

  // ─── CUSTOM CURSOR ───
  function initCursor() {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring || !supportsHover) return;

    let dx = 0, dy = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
      dx = e.clientX;
      dy = e.clientY;
    });

    function updateCursor() {
      rx += (dx - rx) * 0.15;
      ry += (dy - ry) * 0.15;
      dot.style.transform = `translate(${dx - 3}px, ${dy - 3}px)`;
      ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // Hover targets
    const hoverTargets = document.querySelectorAll('a, button, .showcase-card, .comparison-callout, .btn');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });
  }

  // ─── GLOW EFFECT ───
  function initGlowEffect() {
    const cards = document.querySelectorAll('.glow-effect');
    if (!cards.length || !supportsHover) return;

    cards.forEach(card => {
      card.addEventListener('pointermove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      });
    });
  }

  // ─── GSAP HERO ENTRANCE ───
  function initHeroAnimations() {
    gsap.set('#hero-title', { opacity: 0, y: 40, rotateX: -20 });

    const tl = gsap.timeline({ delay: 0.3 });

    tl.to('#hero-badge', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0)
      .from('#hero-badge', { y: 30 }, 0)
      .to('#hero-title', { 
        opacity: 1, y: 0, rotateX: 0, 
        duration: 1.0, 
        ease: 'back.out(1.5)' 
      }, 0.1)
      .to('#hero-subtitle', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.5)
      .from('#hero-subtitle', { y: 30 }, 0.5)
      .to('#hero-ctas', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.7)
      .from('#hero-ctas', { y: 25 }, 0.7)
      .to('#hero-proof', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.8)
      .from('#hero-proof', { y: 20 }, 0.8)
      .to('#hero-scroll', { opacity: 1, duration: 0.6 }, 1.0);
  }

  // ─── GSAP SCROLL ANIMATIONS ───
  function initScrollAnimations() {
    // Section labels, titles, subtitles
    gsap.utils.toArray('.section-label, .section-title, .section-subtitle').forEach(el => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    gsap.from('.showcase-card', {
      y: 48,
      opacity: 0,
      scale: 0.96,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.showcase-grid',
        start: 'top 82%',
      }
    });

    // Showcase callout
    gsap.from('.showcase-callout', {
      y: 30,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.showcase-callout',
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });

    // Problem cards
    if (window.innerWidth > 1024) {
      gsap.from('.problem-bad', {
        x: -80,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.problem-comparison',
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });
      gsap.from('.problem-good', {
        x: 80,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.problem-comparison',
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });
      gsap.from('.problem-divider', {
        opacity: 0,
        scale: 0.5,
        duration: 0.6,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: '.problem-comparison',
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });
    } else {
      gsap.from('.problem-bad, .problem-good, .problem-divider', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.problem-comparison',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    }

    // Problem items stagger
    gsap.from('.problem-item', {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.problem-items',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

    // ─── Z-AXIS TUNNEL (HOW IT WORKS) ───
    const stepsContainer = document.querySelector('.steps');
    if (stepsContainer) {
      stepsContainer.style.perspective = '1500px';
    }

    gsap.utils.toArray('.step').forEach((step, i) => {
      // Tunnel scrub effect
      if (i > 0) {
        gsap.from(step, {
          z: -800,
          y: 200,
          opacity: 0,
          rotateX: 15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 95%',
            end: 'center center',
            scrub: true,
          }
        });
      } else {
        gsap.from(step, { y: 100, opacity: 0, duration: 1, scrollTrigger: { trigger: step, start: 'top 85%' }});
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: step,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });

      tl.from(step.querySelector('.step-number-ring'), { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' })
        .from(step.querySelector('.step-content'), { x: -40, opacity: 0, duration: 0.7 }, 0.15)
        .from(step.querySelector('.step-visual'), { x: 40, opacity: 0, duration: 0.7 }, 0.25);

      const line = step.querySelector('.step-line');
      if (line) {
        tl.from(line, {
          scaleY: 0,
          transformOrigin: 'top',
          duration: 0.6,
          ease: 'power2.out',
        }, 0.3);
      }

      // Add chat simulation on step 1
      const chatMockup = step.querySelector('.step-chat-mockup');
      if (chatMockup) {
        const bubbles = gsap.utils.toArray(step.querySelectorAll('.chat-bubble:not(.chat-typing)'));
        const typing = step.querySelector('.chat-typing');
        tl.from(bubbles, {
          y: 20, opacity: 0, scale: 0.9,
          duration: 0.5, stagger: 1.0, ease: 'back.out(1.5)',
        }, "-=0.2");
        if (typing) {
          tl.to(typing, { opacity: 0, height: 0, margin: 0, padding: 0, duration: 0.3 }, "+=0.5");
        }
      }
    });

    // Comparison table
    gsap.from('.comparison-table-wrap', {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.comparison-table-wrap',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

    // Table rows stagger
    gsap.from('.comparison-table tbody tr', {
      y: 25,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.comparison-table tbody',
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });

    // Comparison callouts
    gsap.from('.comparison-callout', {
      y: 40,
      opacity: 0,
      scale: 0.9,
      duration: 0.6,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.comparison-callouts',
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });

    // CTA section
    const ctaTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.cta-inner',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
    ctaTl.from('.cta-spots', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' })
      .from('.cta-title', { y: 40, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.1)
      .from('.cta-subtitle', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.2)
      .from('.cta-form', { y: 25, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.35)
      .from('.cta-note', { opacity: 0, duration: 0.5 }, 0.5);
  }

  // ─── ANIMATED COUNTERS ───
  function initCounters() {
    const counters = document.querySelectorAll('.callout-value[data-target]');
    counters.forEach(el => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const prefix = el.getAttribute('data-prefix') || '';

      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to({ val: 0 }, {
            val: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = prefix + Math.round(this.targets()[0].val) + suffix;
            },
          });
        },
      });
    });
  }

  // ─── SHOWCASE MAGNETIC TILT ───
  function initShowcaseTilt() {
    const cards = document.querySelectorAll('.showcase-card');
    if (!supportsHover) return;

    cards.forEach(card => {
      const inner = card.querySelector('.showcase-card-inner');
      
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        inner.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.03)`;
      });
      
      card.addEventListener('mouseleave', () => {
        inner.style.transform = 'rotateY(0) rotateX(0) scale(1)';
      });
    });
  }

  // ─── NAV SCROLL BEHAVIOUR ───
  function initNav() {
    const nav = document.getElementById('nav');
    const hamburger = document.getElementById('nav-hamburger');
    const links = document.getElementById('nav-links');

    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      links.classList.toggle('active');
    });

    // Close on link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('active');
        links.classList.remove('active');
      });
    });
  }

  // ─── SMOOTH SCROLL ───
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  // ─── WAITLIST FORM ───
  function initWaitlistForm() {
    const form = document.getElementById('waitlist-form');
    const emailInput = document.getElementById('waitlist-email');
    const success = document.getElementById('waitlist-success');
    const spotsEl = document.getElementById('spots-count');

    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email) return;

      // mailto fallback
      window.location.href = `mailto:contact@viralframe.xyz?subject=Waitlist%20Request&body=Email:%20${encodeURIComponent(email)}`;

      // Show success
      form.style.display = 'none';
      success.style.display = 'flex';

      // Decrement spots
      if (spotsEl) {
        const current = parseInt(spotsEl.textContent, 10);
        if (current > 1) {
          gsap.to({ val: current }, {
            val: current - 1,
            duration: 1.2,
            ease: 'bounce.out',
            onUpdate: function () {
              spotsEl.textContent = Math.round(this.targets()[0].val);
            },
          });
        }
      }
    });
  }

  // ─── COMPARISON TABLE HIGHLIGHT ON HOVER ───
  function initTableInteractions() {
    const rows = document.querySelectorAll('.comparison-table tbody tr');
    rows.forEach(row => {
      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(139, 92, 246, 0.04)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = '';
      });
    });
  }

  // ─── PARALLAX SCROLL FOR HERO ───
  function initHeroParallax() {
    gsap.to('.hero-content', {
      y: -80,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
      },
    });
  }

  // ─── CINEMATIC PRELOADER ───
  function initPreloader() {
    const counter = document.querySelector('.preloader-counter');
    const preloader = document.querySelector('.preloader');
    if (!counter || !preloader) {
      initHeroAnimations();
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }
    
    document.body.style.overflow = 'hidden';

    let count = 0;
    const interval = setInterval(() => {
      count += Math.floor(Math.random() * 8) + 1;
      if (count >= 100) {
        count = 100;
        clearInterval(interval);
        setTimeout(() => {
          preloader.classList.add('loaded');
          setTimeout(() => {
            preloader.style.display = 'none';
            document.body.style.overflow = '';
            initHeroAnimations();
            requestAnimationFrame(() => ScrollTrigger.refresh());
          }, 1200);
        }, 100);
      }
      counter.textContent = count.toString().padStart(3, '0');
    }, 40);
  }

  // ─── MASSIVE MARQUEES ───
  function initMarquees() {
    const primaryTrack = document.querySelector('.primary-track');
    const reverseTrack = document.querySelector('.reverse-track');
    
    if (primaryTrack) {
      primaryTrack.innerHTML += primaryTrack.innerHTML + primaryTrack.innerHTML;
      gsap.to(primaryTrack, {
        xPercent: -33.33,
        ease: "none",
        scrollTrigger: {
          trigger: primaryTrack.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    if (reverseTrack) {
      reverseTrack.innerHTML += reverseTrack.innerHTML + reverseTrack.innerHTML;
      gsap.fromTo(reverseTrack, {xPercent: -33.33}, {
        xPercent: 0,
        ease: "none",
        scrollTrigger: {
          trigger: reverseTrack.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    const clamp = gsap.utils.clamp(-15, 15);
    const skewTo = gsap.quickTo('.marquee-text', 'skewX', {
      duration: 0.45,
      ease: 'power3.out',
    });

    ScrollTrigger.create({
      onUpdate: (self) => {
        skewTo(clamp(Math.round(self.getVelocity() / 300)));
      }
    });
  }

  // ─── INIT ALL ───
  function init() {
    initHeroScene();
    initCursor();
    initGlowEffect();
    initNav();
    initPreloader();
    
    // We defer standard smooth scroll setup 
    requestAnimationFrame(() => {
      initSmoothScroll();
      initShowcaseTilt();
      initHeroParallax();
      initTableInteractions();
      initWaitlistForm();
      initMarquees();
      initScrollAnimations();
      initCounters();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
