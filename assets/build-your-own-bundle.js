import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

class BuildYourOwnBundle extends HTMLElement {
  constructor() {
    super();
    this.requiredQuantity = Number.parseInt(this.dataset.requiredQuantity || '1', 10);
    this.currency = this.dataset.currency || 'USD';
    this.cards = [...this.querySelectorAll('[data-product-card]')];
    this.addButton = this.querySelector('[data-add-button]');
    this.message = this.querySelector('[data-message]');
    this.status = this.querySelector('[data-status]');
    this.count = this.querySelector('[data-count]');
    this.total = this.querySelector('[data-total]');
    this.progress = this.querySelector('[data-progress]');
    this.progressBar = this.querySelector('[data-progress-bar]');
    this.selectedList = this.querySelector('[data-selected-list]');
    this.isSubmitting = false;
  }

  connectedCallback() {
    this.addEventListener('click', this.handleClick);
    this.addEventListener('change', this.handleChange);
    this.addButton?.addEventListener('click', this.addBundle);
    this.update();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('change', this.handleChange);
    this.addButton?.removeEventListener('click', this.addBundle);
  }

  handleClick = (event) => {
    const button = event.target.closest('[data-quantity-minus], [data-quantity-plus]');
    if (!button) return;

    const card = button.closest('[data-product-card]');
    const input = card?.querySelector('[data-quantity]');
    if (!input) return;
    this.clearError();

    const direction = button.hasAttribute('data-quantity-plus') ? 1 : -1;
    const current = this.normalizeQuantity(input.value);
    const availableSpace = Math.max(0, this.requiredQuantity - this.getSelectedQuantity());
    const next = direction > 0 ? current + Math.min(1, availableSpace) : current - 1;

    input.value = String(Math.max(0, next));
    this.update();
  };

  handleChange = (event) => {
    const card = event.target.closest('[data-product-card]');
    if (!card) return;
    this.clearError();

    if (event.target.matches('[data-quantity]')) {
      const input = event.target;
      const otherQuantity = this.getSelectedQuantity() - this.normalizeQuantity(input.value);
      input.value = String(Math.min(this.normalizeQuantity(input.value), this.requiredQuantity - otherQuantity));
    }

    if (event.target.matches('[data-variant]')) {
      const option = event.target.selectedOptions?.[0];
      const formattedPrice = option?.dataset.priceFormatted;
      const price = card.querySelector('[data-card-price]');
      if (price && formattedPrice) price.textContent = formattedPrice;
    }

    this.update();
  };

  normalizeQuantity(value) {
    const parsed = Number.parseInt(value || '0', 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  getSelectedQuantity() {
    return this.cards.reduce((total, card) => {
      return total + this.normalizeQuantity(card.querySelector('[data-quantity]')?.value);
    }, 0);
  }

  getVariant(card) {
    const control = card.querySelector('[data-variant]');
    if (!control) return null;

    if (control instanceof HTMLSelectElement) {
      const option = control.selectedOptions[0];
      return {
        id: control.value,
        price: Number.parseInt(option?.dataset.price || '0', 10),
        available: option?.dataset.available === 'true',
        title: option?.textContent?.trim() || '',
      };
    }

    return {
      id: control.value,
      price: Number.parseInt(control.dataset.price || '0', 10),
      available: control.dataset.available === 'true',
      title: '',
    };
  }

  getLines() {
    return this.cards.flatMap((card) => {
      const quantity = this.normalizeQuantity(card.querySelector('[data-quantity]')?.value);
      const variant = this.getVariant(card);
      if (!quantity || !variant?.id || !variant.available) return [];

      return [{
        id: Number(variant.id),
        quantity,
        price: variant.price,
        title: card.querySelector('.byob-card__title')?.textContent?.trim() || '',
        variantTitle: variant.title,
      }];
    });
  }

  formatMoney(cents) {
    return new Intl.NumberFormat(document.documentElement.lang || 'en', {
      style: 'currency',
      currency: this.currency,
    }).format(cents / 100);
  }

  update() {
    const selectedQuantity = this.getSelectedQuantity();
    const lines = this.getLines();
    const totalPrice = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const isComplete = selectedQuantity === this.requiredQuantity && lines.length > 0;

    if (this.count) this.count.textContent = `${selectedQuantity} / ${this.requiredQuantity} selected`;
    if (this.total) this.total.textContent = this.formatMoney(totalPrice);
    if (this.progress) this.progress.setAttribute('aria-valuenow', String(selectedQuantity));
    if (this.progressBar) {
      this.progressBar.style.width = `${Math.min(100, (selectedQuantity / this.requiredQuantity) * 100)}%`;
    }
    if (this.addButton) this.addButton.disabled = !isComplete || this.isSubmitting;

    this.cards.forEach((card) => {
      const input = card.querySelector('[data-quantity]');
      const minus = card.querySelector('[data-quantity-minus]');
      const plus = card.querySelector('[data-quantity-plus]');
      const quantity = this.normalizeQuantity(input?.value);
      if (minus) minus.disabled = this.isSubmitting || quantity === 0 || input?.disabled;
      if (plus) plus.disabled = this.isSubmitting || selectedQuantity >= this.requiredQuantity || input?.disabled;
    });

    if (this.selectedList) {
      this.selectedList.innerHTML = lines.map((line) => {
        const variant = line.variantTitle && !line.variantTitle.startsWith('Default Title')
          ? `<small>${this.escapeHtml(line.variantTitle)}</small>`
          : '';
        return `<li class="byob__selected-item"><span>${line.quantity} × ${this.escapeHtml(line.title)} ${variant}</span><span>${this.formatMoney(line.price * line.quantity)}</span></li>`;
      }).join('');
    }

    if (this.message && !this.message.classList.contains('byob__message--error')) {
      const remaining = this.requiredQuantity - selectedQuantity;
      this.message.textContent = isComplete
        ? 'Your bundle is ready.'
        : `Choose ${remaining} more ${remaining === 1 ? 'item' : 'items'} to continue.`;
    }
  }

  escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }

  setError(message) {
    if (this.message) {
      this.message.textContent = message;
      this.message.classList.add('byob__message--error');
    }
    if (this.status) this.status.textContent = message;
  }

  clearError() {
    this.message?.classList.remove('byob__message--error');
  }

  addBundle = async () => {
    const lines = this.getLines();
    const selectedQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    if (this.isSubmitting || selectedQuantity !== this.requiredQuantity) return;

    this.isSubmitting = true;
    this.message?.classList.remove('byob__message--error');
    this.addButton?.setAttribute('aria-busy', 'true');
    this.update();

    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((component) => component.dataset.sectionId)
      .filter(Boolean);
    const deferred = CartLinesUpdateEvent.createPromise();

    this.dispatchEvent(new CartLinesUpdateEvent({
      action: 'add',
      context: 'product',
      lines: lines.map((line) => ({
        merchandiseId: String(line.id),
        quantity: line.quantity,
      })),
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
          items: lines.map(({ id, quantity }) => ({ id, quantity })),
          sections: [...new Set(sectionIds)].join(','),
          sections_url: window.location.pathname,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.status) {
        throw new Error(result.description || result.message || 'Unable to add this bundle to the cart.');
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
          source: 'build-your-own-bundle',
          sourceId: this.id,
          itemCount: selectedQuantity,
          sections: result.sections,
          didError: false,
        },
      });

      if (this.status) this.status.textContent = 'Bundle added to cart.';
      this.cards.forEach((card) => {
        const input = card.querySelector('[data-quantity]');
        if (input) input.value = '0';
      });
    } catch (error) {
      deferred.reject(error);
      const message = error instanceof Error ? error.message : 'Unable to add this bundle to the cart.';
      this.dispatchEvent(new CartErrorEvent({
        error: message,
        code: 'INVALID',
      }));
      this.setError(message);
    } finally {
      this.isSubmitting = false;
      this.addButton?.removeAttribute('aria-busy');
      this.update();
    }
  };
}

if (!customElements.get('build-your-own-bundle')) {
  customElements.define('build-your-own-bundle', BuildYourOwnBundle);
}
