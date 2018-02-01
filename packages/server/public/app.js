hljs.initHighlightingOnLoad();

const tabs = document.querySelectorAll('.tab');

for(const tab of tabs) {
  console.log('tab', tab);
  tab.addEventListener('click', () => {
    const id = tab.dataset.id;
    console.log('clicked ' + id);
    delete document.querySelector('.tab[data-active]').dataset.active;
    delete document.querySelector('.panel[data-active]').dataset.active;
    tab.dataset.active = true;
    document.querySelector(`.panel[data-id=${id}]`).dataset.active = true;
  });
}