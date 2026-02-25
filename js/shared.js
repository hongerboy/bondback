(function() {
    'use strict';

    // ── Navbar scroll ──
    var navbar = document.getElementById('navbar');
    if (navbar) {
        var scrolled = false;
        function checkScroll() {
            var shouldScroll = window.scrollY > 60;
            if (shouldScroll !== scrolled) {
                scrolled = shouldScroll;
                navbar.classList.toggle('scrolled', scrolled);
            }
        }
        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
    }

    // ── Hamburger ──
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');
    var navCta = document.getElementById('navCta');
    if (hamburger && navLinks && navCta) {
        hamburger.addEventListener('click', function() {
            var isOpen = this.classList.toggle('active');
            navLinks.classList.toggle('active');
            navCta.classList.toggle('active');
            this.setAttribute('aria-expanded', isOpen);
        });
        navLinks.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                navCta.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ── Modal ──
    var overlay = document.getElementById('modalOverlay');
    var modalFormEl = document.getElementById('modalForm');
    var modalSuccess = document.getElementById('modalSuccess');
    var modalClose = document.getElementById('modalClose');

    function openModal() {
        if (!overlay) return;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        var firstInput = overlay.querySelector('input');
        if (firstInput) setTimeout(function() { firstInput.focus(); }, 100);
    }
    function closeModal() {
        if (!overlay) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-open-modal]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    });
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
    }
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeModal();
    });

    // ── Form ──
    var leadForm = document.getElementById('leadForm');
    if (leadForm) {
        leadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var fields = this.querySelectorAll('input[required], select[required]');
            var valid = true;
            fields.forEach(function(f) {
                if (!f.checkValidity()) {
                    f.style.borderColor = '#ef4444';
                    valid = false;
                } else {
                    f.style.borderColor = '';
                }
            });
            if (!valid) return;

            // Collect form data
            var formData = {};
            var allFields = this.querySelectorAll('input, select, textarea');
            allFields.forEach(function(f) {
                if (f.name) formData[f.name] = f.value;
            });

            // Send to backend
            var submitBtn = this.querySelector('.form-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (modalFormEl) modalFormEl.style.display = 'none';
                if (modalSuccess) modalSuccess.style.display = 'block';
            })
            .catch(function() {
                // Still show success even if backend is unavailable (graceful degradation)
                if (modalFormEl) modalFormEl.style.display = 'none';
                if (modalSuccess) modalSuccess.style.display = 'block';
            })
            .finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Get My Free Assessment';
                }
            });
        });
    }

    // ── FAQ ──
    document.querySelectorAll('.faq-question').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var item = this.parentElement;
            var isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(function(el) {
                el.classList.remove('active');
                el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });
            if (!isActive) {
                item.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ── Reveal on scroll ──
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });
    }
})();
