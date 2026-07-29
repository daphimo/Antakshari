(() => {
  const mobileQuery = window.matchMedia('(max-width: 749px)');

  const syncMenu = (footer, toggle, list) => {
    if (mobileQuery.matches) {
      toggle.setAttribute('aria-expanded', 'false');
      list.hidden = true;
    } else {
      toggle.setAttribute('aria-expanded', 'true');
      list.hidden = false;
    }

    footer.classList.add('fhf-js');
  };

  const initializeFooter = (footer) => {
    if (footer.dataset.accordionReady === 'true') return;

    footer.dataset.accordionReady = 'true';

    const menus = [...footer.querySelectorAll('.fhf-menu')];

    menus.forEach((menu) => {
      const toggle = menu.querySelector('.fhf-menu__toggle');
      const list = menu.querySelector('.fhf-menu__list');

      if (!toggle || !list) return;

      toggle.addEventListener('click', () => {
        if (!mobileQuery.matches) return;

        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        list.hidden = isOpen;
      });

      syncMenu(footer, toggle, list);
    });

    const handleBreakpointChange = () => {
      menus.forEach((menu) => {
        const toggle = menu.querySelector('.fhf-menu__toggle');
        const list = menu.querySelector('.fhf-menu__list');
        if (toggle && list) syncMenu(footer, toggle, list);
      });
    };

    mobileQuery.addEventListener('change', handleBreakpointChange);
  };

  const initializeAll = (scope = document) => {
    scope.querySelectorAll('.festive-heritage-footer').forEach(initializeFooter);
  };

  initializeAll();

  document.addEventListener('shopify:section:load', (event) => {
    initializeAll(event.target);
  });
})();
