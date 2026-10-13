/* ==========================================================================
   MoveAssist — script.js
   jQuery 3.7 + vanilla JS. Safe to run from file:/// in Chrome.
   ========================================================================== */
(function ($, window, document) {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function isDesktopNav() { return window.innerWidth > 1180; }

  function storageGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  /* ------------------------------------------------------------------
     1. Session-aware preloader (strict once-per-visit)
     ------------------------------------------------------------------ */
  (function preloader() {
    var $pre = $('#preloader');
    if (!$pre.length) { return; }

    if (storageGet('site_loaded') === null) {
      storageSet('site_loaded', 'true');
      var done = false;
      var hide = function () {
        if (done) { return; }
        done = true;
        $('#preloader').fadeOut(600, function () { $(this).remove(); });
      };
      if (document.readyState === 'complete') {
        setTimeout(hide, 700);
      } else {
        $(window).on('load', function () { setTimeout(hide, 500); });
      }
      setTimeout(hide, 4000); // safety net for slow networks
    } else {
      $('#preloader').remove();
    }
  })();

  $(function () {

    /* ------------------------------------------------------------------
       2. Header state on scroll
       ------------------------------------------------------------------ */
    var $header = $('#site-header');
    var onScrollHeader = function () {
      $header.toggleClass('is-scrolled', window.scrollY > 16);
    };
    onScrollHeader();
    $(window).on('scroll', onScrollHeader);

    /* ------------------------------------------------------------------
       3. Bulletproof services dropdown (delegated handlers)
       ------------------------------------------------------------------ */
    var closeTimer = null;

    function openDropdown($li) {
      clearTimeout(closeTimer);
      $('.has-dropdown').not($li).removeClass('is-open').find('> .dropdown-toggle').attr('aria-expanded', 'false');
      $li.addClass('is-open').find('> .dropdown-toggle').attr('aria-expanded', 'true');
    }
    function closeDropdown($li) {
      $li.removeClass('is-open').find('> .dropdown-toggle').attr('aria-expanded', 'false');
    }

    $(document).on('mouseenter', '.has-dropdown', function () {
      if (!isDesktopNav()) { return; }
      openDropdown($(this));
    });

    $(document).on('mouseleave', '.has-dropdown', function () {
      if (!isDesktopNav()) { return; }
      var $li = $(this);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { closeDropdown($li); }, 240);
    });

    $(document).on('focusin', '.has-dropdown', function () {
      if (isDesktopNav()) { openDropdown($(this)); }
    });

    $(document).on('focusout', '.has-dropdown', function () {
      var $li = $(this);
      setTimeout(function () {
        if (isDesktopNav() && !$li.find(document.activeElement).length) { closeDropdown($li); }
      }, 10);
    });

    $(document).on('click', '.dropdown-toggle', function (e) {
      var $li = $(this).closest('.has-dropdown');
      var $menu = $li.children('.dropdown');

      if (isDesktopNav()) {
        // Hover devices: let the link navigate to the services catalogue.
        if (finePointer) { return; }
        // Touch-only large screens: first tap opens, second tap navigates.
        if (!$li.hasClass('is-open')) {
          e.preventDefault();
          openDropdown($li);
        }
        return;
      }

      // Mobile drawer: accordion behaviour.
      e.preventDefault();
      var willOpen = !$li.hasClass('is-open');
      $li.toggleClass('is-open', willOpen);
      $(this).attr('aria-expanded', willOpen ? 'true' : 'false');
      $menu.stop(true, true).slideToggle(320);
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('.has-dropdown').length && isDesktopNav()) {
        $('.has-dropdown.is-open').each(function () { closeDropdown($(this)); });
      }
    });

    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') {
        $('.has-dropdown.is-open').each(function () {
          closeDropdown($(this));
          if (isDesktopNav()) { $(this).find('> .dropdown-toggle').trigger('focus'); }
        });
        closeMobileNav();
        closeModal();
      }
    });

    /* ------------------------------------------------------------------
       4. Mobile navigation drawer
       ------------------------------------------------------------------ */
    function closeMobileNav() {
      $('body').removeClass('nav-open');
      $('.nav-burger').attr({ 'aria-expanded': 'false', 'aria-label': 'Open menu' });
    }

    $(document).on('click', '.nav-burger', function () {
      var open = !$('body').hasClass('nav-open');
      $('body').toggleClass('nav-open', open);
      $(this).attr({ 'aria-expanded': open ? 'true' : 'false', 'aria-label': open ? 'Close menu' : 'Open menu' });
    });

    $(document).on('click', '.nav-backdrop', closeMobileNav);
    $(document).on('click', '.main-nav a:not(.dropdown-toggle)', function () {
      if (!isDesktopNav()) { closeMobileNav(); }
    });

    var lastDesktop = isDesktopNav();
    $(window).on('resize', function () {
      var nowDesktop = isDesktopNav();
      if (nowDesktop !== lastDesktop) {
        $('.dropdown').removeAttr('style');
        $('.has-dropdown').removeClass('is-open');
        closeMobileNav();
        lastDesktop = nowDesktop;
      }
    });

    /* ------------------------------------------------------------------
       5. Ambient canvas: cursor glow + slow floating geometry
       ------------------------------------------------------------------ */
    (function ambient() {
      if (reduceMotion) { return; }
      var canvas = document.createElement('canvas');
      canvas.id = 'ambient-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(canvas, document.body.firstChild);
      var ctx = canvas.getContext('2d');
      if (!ctx) { return; }

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = 0, h = 0;
      var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
      var shapes = [];
      var running = true;

      function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function makeShapes() {
        shapes = [];
        var count = w < 700 ? 6 : 11;
        var kinds = ['ring', 'tag', 'diamond', 'ring', 'cross', 'tag'];
        for (var i = 0; i < count; i++) {
          shapes.push({
            kind: kinds[i % kinds.length],
            x: Math.random() * w,
            y: Math.random() * h,
            size: 14 + Math.random() * 34,
            vx: (Math.random() - 0.5) * 0.12,
            vy: (Math.random() - 0.5) * 0.1,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.0016,
            alpha: 0.05 + Math.random() * 0.06,
            gold: Math.random() > 0.6
          });
        }
      }

      function drawShape(s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.lineWidth = 1;
        ctx.strokeStyle = s.gold ? 'rgba(168,122,38,' + (s.alpha * 1.4) + ')' : 'rgba(20,33,61,' + s.alpha + ')';
        var r = s.size;
        ctx.beginPath();
        if (s.kind === 'ring') {
          ctx.arc(0, 0, r, 0, Math.PI * 2);
        } else if (s.kind === 'diamond') {
          ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
        } else if (s.kind === 'cross') {
          ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
        } else {
          var tw = r * 1.1, th = r * 1.5, rad = r * 0.22;
          ctx.moveTo(-tw / 2 + rad, -th / 2);
          ctx.lineTo(tw / 2 - rad, -th / 2);
          ctx.quadraticCurveTo(tw / 2, -th / 2, tw / 2, -th / 2 + rad);
          ctx.lineTo(tw / 2, th / 2 - rad);
          ctx.quadraticCurveTo(tw / 2, th / 2, tw / 2 - rad, th / 2);
          ctx.lineTo(-tw / 2 + rad, th / 2);
          ctx.quadraticCurveTo(-tw / 2, th / 2, -tw / 2, th / 2 - rad);
          ctx.lineTo(-tw / 2, -th / 2 + rad);
          ctx.quadraticCurveTo(-tw / 2, -th / 2, -tw / 2 + rad, -th / 2);
          ctx.moveTo(r * 0.12, -th / 2 + r * 0.32);
          ctx.arc(0, -th / 2 + r * 0.32, r * 0.12, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.restore();
      }

      function frame() {
        if (!running) { return; }
        ctx.clearRect(0, 0, w, h);

        if (mouse.active) {
          mouse.x += (mouse.tx - mouse.x) * 0.08;
          mouse.y += (mouse.ty - mouse.y) * 0.08;
          var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 360);
          g.addColorStop(0, 'rgba(227,194,126,0.16)');
          g.addColorStop(0.45, 'rgba(227,194,126,0.05)');
          g.addColorStop(1, 'rgba(227,194,126,0)');
          ctx.fillStyle = g;
          ctx.fillRect(mouse.x - 360, mouse.y - 360, 720, 720);
        }

        for (var i = 0; i < shapes.length; i++) {
          var s = shapes[i];
          s.x += s.vx;
          s.y += s.vy;
          s.rot += s.vr;
          if (mouse.active) {
            var dx = s.x - mouse.x, dy = s.y - mouse.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 0.1) {
              s.x += (dx / dist) * 0.35;
              s.y += (dy / dist) * 0.35;
            }
          }
          if (s.x < -80) { s.x = w + 60; }
          if (s.x > w + 80) { s.x = -60; }
          if (s.y < -80) { s.y = h + 60; }
          if (s.y > h + 80) { s.y = -60; }
          drawShape(s);
        }
        window.requestAnimationFrame(frame);
      }

      resize();
      makeShapes();
      window.requestAnimationFrame(frame);

      $(window).on('resize', function () { resize(); makeShapes(); });
      if (finePointer) {
        $(document).on('mousemove', function (e) {
          mouse.tx = e.clientX;
          mouse.ty = e.clientY;
          if (!mouse.active) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }
        });
        $(document).on('mouseleave', function () { mouse.active = false; });
      }
      document.addEventListener('visibilitychange', function () {
        var wasRunning = running;
        running = !document.hidden;
        if (running && !wasRunning) { window.requestAnimationFrame(frame); }
      });
    })();

    /* Card spotlight follows cursor */
    if (finePointer) {
      $(document).on('mousemove', '.spotlight', function (e) {
        var r = this.getBoundingClientRect();
        this.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        this.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    }

    /* ------------------------------------------------------------------
       6. Magnetic + liquid-glow buttons
       ------------------------------------------------------------------ */
    if (finePointer && !reduceMotion) {
      $(document).on('mousemove', '.btn', function (e) {
        var r = this.getBoundingClientRect();
        this.style.setProperty('--bx', (e.clientX - r.left) + 'px');
        this.style.setProperty('--by', (e.clientY - r.top) + 'px');
        if ($(this).hasClass('btn-magnetic')) {
          var mx = (e.clientX - (r.left + r.width / 2)) * 0.22;
          var my = (e.clientY - (r.top + r.height / 2)) * 0.32;
          this.style.transform = 'translate(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px)';
        }
      });
      $(document).on('mouseleave', '.btn-magnetic', function () {
        this.style.transform = '';
      });
    }

    /* ------------------------------------------------------------------
       7. Scroll reveals with staggered grids
       ------------------------------------------------------------------ */
    $('.stagger').each(function () {
      $(this).children().each(function (i) {
        this.style.transitionDelay = Math.min(i * 90, 720) + 'ms';
      });
    });

    var revealSel = '.reveal-fade, .reveal-slide-up, .reveal-scale, .year-track';
    if ('IntersectionObserver' in window && !reduceMotion) {
      var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      $(revealSel).each(function () { revealObs.observe(this); });
    } else {
      $(revealSel).addClass('is-visible');
    }

    /* ------------------------------------------------------------------
       8. Animated statistic counters
       ------------------------------------------------------------------ */
    function runCounter(el) {
      var $el = $(el);
      var target = parseFloat($el.data('count')) || 0;
      var prefix = $el.data('prefix') || '';
      var suffix = $el.data('suffix') || '';
      if (reduceMotion || target === 0) { $el.text(prefix + target + suffix); return; }
      var start = null, duration = 1800;
      function step(ts) {
        if (!start) { start = ts; }
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        $el.text(prefix + Math.round(target * eased) + suffix);
        if (p < 1) { window.requestAnimationFrame(step); }
      }
      window.requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var countObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCounter(entry.target); countObs.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      $('[data-count]').each(function () { countObs.observe(this); });
    } else {
      $('[data-count]').each(function () { runCounter(this); });
    }

    /* ------------------------------------------------------------------
       9. FAQ accordion (single open per list)
       ------------------------------------------------------------------ */
    $(document).on('click', '.faq-question', function () {
      var $item = $(this).closest('.faq-item');
      var $list = $item.closest('.faq-list');
      var isOpen = $item.hasClass('is-open');

      $list.find('.faq-item.is-open').not($item).each(function () {
        $(this).removeClass('is-open').find('.faq-question').attr('aria-expanded', 'false');
        $(this).find('.faq-answer').stop(true, true).slideUp(380);
      });

      $item.toggleClass('is-open', !isOpen);
      $(this).attr('aria-expanded', !isOpen ? 'true' : 'false');
      $item.find('.faq-answer').stop(true, true).slideToggle(380);
    });

    /* ------------------------------------------------------------------
       10. Before / after comparison slider
       ------------------------------------------------------------------ */
    $(document).on('input change', '.compare-range', function () {
      $(this).closest('.compare')[0].style.setProperty('--pos', this.value + '%');
    });

    /* ------------------------------------------------------------------
       11. Editorial service list: floating image preview
       ------------------------------------------------------------------ */
    (function servicePreview() {
      var $preview = $('.svc-preview');
      if (!$preview.length || !finePointer) { return; }
      var $img = $preview.find('img');
      var pos = { x: 0, y: 0, tx: 0, ty: 0 };
      var active = false, raf = null;

      function loop() {
        pos.x += (pos.tx - pos.x) * 0.14;
        pos.y += (pos.ty - pos.y) * 0.14;
        $preview[0].style.transform = 'translate3d(' + (pos.x - 150) + 'px,' + (pos.y - 190) + 'px,0) scale(' + (active ? 1 : 0.85) + ')';
        raf = active ? window.requestAnimationFrame(loop) : null;
      }

      $(document).on('mouseenter', '.svc-row', function (e) {
        var src = $(this).find('.svc-thumb img').attr('src');
        var alt = $(this).find('.svc-thumb img').attr('alt') || '';
        if (src) { $img.attr({ src: src, alt: alt }); }
        pos.x = pos.tx = e.clientX + 40;
        pos.y = pos.ty = e.clientY;
        active = true;
        $preview.addClass('is-visible');
        if (!raf) { raf = window.requestAnimationFrame(loop); }
      });
      $(document).on('mousemove', '.svc-row', function (e) {
        pos.tx = e.clientX + 40;
        pos.ty = e.clientY;
      });
      $(document).on('mouseleave', '.svc-list', function () {
        active = false;
        $preview.removeClass('is-visible');
      });
    })();

    /* ------------------------------------------------------------------
       12. Pricing builder
       Set real prices in each module's data-price attribute (0 = quoted).
       ------------------------------------------------------------------ */
    function money(n) { return '£' + n.toFixed(2).replace(/\.00$/, ''); }

    $('.module-input').each(function () {
      var price = parseFloat($(this).data('price')) || 0;
      var unit = $(this).data('unit') || '';
      var $p = $(this).closest('.module').find('.module-price');
      $p.text(price > 0 ? ('From ' + money(price) + ' ' + unit) : ('Priced on your quote' + (unit ? ', ' + unit : '')));
    });

    function updateBuilder($builder) {
      var $list = $builder.find('.summary-list').empty();
      var total = 0, anyPriced = false, anyUnpriced = false, count = 0;

      $builder.find('.module-input:checked').each(function () {
        var $m = $(this);
        var price = parseFloat($m.data('price')) || 0;
        var isAdjust = $m.data('kind') === 'adjust';
        count++;
        if (price > 0) { total += price; anyPriced = true; } else { anyUnpriced = true; }
        $('<li/>').toggleClass('is-adjust', isAdjust)
          .append($('<span/>').text($m.data('name')))
          .append($('<span/>').text(price > 0 ? money(price) : 'On quote'))
          .appendTo($list);
      });

      if (!count) {
        $list.append('<li class="summary-empty">Select the services you need.</li>');
      }

      var label = 'Priced on your quote';
      if (anyPriced && !anyUnpriced) { label = money(total); }
      else if (anyPriced && anyUnpriced) { label = 'From ' + money(total); }
      $builder.find('.summary-amount').text(count ? label : '—');
    }

    $('.builder').each(function () { updateBuilder($(this)); });
    $(document).on('change', '.module-input', function () { updateBuilder($(this).closest('.builder')); });

    $(document).on('click', '.js-builder-apply', function () {
      var $builder = $(this).closest('.builder');
      var picked = $builder.find('.module-input:checked').map(function () { return $(this).data('name'); }).get();
      var $flag = $builder.find('.builder-flag');
      if (!picked.length) { $flag.css('color', 'var(--error)').text('Choose at least one service first.'); return; }
      var text = 'Services I need: ' + picked.join(', ') + '.';
      var $target = $('#quote').find('textarea').first();
      if ($target.length) {
        var existing = $.trim($target.val());
        $target.val(existing ? existing + '\n' + text : text).trigger('input');
        $flag.css('color', 'var(--success)').text('Added to your enquiry below.');
        $('html, body').animate({ scrollTop: $('#quote').offset().top - 100 }, reduceMotion ? 0 : 900);
      } else {
        storageSet('ma_builder', text);
        window.location.href = './contact.html#quote';
      }
    });

    // Carry builder selections across to the contact page if needed.
    var carried = storageGet('ma_builder');
    if (carried && $('#quote textarea').length) {
      $('#quote textarea').first().val(carried);
      try { window.sessionStorage.removeItem('ma_builder'); } catch (e) { /* ignore */ }
    }

    /* ------------------------------------------------------------------
       13. Form validation (floating-label forms, funnel, modal)
       ------------------------------------------------------------------ */
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var phoneRe = /^[+()\d\s-]{7,20}$/;

    function validateField($input) {
      var el = $input[0];
      var $wrap = $input.closest('.field, .check-field');
      var val = $.trim($input.val() || '');
      var msg = '';

      if (el.type === 'checkbox') {
        if (el.required && !el.checked) { msg = 'Please confirm to continue.'; }
      } else if (el.required && !val) {
        msg = 'This field is required.';
      } else if (val && el.type === 'email' && !emailRe.test(val)) {
        msg = 'Enter a valid email address.';
      } else if (val && el.type === 'tel' && !phoneRe.test(val)) {
        msg = 'Enter a valid phone number.';
      } else if (val && el.minLength > 0 && val.length < el.minLength) {
        msg = 'Please add a little more detail (' + el.minLength + '+ characters).';
      }

      $wrap.toggleClass('has-error', !!msg).toggleClass('is-valid', !msg && !!val);
      $wrap.find('.field-error').text(msg);
      $input.attr('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }

    $(document).on('blur', '.js-validate input, .js-validate select, .js-validate textarea', function () {
      if (this.type !== 'radio') { validateField($(this)); }
    });
    $(document).on('input change', '.js-validate .has-error input, .js-validate .has-error select, .js-validate .has-error textarea', function () {
      validateField($(this));
    });

    function validateScope($scope) {
      var ok = true, $first = null;
      $scope.find('input, select, textarea').filter('[required]').not('[type="radio"]').each(function () {
        if (!validateField($(this))) { ok = false; if (!$first) { $first = $(this); } }
      });
      var radioNames = {};
      $scope.find('input[type="radio"][required]').each(function () { radioNames[this.name] = true; });
      $.each(radioNames, function (name) {
        if (!$scope.find('input[name="' + name + '"]:checked').length) {
          ok = false;
          $scope.find('.funnel-error').text('Please choose an option to continue.');
          if (!$first) { $first = $scope.find('input[name="' + name + '"]').first(); }
        } else {
          $scope.find('.funnel-error').text('');
        }
      });
      if ($first) { $first.trigger('focus'); }
      return ok;
    }

    function showSuccess($form) {
      var $success = $form.siblings('.form-success');
      if (!$success.length) { $success = $form.parent().find('.form-success'); }
      $form.slideUp(420, function () {
        $success.addClass('is-visible');
        $success.find('h3, h2').first().attr('tabindex', '-1').trigger('focus');
      });
      $form.closest('.form-card, .modal-dialog').find('.form-intro, .funnel-progress').slideUp(300);
    }

    $(document).on('submit', '.js-validate', function (e) {
      e.preventDefault();
      var $form = $(this);
      if ($form.hasClass('funnel-form')) {
        var $active = $form.find('.funnel-step.is-active');
        if (!validateScope($active)) { return; }
        var current = $form.data('step') || 1;
        var total = $form.find('.funnel-step').length;
        if (current < total) { goToStep($form, current + 1); return; } // Enter key mid-funnel advances
      } else if (!validateScope($form)) {
        return;
      }
      /* Hook your form handler here (e.g. Formspree, Netlify Forms or your CRM):
         $.post($form.attr('action'), $form.serialize()); */
      showSuccess($form);
    });

    $(document).on('click', '.js-form-reset', function () {
      var $card = $(this).closest('.form-card, .modal-dialog, .form-wrap');
      var $form = $card.find('form.js-validate');
      $form[0].reset();
      $form.find('.has-error, .is-valid').removeClass('has-error is-valid');
      $form.find('.field-error').text('');
      $card.find('.form-success').removeClass('is-visible');
      $card.find('.form-intro, .funnel-progress').slideDown(300);
      if ($form.hasClass('funnel-form')) { goToStep($form, 1); }
      $form.slideDown(420);
    });

    /* Multi-step funnel */
    function goToStep($form, n) {
      var $steps = $form.find('.funnel-step');
      var total = $steps.length;
      n = Math.max(1, Math.min(n, total));
      $steps.removeClass('is-active').filter('[data-step="' + n + '"]').addClass('is-active');
      $form.data('step', n);
      var $card = $form.closest('.form-card');
      $card.find('.funnel-bar span').css('width', (n / total * 100) + '%');
      $card.find('.funnel-steps-label span').removeClass('is-current').eq(n - 1).addClass('is-current');
      $form.find('.funnel-prev').prop('hidden', n === 1);
      $form.find('.funnel-next').prop('hidden', n === total);
      $form.find('.funnel-submit').prop('hidden', n !== total);
    }

    $('.funnel-form').each(function () { goToStep($(this), 1); });

    $(document).on('click', '.funnel-next', function () {
      var $form = $(this).closest('.funnel-form');
      var n = $form.data('step') || 1;
      if (validateScope($form.find('.funnel-step[data-step="' + n + '"]'))) { goToStep($form, n + 1); }
    });
    $(document).on('click', '.funnel-prev', function () {
      var $form = $(this).closest('.funnel-form');
      goToStep($form, ($form.data('step') || 1) - 1);
    });
    $(document).on('change', '.route-option input', function () {
      $(this).closest('.funnel-step').find('.funnel-error').text('');
    });

    /* Preselect service on service pages */
    $('select[data-preselect]').each(function () {
      var v = $(this).data('preselect');
      if (v) { $(this).val(v); }
    });

    /* ------------------------------------------------------------------
       13b. Customer journey selector (tabs → pre-filled funnel)
       ------------------------------------------------------------------ */
    function activateJourney($tab, focus) {
      var $tabs = $tab.closest('.journey-tabs').find('.journey-tab');
      $tabs.removeClass('is-active').attr({ 'aria-selected': 'false', tabindex: '-1' });
      $tab.addClass('is-active').attr({ 'aria-selected': 'true', tabindex: '0' });
      $('.journey-panel').removeClass('is-active').prop('hidden', true);
      $('#' + $tab.attr('aria-controls')).addClass('is-active').prop('hidden', false);
      if (focus) { $tab.trigger('focus'); }
    }

    $(document).on('click', '.journey-tab', function () { activateJourney($(this), false); });

    $(document).on('keydown', '.journey-tab', function (e) {
      var $tabs = $(this).closest('.journey-tabs').find('.journey-tab');
      var i = $tabs.index(this);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); activateJourney($tabs.eq((i + 1) % $tabs.length), true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); activateJourney($tabs.eq((i - 1 + $tabs.length) % $tabs.length), true); }
      if (e.key === 'Home') { e.preventDefault(); activateJourney($tabs.first(), true); }
      if (e.key === 'End') { e.preventDefault(); activateJourney($tabs.last(), true); }
    });

    $(document).on('click', '.js-journey-start', function (e) {
      var route = $(this).data('route');
      var $form = $('#quote .funnel-form');
      if (!$form.length) { return; } // no funnel on this page: follow the link
      e.preventDefault();
      var $radio = $form.find('input[name="route"]').filter(function () { return this.value === route; });
      if ($radio.length) {
        $radio.prop('checked', true).trigger('change');
        goToStep($form, 2);
      }
      $('html, body').animate({ scrollTop: $('#quote').offset().top - 100 }, reduceMotion ? 0 : 900, function () {
        $form.find('.funnel-step.is-active').find('select, input').first().trigger('focus');
      });
    });

    /* ------------------------------------------------------------------
       14. Quick-inquiry modal
       ------------------------------------------------------------------ */
    var lastFocus = null;
    function openModal(id) {
      var $m = $('#' + id);
      if (!$m.length) { return; }
      lastFocus = document.activeElement;
      $m.addClass('is-open').attr('aria-hidden', 'false');
      $('body').addClass('modal-open');
      setTimeout(function () { $m.find('input, select, textarea, button').filter(':visible').first().trigger('focus'); }, 60);
    }
    function closeModal() {
      var $m = $('.modal.is-open');
      if (!$m.length) { return; }
      $m.removeClass('is-open').attr('aria-hidden', 'true');
      $('body').removeClass('modal-open');
      if (lastFocus) { $(lastFocus).trigger('focus'); }
    }
    $(document).on('click', '[data-modal-open]', function (e) {
      e.preventDefault();
      openModal($(this).data('modal-open'));
    });
    $(document).on('click', '[data-modal-close]', closeModal);
    $(document).on('keydown', '.modal.is-open', function (e) {
      if (e.key !== 'Tab') { return; }
      var $f = $(this).find('a[href], button, input, select, textarea').filter(':visible');
      if (!$f.length) { return; }
      var first = $f[0], last = $f[$f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* ------------------------------------------------------------------
       15. Filters (services catalogue + journal)
       ------------------------------------------------------------------ */
    $(document).on('click', '.filter-btn', function () {
      var $btn = $(this);
      var filter = $btn.data('filter');
      var $scope = $($btn.closest('.filter-bar').data('target'));
      $btn.addClass('is-active').attr('aria-pressed', 'true').siblings().removeClass('is-active').attr('aria-pressed', 'false');
      $scope.children('[data-cat]').each(function () {
        var cats = String($(this).data('cat')).split(' ');
        var show = filter === 'all' || $.inArray(filter, cats) > -1;
        $(this).toggleClass('is-filtered-out', !show);
        if (show) {
          $(this).removeClass('is-filtering-in');
          void this.offsetWidth;
          $(this).addClass('is-filtering-in');
        }
      });
      var visible = $scope.children('[data-cat]').not('.is-filtered-out').length;
      $scope.siblings('.filter-empty').toggle(visible === 0);
    });

    /* ------------------------------------------------------------------
       16. Comparison matrix column highlight + pin
       ------------------------------------------------------------------ */
    $(document).on('mouseenter', '.matrix td, .matrix thead th', function () {
      var idx = $(this).index();
      if (idx === 0) { return; }
      $(this).closest('table').find('tr').each(function () { $(this).children().eq(idx).addClass('col-hover'); });
    });
    $(document).on('mouseleave', '.matrix td, .matrix thead th', function () {
      $(this).closest('table').find('.col-hover').removeClass('col-hover');
    });
    $(document).on('click', '.matrix thead th', function () {
      var idx = $(this).index();
      if (idx === 0) { return; }
      var $t = $(this).closest('table');
      var already = $(this).hasClass('col-pinned');
      $t.find('.col-pinned').removeClass('col-pinned');
      $t.find('thead th').attr('aria-pressed', 'false');
      if (!already) {
        $t.find('tr').each(function () { $(this).children().eq(idx).addClass('col-pinned'); });
        $(this).attr('aria-pressed', 'true');
      }
    });

    /* ------------------------------------------------------------------
       17. Article table of contents scroll-spy + progress
       ------------------------------------------------------------------ */
    (function toc() {
      var $toc = $('.toc');
      if (!$toc.length) { return; }
      var $links = $toc.find('a');
      var $article = $('.prose');
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              $links.removeClass('is-active').filter('[href="#' + entry.target.id + '"]').addClass('is-active');
            }
          });
        }, { rootMargin: '-20% 0px -70% 0px' });
        $article.find('h2[id]').each(function () { obs.observe(this); });
      }
      $(window).on('scroll', function () {
        var top = $article.offset().top;
        var height = $article.outerHeight() - window.innerHeight * 0.6;
        var p = Math.max(0, Math.min(1, (window.scrollY - top + 140) / height));
        $toc.find('.toc-progress span').css('width', (p * 100) + '%');
      });
    })();

    /* ------------------------------------------------------------------
       18. Smooth in-page anchors with header offset
       ------------------------------------------------------------------ */
    $(document).on('click', 'a[href^="#"]:not([href="#"])', function (e) {
      var id = $(this).attr('href');
      var $target = $(id);
      if (!$target.length) { return; }
      e.preventDefault();
      $('html, body').animate({ scrollTop: $target.offset().top - 100 }, reduceMotion ? 0 : 900);
      if (window.history && window.history.pushState) { window.history.pushState(null, '', id); }
    });

    /* ------------------------------------------------------------------
       19. Instagram feed simulation ("live" refresh)
       ------------------------------------------------------------------ */
    (function instaLive() {
      var $grid = $('.insta-grid');
      if (!$grid.length || reduceMotion) { return; }
      setInterval(function () {
        if (document.hidden) { return; }
        var $items = $grid.children('.insta-item');
        var $last = $items.last();
        $items.removeClass('is-new');
        $last.detach().prependTo($grid).addClass('is-new');
      }, 9000);
    })();

    /* ------------------------------------------------------------------
       20. WhatsApp tooltip intro + misc
       ------------------------------------------------------------------ */
    setTimeout(function () {
      var $wa = $('.wa-float');
      $wa.addClass('show-tip');
      setTimeout(function () { $wa.removeClass('show-tip'); }, 3200);
    }, 3500);

    $('.js-year').text(new Date().getFullYear());

    /* Image fallback: graceful branded placeholder if a remote photo fails */
    function markFallback(img) { $(img).closest('.media, .compare').addClass('media-fallback'); }
    $('img').each(function () {
      if (this.complete && this.naturalWidth === 0 && this.getAttribute('src')) { markFallback(this); }
      else { $(this).one('error', function () { markFallback(this); }); }
    });

    /* Newsletter */
    $(document).on('submit', '.js-newsletter', function (e) {
      e.preventDefault();
      var $f = $(this);
      var $in = $f.find('input[type="email"]');
      if (validateField($in)) {
        $f.find('.btn').text('Subscribed').prop('disabled', true);
        $in.prop('disabled', true);
      }
    });
  });

})(jQuery, window, document);

/* ==========================================================================
   V2 additions — story scroller, gallery lightbox, hero stage reveal
   ========================================================================== */
(function ($, window, document) {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $(function () {

    /* ---- Story scroller: buttons, drag, keyboard, progress ---- */
    $('.story').each(function () {
      var $story = $(this);
      var $track = $story.find('.story-track');
      var track = $track[0];
      if (!track) { return; }

      function step() {
        var $card = $track.children().first();
        return $card.outerWidth() + parseFloat($track.css('gap') || 24);
      }
      function progress() {
        var max = track.scrollWidth - track.clientWidth;
        var p = max > 0 ? track.scrollLeft / max : 1;
        var n = $track.children().length;
        $story.find('.story-progress span').css('width', Math.max(1 / n, p) * 100 + '%');
        $story.find('.story-btn--prev').prop('disabled', track.scrollLeft < 4);
        $story.find('.story-btn--next').prop('disabled', track.scrollLeft > max - 4);
      }
      $story.on('click', '.story-btn--next', function () { track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
      $story.on('click', '.story-btn--prev', function () { track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
      $track.on('scroll', progress);
      $(window).on('resize', progress);
      progress();

      $track.attr('tabindex', '0').on('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step() }); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step() }); }
      });

      var down = false, startX = 0, startLeft = 0, moved = false;
      $track.on('mousedown', function (e) {
        down = true; moved = false; startX = e.pageX; startLeft = track.scrollLeft;
      });
      $(document).on('mousemove', function (e) {
        if (!down) { return; }
        var dx = e.pageX - startX;
        if (Math.abs(dx) > 4) { moved = true; $track.addClass('is-dragging'); }
        track.scrollLeft = startLeft - dx;
      });
      $(document).on('mouseup', function () {
        if (!down) { return; }
        down = false;
        $track.removeClass('is-dragging');
        if (moved) {
          var s = step();
          track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: reduce ? 'auto' : 'smooth' });
        }
      });
      $track.on('click', 'a', function (e) { if (moved) { e.preventDefault(); } });
    });

    /* ---- Gallery lightbox (groups by data-lightbox) ---- */
    var $lb = null, group = [], index = 0, opener = null;
    function buildLightbox() {
      $lb = $('<div class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">' +
        '<button class="lb-btn lb-close" type="button" aria-label="Close viewer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
        '<figure><img src="" alt=""><figcaption><strong></strong><span class="lb-count"></span></figcaption></figure>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
        '</div>').appendTo('body');
    }
    function show(i) {
      index = (i + group.length) % group.length;
      var $a = $(group[index]);
      $lb.find('img').attr({ src: $a.attr('href'), alt: $a.find('img').attr('alt') || '' });
      $lb.find('figcaption strong').text($a.data('caption') || $a.find('img').attr('alt') || '');
      $lb.find('.lb-count').text((index + 1) + ' / ' + group.length);
    }
    function closeLb() {
      if (!$lb) { return; }
      $lb.removeClass('is-open');
      $('body').removeClass('lb-open');
      if (opener) { $(opener).trigger('focus'); }
    }
    $(document).on('click', '[data-lightbox]', function (e) {
      e.preventDefault();
      if (!$lb) { buildLightbox(); }
      var name = $(this).data('lightbox');
      group = $('[data-lightbox="' + name + '"]').filter(function () { return !$(this).closest('.is-filtered-out').length && !$(this).hasClass('is-filtered-out'); }).get();
      opener = this;
      show(group.indexOf(this));
      $lb.addClass('is-open');
      $('body').addClass('lb-open');
      $lb.find('.lb-close').trigger('focus');
    });
    $(document).on('click', '.lb-next', function () { show(index + 1); });
    $(document).on('click', '.lb-prev', function () { show(index - 1); });
    $(document).on('click', '.lb-close', closeLb);
    $(document).on('click', '.lightbox', function (e) { if (e.target === this) { closeLb(); } });
    $(document).on('keydown', function (e) {
      if (!$lb || !$lb.hasClass('is-open')) { return; }
      if (e.key === 'Escape') { closeLb(); }
      if (e.key === 'ArrowRight') { show(index + 1); }
      if (e.key === 'ArrowLeft') { show(index - 1); }
      if (e.key === 'Tab') {
        var $f = $lb.find('button');
        var first = $f[0], last = $f[$f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    /* ---- Hero stage settle-in ---- */
    var $stage = $('.hero2-stage');
    if ($stage.length) { setTimeout(function () { $stage.addClass('is-visible'); }, 200); }
  });
})(jQuery, window, document);

/* ==========================================================================
   V2 motion layer — page curtain, scroll progress, split headlines,
   rotating word, image wipes, parallax, hero depth, 3D tilt, cursor ring,
   scroll-velocity skew, scroll-linked van, review pause, FAQ search
   ========================================================================== */
(function ($, window, document) {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  $(function () {

    /* ---- 1. Page curtain: reveal on arrival, cover on departure ---- */
    var $curtain = $('.page-curtain');
    if (root.classList.contains('curtain-on')) {
      requestAnimationFrame(function () {
        $curtain.addClass('is-out');
        root.classList.remove('curtain-on');
        setTimeout(function () { $curtain.removeClass('is-out'); }, 950);
      });
    }
    if (!reduce) {
      $(document).on('click', 'a[href]', function (e) {
        if (e.isDefaultPrevented() || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
        var a = this, href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download') ||
            a.hasAttribute('data-modal-open') || a.hasAttribute('data-lightbox') || /^(mailto|tel|https?):/i.test(href) ||
            !/\.html(#.*)?$/i.test(href)) { return; }
        var url;
        try { url = new URL(href, window.location.href); } catch (err) { return; }
        if (url.pathname === window.location.pathname) { return; }
        e.preventDefault();
        try { sessionStorage.setItem('ma_curtain', '1'); } catch (err2) {}
        $curtain.removeClass('is-out').addClass('is-leaving');
        setTimeout(function () { window.location.href = url.href; }, 560);
      });
      $(window).on('pageshow', function (e) {
        if (e.originalEvent && e.originalEvent.persisted) { $curtain.removeClass('is-leaving is-out'); root.classList.remove('curtain-on'); }
      });
    }

    /* ---- 2. Split headline words ---- */
    function splitNode(node, counter) {
      $(node).contents().each(function () {
        if (this.nodeType === 3) {
          var parts = this.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) { return; }
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span'), wi = document.createElement('span');
            w.className = 'hw'; wi.className = 'hwi'; wi.style.setProperty('--i', counter.n++);
            wi.textContent = p; w.appendChild(wi); frag.appendChild(w);
          });
          this.parentNode.replaceChild(frag, this);
        } else if (this.nodeType === 1 && !$(this).is('.rotator, .sr-only, svg, br')) {
          splitNode(this, counter);
        }
      });
    }
    var $heads = $('h1.display-xl, h1.display-lg, h2.display-md, h2.display-lg, .footer-cta h2').not('.hsplit');
    if (!reduce && 'IntersectionObserver' in window) {
      $heads.each(function () { splitNode(this, { n: 0 }); $(this).addClass('hsplit'); });
      var headObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); headObs.unobserve(en.target); } });
      }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
      $('.hsplit').each(function () { headObs.observe(this); });
    }

    /* ---- 3. Rotating hero word ---- */
    $('.rotator').each(function () {
      var $words = $(this).children(), i = 0;
      if (reduce || $words.length < 2) { return; }
      setInterval(function () {
        if (document.hidden) { return; }
        var $cur = $words.eq(i);
        i = (i + 1) % $words.length;
        $cur.removeClass('is-active').addClass('is-leaving');
        $words.eq(i).removeClass('is-leaving').addClass('is-active');
        setTimeout(function () { $cur.removeClass('is-leaving'); }, 800);
      }, 2600);
    });

    /* ---- 4. Image wipe reveals ---- */
    if (!reduce && 'IntersectionObserver' in window) {
      var $pics = $('.pic').not('.mz .pic, .insta-item .pic, .lightbox .pic');
      $pics.addClass('rv');
      var picObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); picObs.unobserve(en.target); } });
      }, { threshold: 0.12 });
      $pics.each(function () { picObs.observe(this); });
    }

    /* ---- 5. Hero depth (mouse) ---- */
    var $stage = $('.hero2-stage');
    if ($stage.length && fine && !reduce) {
      var stageImg = $stage.find('img')[0];
      $stage.on('mousemove', function (e) {
        var r = this.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        stageImg.style.setProperty('--mx', (-nx * 18).toFixed(1) + 'px');
        stageImg.style.setProperty('--my', (-ny * 14).toFixed(1) + 'px');
        $stage.find('.fx').each(function () {
          var d = parseFloat(this.getAttribute('data-depth')) || 0.5;
          this.style.setProperty('--fx', (nx * 46 * d).toFixed(1) + 'px');
          this.style.setProperty('--fy', (ny * 26 * d).toFixed(1) + 'px');
        });
        $stage.find('.stage-chip').each(function (k) {
          var f = k ? 26 : 18;
          this.style.setProperty('--cx', (nx * f).toFixed(1) + 'px');
          this.style.setProperty('--cy', (ny * f).toFixed(1) + 'px');
        });
      }).on('mouseleave', function () {
        stageImg.style.setProperty('--mx', '0px'); stageImg.style.setProperty('--my', '0px');
        $stage.find('.stage-chip, .fx').each(function () { this.style.setProperty('--cx', '0px'); this.style.setProperty('--cy', '0px'); this.style.setProperty('--fx', '0px'); this.style.setProperty('--fy', '0px'); });
      });
    }

    /* ---- 6. 3D tilt + glare on cards ---- */
    if (fine && !reduce) {
      $('.pcard, .aud-tile, .pt-step, .post-card, .related-card, .team-card, .scope-card').addClass('tilt')
        .on('mousemove', function (e) {
          var r = this.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
          var ang = Math.min(Math.sqrt(nx * nx + ny * ny) * 14, 8);
          this.classList.add('is-tilting');
          this.style.setProperty('--rax', (-ny).toFixed(3));
          this.style.setProperty('--ray', nx.toFixed(3));
          this.style.setProperty('--ran', ang.toFixed(2) + 'deg');
          this.style.setProperty('--gx', ((nx + 0.5) * 100).toFixed(1) + '%');
          this.style.setProperty('--gy', ((ny + 0.5) * 100).toFixed(1) + '%');
        })
        .on('mouseleave', function () {
          this.classList.remove('is-tilting');
          this.style.setProperty('--ran', '0deg');
        });
    }

    /* ---- 7. Cursor ring with contextual labels ---- */
    if (fine && !reduce) {
      $('.mz').attr('data-cursor', 'View');
      $('.story-track').attr('data-cursor', 'Drag');
      $('.pcard').attr('data-cursor', 'Explore');
      $('.insta-item').attr('data-cursor', 'Open');
      var $ring = $('<div class="cursor-ring" aria-hidden="true"><span class="cursor-label"></span></div>').appendTo('body');
      var ring = $ring[0], tx = -100, ty = -100, cx = -100, cy = -100;
      var sleeping = true;
      function wake() { if (sleeping) { sleeping = false; requestAnimationFrame(follow); } }
      $(document).on('mousemove', function (e) {
        tx = e.clientX; ty = e.clientY; wake();
        if (!ring.classList.contains('is-on')) { cx = tx; cy = ty; ring.classList.add('is-on'); }
        var t = e.target, $lab = $(t).closest('[data-cursor]');
        if ($lab.length) {
          ring.classList.add('has-label'); ring.classList.remove('is-link');
          $ring.find('.cursor-label').text($lab.attr('data-cursor'));
        } else {
          ring.classList.remove('has-label');
          ring.classList.toggle('is-link', !!$(t).closest('a, button, input, select, textarea, label, [role="button"]').length);
        }
      });
      $(document).on('mouseleave', function () { ring.classList.remove('is-on'); });
      $(document).on('mousedown', function () { ring.classList.add('is-down'); }).on('mouseup', function () { ring.classList.remove('is-down'); });
      function follow() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        ring.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        if (Math.abs(tx - cx) < 0.15 && Math.abs(ty - cy) < 0.15) { sleeping = true; return; }
        requestAnimationFrame(follow);
      }
    }

    /* ---- 8. Scroll-driven effects (single rAF loop) ---- */
    var $bar = $('.scroll-progress span'), $top = $('.to-top'), ttBar = $('.tt-bar')[0];
    var pxEls = reduce ? [] : $('.hero2-stage img, .banner img, .svc-hero-art img').get();
    var runs = $('.road-run').get();
    var lastY = window.pageYOffset, skew = 0, ticking = false;

    function frame() {
      ticking = false;
      var y = window.pageYOffset, vh = window.innerHeight;
      var max = Math.max(1, document.documentElement.scrollHeight - vh), p = clamp(y / max, 0, 1);
      $bar.css('transform', 'scaleX(' + p.toFixed(4) + ')');
      $top.toggleClass('is-shown', y > 700);
      if (ttBar) { ttBar.style.strokeDashoffset = (144.5 * (1 - p)).toFixed(1); }

      if (!reduce) {
        var v = clamp((y - lastY) * 0.12, -5, 5);
        skew += (v - skew) * 0.25;
        if (Math.abs(skew) < 0.02) { skew = 0; }
        root.style.setProperty('--skew', skew.toFixed(2) + 'deg');
        if (skew !== 0) { requestTick(); }
      }
      lastY = y;

      pxEls.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) { return; }
        var off = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty('--py', clamp(-off * 46, -40, 40).toFixed(1) + 'px');
      });

      runs.forEach(function (run) {
        var r = run.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) { return; }
        var $run = $(run), track = $run.find('.rr-track')[0], van = $run.find('.rr-van')[0];
        var tw = track.clientWidth, vw = van.offsetWidth;
        var prog = clamp((vh - r.top) / (vh + r.height), 0, 1);
        var eased = reduce ? 0.5 : prog;
        var x = eased * (tw + vw) - vw;
        van.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
        var wheelR = 17 * (vw / 300), deg = (x / (2 * Math.PI * wheelR)) * 360;
        $run.find('.rr-wheel').css('transform', 'rotate(' + deg.toFixed(1) + 'deg)');
        var front = x + vw * 0.8;
        $run.find('.rr-stop').each(function () {
          this.classList.toggle('is-passed', front >= tw * parseFloat(this.getAttribute('data-at')) / 100);
        });
      });
    }
    function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    $(window).on('scroll resize', requestTick);
    frame();

    $top.on('click', function () {
      $('html, body').stop().animate({ scrollTop: 0 }, reduce ? 0 : 900);
      $('#main').attr('tabindex', '-1').trigger('focus');
    });

    /* ---- 9. Pause / play the review marquees (WCAG 2.2.2) ---- */
    $(document).on('click', '.marquee-toggle', function () {
      var $sec = $(this).closest('.t-section');
      var paused = !$sec.hasClass('is-paused');
      $sec.toggleClass('is-paused', paused);
      $(this).attr('aria-pressed', paused ? 'true' : 'false');
    });

    /* ---- 10. FAQ live search with highlighting ---- */
    $('.faq2').each(function () {
      var $sec = $(this), $items = $sec.find('.faq-item'), total = $items.length;
      $items.find('.faq-q').each(function () { $(this).data('orig', $(this).text()); });
      function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
      function html(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      $sec.find('.faq-search input').on('input', function () {
        var q = $.trim(this.value).toLowerCase(), shown = 0;
        $items.each(function () {
          var $it = $(this), $q = $it.find('.faq-q'), orig = $q.data('orig');
          var hit = !q || (orig + ' ' + $it.find('.faq-answer').text()).toLowerCase().indexOf(q) > -1;
          $it.toggleClass('is-hidden', !hit);
          if (hit) { shown++; }
          $q.html(q && hit ? html(orig).replace(new RegExp('(' + esc(html(q)) + ')', 'ig'), '<mark>$1</mark>') : html(orig));
        });
        $sec.find('.faq-count').text(q ? shown + ' of ' + total + ' questions' : total + ' questions');
        $sec.find('.faq-empty').toggleClass('is-shown', shown === 0);
      });
    });
  });
})(jQuery, window, document);

/* Signals that the scripts loaded and ran, so the safety net in <head> stays idle. */
if (window.jQuery) { jQuery(function () { window.__maReady = true; }); }
