class PremiumFaq extends HTMLElement {
  connectedCallback() {
    if (this.dataset.singleOpen !== 'true') return;
    this.addEventListener('toggle', this.handleToggle, true);
  }

  disconnectedCallback() {
    this.removeEventListener('toggle', this.handleToggle, true);
  }

  handleToggle = (event) => {
    const current = event.target;
    if (!(current instanceof HTMLDetailsElement) || !current.open || !current.matches('[data-faq-item]')) return;
    this.querySelectorAll('[data-faq-item][open]').forEach((item) => {
      if (item !== current) item.removeAttribute('open');
    });
  };
}

if (!customElements.get('premium-faq')) customElements.define('premium-faq', PremiumFaq);
