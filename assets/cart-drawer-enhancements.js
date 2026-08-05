import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

class CartDrawerUpsells extends HTMLElement {
  connectedCallback() {
    this.viewport = this.querySelector('[data-cart-slider-viewport]');
    this.list = this.querySelector('[data-cart-slider-list]');
    this.previousButton = this.querySelector('[data-cart-slider-previous]');
    this.nextButton = this.querySelector('[data-cart-slider-next]');

    if (!this.viewport || !this.list) return;

    this.previousButton?.addEventListener('click', this.showPrevious);
    this.nextButton?.addEventListener('click', this.showNext);
    this.viewport.addEventListener('scroll', this.handleScroll, { passive: true });

    this.resizeObserver = new ResizeObserver(this.measure);
    this.resizeObserver.observe(this.viewport);
    this.mutationObserver = new MutationObserver(this.measure);
    this.mutationObserver.observe(this.list, { childList: true });
    this.measure();
  }

  disconnectedCallback() {
    window.cancelAnimationFrame(this.measureFrame);
    window.cancelAnimationFrame(this.scrollFrame);
    this.previousButton?.removeEventListener('click', this.showPrevious);
    this.nextButton?.removeEventListener('click', this.showNext);
    this.viewport?.removeEventListener('scroll', this.handleScroll);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  get slides() {
    return [...this.querySelectorAll('.cart-drawer-upsells__slide')];
  }

  measure = () => {
    window.cancelAnimationFrame(this.measureFrame);
    this.measureFrame = window.requestAnimationFrame(() => {
      if (!this.viewport) return;

      const viewportWidth = Math.max(0, Math.floor(this.viewport.getBoundingClientRect().width));
      const slideWidth = Math.floor(viewportWidth * 0.75);
      this.style.setProperty('--cart-drawer-slider-width', `${slideWidth}px`);

      const hasMultipleSlides = this.slides.length > 1;
      if (this.previousButton) this.previousButton.hidden = !hasMultipleSlides;
      if (this.nextButton) this.nextButton.hidden = !hasMultipleSlides;
      this.updateControls();
    });
  };

  getStep() {
    const firstSlide = this.slides[0];
    if (!firstSlide || !this.list) return this.viewport?.clientWidth || 0;
    const gap = Number.parseFloat(getComputedStyle(this.list).columnGap) || 0;
    return firstSlide.getBoundingClientRect().width + gap;
  }

  move = (direction) => {
    if (!this.viewport || this.slides.length < 2) return;
    const step = this.getStep();
    const currentIndex = Math.round(this.viewport.scrollLeft / step);
    const nextIndex = Math.min(this.slides.length - 1, Math.max(0, currentIndex + direction));
    this.viewport.scrollTo({ left: nextIndex * step, behavior: 'smooth' });
  };

  showPrevious = () => this.move(-1);
  showNext = () => this.move(1);

  handleScroll = () => {
    window.cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = window.requestAnimationFrame(this.updateControls);
  };

  updateControls = () => {
    if (!this.viewport || this.slides.length < 2) return;
    const atStart = this.viewport.scrollLeft <= 1;
    const atEnd = this.viewport.scrollLeft >= this.viewport.scrollWidth - this.viewport.clientWidth - 1;
    if (this.previousButton) this.previousButton.disabled = atStart;
    if (this.nextButton) this.nextButton.disabled = atEnd;
  };
}

if (!customElements.get('cart-drawer-upsells')) {
  customElements.define('cart-drawer-upsells', CartDrawerUpsells);
}

class CartDrawerUpsell extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('[data-upsell-add]');
    this.button?.addEventListener('click', this.addProduct);
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.addProduct);
  }

  addProduct = async () => {
    const variant = this.querySelector('[data-upsell-variant]');
    const variantId = variant?.value;
    if (!variantId || this.button?.hasAttribute('aria-busy')) return;

    this.button?.setAttribute('aria-busy', 'true');
    if (this.button) this.button.disabled = true;

    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((component) => component.dataset.sectionId)
      .filter(Boolean);
    const deferred = CartLinesUpdateEvent.createPromise();

    this.dispatchEvent(new CartLinesUpdateEvent({
      action: 'add',
      context: 'product',
      lines: [{ merchandiseId: String(variantId), quantity: 1 }],
      promise: deferred.promise,
    }));

    try {
      const response = await fetch(Theme.routes.cart_add_url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          items: [{ id: Number(variantId), quantity: 1 }],
          sections: [...new Set(sectionIds)].join(','),
          sections_url: window.location.pathname,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.status) {
        throw new Error(result.description || result.message || 'Unable to add this product.');
      }

      const cartResponse = await fetch(`${Theme.routes.cart_url}.js`, {
        headers: { Accept: 'application/json' },
      });
      if (!cartResponse.ok) throw new Error('Unable to refresh the cart.');
      const ajaxCart = await cartResponse.json();

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
        detail: {
          items: result.items,
          source: 'cart-drawer-upsell',
          sourceId: this.dataset.productId,
          itemCount: 1,
          sections: result.sections,
          didError: false,
        },
      });

      const status = this.querySelector('[data-upsell-status]');
      if (status) status.textContent = 'Product added to cart.';
      this.button?.removeAttribute('aria-busy');
      if (this.button) this.button.disabled = false;
    } catch (error) {
      deferred.reject(error);
      const message = error instanceof Error ? error.message : 'Unable to add this product.';
      this.dispatchEvent(new CartErrorEvent({ error: message, code: 'INVALID' }));
      const status = this.querySelector('[data-upsell-status]');
      if (status) {
        status.classList.remove('visually-hidden');
        status.textContent = message;
      }
      this.button?.removeAttribute('aria-busy');
      if (this.button) this.button.disabled = false;
    }
  };
}

if (!customElements.get('cart-drawer-upsell')) {
  customElements.define('cart-drawer-upsell', CartDrawerUpsell);
}
