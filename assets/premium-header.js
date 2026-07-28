class PremiumHeader {
  constructor(root) {
    this.root = root;
    this.drawer = root.querySelector('[data-header-drawer]');
    this.overlay = root.querySelector('[data-header-overlay]');
    this.openButton = root.querySelector('[data-drawer-open]');
    this.closeButton = root.querySelector('[data-drawer-close]');
    this.navItems = [...root.querySelectorAll('[data-nav-item]')];
    this.openOnHover = root.dataset.openOnHover === 'true';
    this.desktopBreakpoint = 990;
    this.hoverTimers = new WeakMap();
    this.lastFocusedElement = null;
    this.scrollFrame = null;
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;

    this.setInitialState();
    this.bindEvents();
    this.handleScroll();
  }

  setInitialState() {
    this.root.classList.remove('is-menu-open', 'is-drawer-open');
    this.overlay?.setAttribute('aria-hidden', 'true');
    this.openButton?.setAttribute('aria-expanded', 'false');

    if (this.drawer) {
      this.drawer.setAttribute('aria-hidden', 'true');
      this.drawer.setAttribute('inert', '');
    }

    this.navItems.forEach((item) => {
      item.classList.remove('is-open');
      item.querySelector('[data-nav-trigger]')?.setAttribute('aria-expanded', 'false');
    });
  }

  bindEvents() {
    this.openButton?.addEventListener('click', () => this.openDrawer(), { signal: this.signal });
    this.closeButton?.addEventListener('click', () => this.closeDrawer(), { signal: this.signal });

    this.overlay?.addEventListener(
      'click',
      () => {
        this.closeAllMenus();
        this.closeDrawer();
      },
      { signal: this.signal }
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          this.closeAllMenus();
          this.closeDrawer();
        }

        if (event.key === 'Tab' && this.root.classList.contains('is-drawer-open')) {
          this.trapDrawerFocus(event);
        }
      },
      { signal: this.signal }
    );

    document.addEventListener(
      'click',
      (event) => {
        if (!this.root.contains(event.target)) {
          this.closeAllMenus();
        }
      },
      { signal: this.signal }
    );

    window.addEventListener(
      'scroll',
      () => {
        if (this.scrollFrame) return;
        this.scrollFrame = window.requestAnimationFrame(() => {
          this.handleScroll();
          this.scrollFrame = null;
        });
      },
      { passive: true, signal: this.signal }
    );

    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth < this.desktopBreakpoint) {
          this.closeAllMenus();
        } else {
          this.closeDrawer();
        }
      },
      { signal: this.signal }
    );

    this.navItems.forEach((item, index) => this.bindNavigationItem(item, index));
  }

  bindNavigationItem(item, index) {
    const trigger = item.querySelector('[data-nav-trigger]');
    const panel = item.querySelector('[data-nav-panel]');

    if (!trigger || !panel) return;

    trigger.addEventListener(
      'click',
      (event) => {
        if (!this.isDesktop()) return;

        event.preventDefault();

        if (item.classList.contains('is-open')) {
          this.closeMenu(item);
        } else {
          this.openMenu(item);
        }
      },
      { signal: this.signal }
    );

    if (this.openOnHover) {
      item.addEventListener(
        'mouseenter',
        () => {
          if (!this.isDesktop()) return;
          window.clearTimeout(this.hoverTimers.get(item));
          const timer = window.setTimeout(() => this.openMenu(item), 100);
          this.hoverTimers.set(item, timer);
        },
        { signal: this.signal }
      );

      item.addEventListener(
        'mouseleave',
        () => {
          if (!this.isDesktop()) return;
          window.clearTimeout(this.hoverTimers.get(item));
          const timer = window.setTimeout(() => this.closeMenu(item), 180);
          this.hoverTimers.set(item, timer);
        },
        { signal: this.signal }
      );
    }

    item.addEventListener(
      'focusout',
      () => {
        window.setTimeout(() => {
          if (!item.contains(document.activeElement)) {
            this.closeMenu(item);
          }
        }, 0);
      },
      { signal: this.signal }
    );

    trigger.addEventListener(
      'keydown',
      (event) => {
        if (!this.isDesktop()) return;

        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.openMenu(item);
          this.getFocusableElements(panel)[0]?.focus();
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          this.focusTopLevelItem(index + 1);
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this.focusTopLevelItem(index - 1);
        }
      },
      { signal: this.signal }
    );

    panel.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeMenu(item);
          trigger.focus();
        }
      },
      { signal: this.signal }
    );
  }

  isDesktop() {
    return window.innerWidth >= this.desktopBreakpoint;
  }

  focusTopLevelItem(index) {
    const triggers = this.navItems
      .map((item) => item.querySelector('.premium-header__menu-link'))
      .filter(Boolean);

    if (!triggers.length) return;

    const normalizedIndex = (index + triggers.length) % triggers.length;
    this.closeAllMenus();
    triggers[normalizedIndex]?.focus();
  }

  openMenu(item) {
    if (!this.isDesktop()) return;

    this.closeDrawer();
    this.navItems.forEach((other) => {
      if (other !== item) this.closeMenu(other, false);
    });

    item.classList.add('is-open');
    item.querySelector('[data-nav-trigger]')?.setAttribute('aria-expanded', 'true');
    this.root.classList.add('is-menu-open');
    this.overlay?.setAttribute('aria-hidden', 'false');
  }

  closeMenu(item, updateRoot = true) {
    window.clearTimeout(this.hoverTimers.get(item));
    item.classList.remove('is-open');
    item.querySelector('[data-nav-trigger]')?.setAttribute('aria-expanded', 'false');

    if (updateRoot && !this.root.querySelector('[data-nav-item].is-open')) {
      this.root.classList.remove('is-menu-open');
      if (!this.root.classList.contains('is-drawer-open')) {
        this.overlay?.setAttribute('aria-hidden', 'true');
      }
    }
  }

  closeAllMenus() {
    this.navItems.forEach((item) => this.closeMenu(item, false));
    this.root.classList.remove('is-menu-open');

    if (!this.root.classList.contains('is-drawer-open')) {
      this.overlay?.setAttribute('aria-hidden', 'true');
    }
  }

  openDrawer() {
    if (!this.drawer) return;

    this.closeAllMenus();
    this.lastFocusedElement = document.activeElement;
    this.drawer.removeAttribute('inert');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.root.classList.add('is-drawer-open');
    this.overlay?.setAttribute('aria-hidden', 'false');
    this.openButton?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('premium-header-lock');

    window.requestAnimationFrame(() => {
      this.closeButton?.focus();
    });
  }

  closeDrawer() {
    if (!this.drawer) return;

    const wasOpen = this.root.classList.contains('is-drawer-open');

    this.root.classList.remove('is-drawer-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.drawer.setAttribute('inert', '');
    this.openButton?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('premium-header-lock');

    if (!this.root.classList.contains('is-menu-open')) {
      this.overlay?.setAttribute('aria-hidden', 'true');
    }

    if (wasOpen && this.lastFocusedElement instanceof HTMLElement) {
      this.lastFocusedElement.focus();
    }
  }

  trapDrawerFocus(event) {
    if (!this.drawer) return;

    const focusable = this.getFocusableElements(this.drawer);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  getFocusableElements(container) {
    return [
      ...container.querySelectorAll(
        'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
  }

  handleScroll() {
    this.root.classList.toggle('is-scrolled', window.scrollY > 10);
  }

  destroy() {
    this.abortController.abort();
    this.closeAllMenus();
    this.closeDrawer();
  }
}

const initPremiumHeaders = (scope = document) => {
  scope.querySelectorAll('[data-premium-header]').forEach((header) => {
    if (header.premiumHeaderInstance) return;
    header.premiumHeaderInstance = new PremiumHeader(header);
  });
};

document.addEventListener('DOMContentLoaded', () => initPremiumHeaders());

document.addEventListener('shopify:section:load', (event) => {
  initPremiumHeaders(event.target);
});

document.addEventListener('shopify:section:unload', (event) => {
  const header = event.target.querySelector('[data-premium-header]');
  if (!header) return;

  header.premiumHeaderInstance?.destroy();
  delete header.premiumHeaderInstance;
});
