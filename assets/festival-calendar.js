class FestivalCalendar extends HTMLElement {
  connectedCallback() {
    this.cards = [...this.querySelectorAll('[data-festival-card]')];
    this.updateStates();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);
    this.scheduleNextUpdate();
  }

  disconnectedCallback() {
    window.clearTimeout(this.updateTimer);
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  handleClick = (event) => {
    const card = event.target.closest('[data-festival-card]');
    if (card?.dataset.locked === 'true') event.preventDefault();
  };

  handleKeydown = (event) => {
    const card = event.target.closest('[data-festival-card]');
    if (card?.dataset.locked === 'true' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
    }
  };

  updateStates() {
    const now = Date.now();
    this.cards.forEach((card) => {
      const releaseAt = Date.parse(card.dataset.releaseDate || '');
      const locked = Number.isFinite(releaseAt) && now < releaseAt;
      card.dataset.locked = String(locked);
      card.classList.toggle('is-upcoming', locked);
      card.classList.toggle('is-live', !locked);
      card.setAttribute('aria-disabled', String(locked));
      card.tabIndex = locked || !card.hasAttribute('href') ? -1 : 0;

      const state = card.querySelector('[data-festival-state]');
      if (state) state.textContent = locked ? 'Coming up' : 'Live';
      const action = card.querySelector('[data-festival-action]');
      if (action) action.textContent = locked ? 'Available soon' : 'Explore collection';
    });
  }

  scheduleNextUpdate() {
    const now = Date.now();
    const nextRelease = this.cards
      .map((card) => Date.parse(card.dataset.releaseDate || ''))
      .filter((releaseAt) => Number.isFinite(releaseAt) && releaseAt > now)
      .sort((a, b) => a - b)[0];

    if (!nextRelease) return;
    this.updateTimer = window.setTimeout(() => {
      this.updateStates();
      this.scheduleNextUpdate();
    }, Math.min(nextRelease - now + 100, 2147483647));
  }
}

if (!customElements.get('festival-calendar')) {
  customElements.define('festival-calendar', FestivalCalendar);
}
