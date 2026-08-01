import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

class CompleteTheLook extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('[data-complete-the-look-add]');
    this.status = this.querySelector('[data-status]');
    this.button?.addEventListener('click', this.addAll);
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.addAll);
  }

  getMainVariantId() {
    const productComponent = this.closest('product-component');
    const variantInput = productComponent?.querySelector('product-form-component input[name="id"]');
    return variantInput?.value || this.dataset.mainVariantId;
  }

  getLines() {
    const mainVariantId = this.getMainVariantId();
    if (!mainVariantId) return [];

    const variantIds = [
      mainVariantId,
      ...Array.from(this.querySelectorAll('[data-look-variant-id]'))
        .filter((item) => item.dataset.lookAvailable === 'true')
        .map((item) => item.dataset.lookVariantId),
    ];

    return [...new Set(variantIds.filter(Boolean))].map((id) => ({ id: Number(id), quantity: 1 }));
  }

  addAll = async () => {
    if (!this.button || this.button.disabled || this.button.hasAttribute('aria-busy')) return;

    const items = this.getLines();
    if (!items.length) {
      this.showError('No available products were found.');
      return;
    }

    this.button.disabled = true;
    this.button.setAttribute('aria-busy', 'true');
    this.status?.classList.add('visually-hidden');

    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((component) => component.dataset.sectionId)
      .filter(Boolean);
    const deferred = CartLinesUpdateEvent.createPromise();
    const lines = items.map((item) => ({ merchandiseId: String(item.id), quantity: item.quantity }));

    this.dispatchEvent(new CartLinesUpdateEvent({
      action: 'add',
      context: 'product',
      lines,
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
          items,
          sections: [...new Set(sectionIds)].join(','),
          sections_url: window.location.pathname,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.status) {
        throw new Error(result.description || result.message || 'Unable to add the complete look.');
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
          source: 'complete-the-look',
          sourceId: this.id,
          itemCount: items.length,
          sections: result.sections,
          didError: false,
        },
      });

      if (this.status) {
        this.status.textContent = 'Complete look added to cart.';
        this.status.removeAttribute('data-error');
        this.status.classList.remove('visually-hidden');
      }

      const cartDrawer = document.querySelector('theme-drawer#cart-drawer');
      if (typeof cartDrawer?.open === 'function') {
        requestAnimationFrame(() => cartDrawer.open());
      }
    } catch (error) {
      deferred.reject(error);
      const message = error instanceof Error ? error.message : 'Unable to add the complete look.';
      this.dispatchEvent(new CartErrorEvent({ error: message, code: 'INVALID' }));
      this.showError(message);
    } finally {
      this.button.removeAttribute('aria-busy');
      this.button.disabled = false;
    }
  };

  showError(message) {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.error = 'true';
    this.status.classList.remove('visually-hidden');
  }
}

if (!customElements.get('complete-the-look')) {
  customElements.define('complete-the-look', CompleteTheLook);
}
