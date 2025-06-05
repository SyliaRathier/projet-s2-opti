const modeToggle = document.getElementById('mode-toggle');
const modeIcon = document.getElementById('mode-icon');
function setDarkMode(on) {
    if (on) {
        document.body.classList.add('dark-mode');
        modeIcon.textContent = '☀️';
        localStorage.setItem('simplexe-dark', '1');
    } else {
        document.body.classList.remove('dark-mode');
        modeIcon.textContent = '🌙';
        localStorage.setItem('simplexe-dark', '0');
    }
}
modeToggle.onclick = function () {
    setDarkMode(!document.body.classList.contains('dark-mode'));
};
// Initial state from localStorage
if (localStorage.getItem('simplexe-dark') === '1') {
    setDarkMode(true);
}
