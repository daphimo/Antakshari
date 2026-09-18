(() => {
  const init = (root) => {
    if (root.dataset.cardsReady === 'true') return;
    root.dataset.cardsReady = 'true';

    const cards = [...root.querySelectorAll('[data-card]')];
    const perPage = Math.max(1, Number.parseInt(root.dataset.perPage, 10) || 9);
    const totalPages = Math.ceil(cards.length / perPage);
    const pagination = root.querySelector('[data-pagination]');
    const loadWrap = root.querySelector('[data-load-wrap]');
    const loadButton = root.querySelector('[data-load-more]');
    const sentinel = root.querySelector('[data-load-sentinel]');
    const status = root.querySelector('[data-card-status]');
    const hashPrefix = `${root.id}-page-`;
    let page = 1;
    let observer;

    if (totalPages < 2) return;

    const show = (nextPage) => {
      page = Math.min(totalPages, Math.max(1, nextPage));
      const infinite = root.dataset.mode === 'infinite';
      cards.forEach((card, index) => {
        card.hidden = infinite ? index >= page * perPage : index < (page - 1) * perPage || index >= page * perPage;
      });
      status.textContent = infinite
        ? `${Math.min(cards.length, page * perPage)} of ${cards.length} cards shown`
        : `Page ${page} of ${totalPages}`;

      if (infinite) {
        loadWrap.hidden = page >= totalPages;
        if (loadWrap.hidden && observer) observer.disconnect();
      } else {
        pagination.hidden = false;
        pagination.replaceChildren();
        const addLink = (label, target, current = false) => {
          const element = document.createElement(current ? 'span' : 'a');
          element.textContent = label;
          if (current) element.setAttribute('aria-current', 'page');
          else element.href = `#${hashPrefix}${target}`;
          pagination.append(element);
        };
        if (page > 1) addLink('Previous', page - 1);
        for (let number = 1; number <= totalPages; number++) addLink(String(number), number, number === page);
        if (page < totalPages) addLink('Next', page + 1);
      }
    };

    if (root.dataset.mode === 'infinite') {
      loadButton.addEventListener('click', () => show(page + 1));
      show(1);
      if ('IntersectionObserver' in window && !window.Shopify?.designMode) {
        observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) show(page + 1);
        }, { rootMargin: '100px' });
        observer.observe(sentinel);
      }
    } else {
      const readHash = () => {
        const match = location.hash.match(new RegExp(`^#${hashPrefix}(\\d+)$`));
        return match ? Number(match[1]) : 1;
      };
      show(readHash());
      window.addEventListener('hashchange', () => show(readHash()));
      pagination.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (!link) return;
        const target = Number(link.hash.slice(hashPrefix.length + 1));
        if (Number.isInteger(target)) show(target);
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    document.addEventListener('shopify:block:select', (event) => {
      const index = cards.findIndex((card) => card.contains(event.target));
      if (index >= 0) show(Math.floor(index / perPage) + 1);
    });
  };

  const scan = (scope = document) => {
    if (scope.matches?.('[data-page-card-directory]')) init(scope);
    scope.querySelectorAll('[data-page-card-directory]').forEach(init);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  else scan();
  document.addEventListener('shopify:section:load', (event) => scan(event.target));
})();
