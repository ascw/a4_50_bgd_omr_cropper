// theme-bridge.js – listens to parent window theme changes
(function() {
    const LIGHT_CLASS = 'force-light';
    const DARK_CLASS = 'force-dark';

    function applyTheme(theme) {
        document.body.classList.remove(LIGHT_CLASS, DARK_CLASS);
        if (theme === 'light') document.body.classList.add(LIGHT_CLASS);
        else if (theme === 'dark') document.body.classList.add(DARK_CLASS);
    }

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'theme-change') {
            applyTheme(event.data.theme);
        }
    });

    // Request current theme from parent on load
    window.parent.postMessage({ type: 'theme-request' }, '*');
})();