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

    function getFocusableElements() {
        if (!overlay) return [];
        return Array.from(overlay.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
    }

    function openModal() {
        if (!overlay) return;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        var firstInput = overlay.querySelector('input:not([type="hidden"])');
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
        if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
            closeModal();
        }
        // Focus trap
        if (e.key === 'Tab' && overlay && overlay.classList.contains('open')) {
            var focusable = getFocusableElements();
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    });

    // ── Form validation helpers ──
    function setFieldError(field, message) {
        field.style.borderColor = '#ef4444';
        field.setAttribute('aria-invalid', 'true');
        var errorId = field.id + '-error';
        var existing = document.getElementById(errorId);
        if (!existing) {
            var errorEl = document.createElement('span');
            errorEl.id = errorId;
            errorEl.className = 'form-error';
            errorEl.setAttribute('role', 'alert');
            errorEl.textContent = message;
            field.setAttribute('aria-describedby', errorId);
            field.parentElement.appendChild(errorEl);
        } else {
            existing.textContent = message;
        }
    }

    function clearFieldError(field) {
        field.style.borderColor = '';
        field.removeAttribute('aria-invalid');
        var errorId = field.id + '-error';
        var existing = document.getElementById(errorId);
        if (existing) existing.remove();
        field.removeAttribute('aria-describedby');
    }

    // ── Form ──
    var leadForm = document.getElementById('leadForm');
    if (leadForm) {
        leadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var fields = this.querySelectorAll('input[required], select[required]');
            var valid = true;
            fields.forEach(function(f) {
                if (!f.checkValidity()) {
                    var label = f.closest('.form-group').querySelector('label');
                    var fieldName = label ? label.textContent.replace(/\s*\*\s*/, '').replace(/\s*\(optional\)\s*/, '').trim() : 'This field';
                    setFieldError(f, fieldName + ' is required');
                    valid = false;
                } else {
                    clearFieldError(f);
                }
            });

            // Validate email format if provided
            var emailField = this.querySelector('#email');
            if (emailField && emailField.value && !emailField.checkValidity()) {
                setFieldError(emailField, 'Please enter a valid email address');
                valid = false;
            }

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

            var originalBtnText = submitBtn ? submitBtn.textContent : '';

            fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(function(res) {
                if (res.ok) {
                    if (modalFormEl) modalFormEl.style.display = 'none';
                    if (modalSuccess) modalSuccess.style.display = 'block';
                } else {
                    return res.json().then(function(data) {
                        throw new Error(data.error || 'Submission failed');
                    });
                }
            })
            .catch(function(err) {
                alert('Something went wrong. Please try again.');
                console.error('Form error:', err);
            })
            .finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            });
        });

        // Clear errors on input
        leadForm.querySelectorAll('input, select').forEach(function(f) {
            f.addEventListener('input', function() {
                if (this.hasAttribute('aria-invalid')) clearFieldError(this);
            });
            f.addEventListener('change', function() {
                if (this.hasAttribute('aria-invalid')) clearFieldError(this);
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
