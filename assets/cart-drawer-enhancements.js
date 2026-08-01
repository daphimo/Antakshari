import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

class CartDrawerUpsells extends HTMLElement {
  connectedCallback() {
    this.mount();
    this.observer = new MutationObserver(this.handleMutation);
    this.observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    window.clearTimeout(this.retryTimer);
    window.cancelAnimationFrame(this.refreshFrame);
    this.observer?.disconnect();
    this.splide?.destroy(true);
    this.splide = null;
    this.root = null;
  }

  mount = () => {
    const root = this.querySelector('.cart-drawer-upsells__slider');
    if (!root || this.splide) return;
    if (typeof window.Splide === 'undefined') {
      this.retryTimer = window.setTimeout(this.mount, 100);
      return;
    }

    const slideCount = Number(root.dataset.slideCount) || root.querySelectorAll('.splide__slide:not(.is-clone)').length;

    this.splide = new window.Splide(root, {
      type: slideCount > 1 ? 'loop' : 'slide',
      perPage: 1,
      perMove: 1,
      gap: '10px',
      arrows: slideCount > 1,
      pagination: false,
      drag: slideCount > 1,
      speed: 350,
      mediaQuery: 'min',
      breakpoints: {
        420: { perPage: 1.12 },
      },
    });
    this.splide.mount();
    this.root = root;
  };

  handleMutation = (mutations) => {
    const hasRealDrawerChange = mutations.some((mutation) =>
      [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
        if (!(node instanceof Element)) return false;
        if (node.matches('.splide__slide.is-clone') || node.closest('.splide__slide.is-clone')) return false;
        return node.matches('.cart-drawer-upsells__slider, .splide__list, .splide__slide')
          || Boolean(node.querySelector('.cart-drawer-upsells__slider, .splide__list, .splide__slide'));
      })
    );
    if (!hasRealDrawerChange) return;

    window.cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = window.requestAnimationFrame(() => {
      const currentRoot = this.querySelector('.cart-drawer-upsells__slider');
      if (!currentRoot) return;

      if (this.root !== currentRoot) {
        this.splide?.destroy(true);
        this.splide = null;
        this.root = null;
        this.mount();
        return;
      }

      this.splide?.refresh();
    });
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
