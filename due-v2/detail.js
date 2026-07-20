(() => {
  const today = new Date().getDay();
  const schoolDay = today >= 1 && today <= 5 ? today + 1 : 2;
  const pickToday = () => {
    const target = document.querySelector(`.dayTab[data-day="${schoolDay}"]`);
    if (target && !document.documentElement.dataset.dayInitialized) {
      document.documentElement.dataset.dayInitialized = '1';
      target.click();
      target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    }
  };
  const polish = () => {
    document.querySelectorAll('.dayTab').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
      btn.setAttribute('aria-label', `Xem lịch ${btn.textContent.trim()}`);
    });
    document.querySelectorAll('.mobileCourse').forEach(card => card.setAttribute('role','article'));
    const tabs = document.getElementById('mobileDayTabs');
    if (tabs) tabs.setAttribute('aria-label','Chọn ngày xem thời khóa biểu');
  };
  const observer = new MutationObserver(() => { pickToday(); polish(); });
  const start = () => {
    const tabs = document.getElementById('mobileDayTabs');
    if (tabs) observer.observe(tabs,{childList:true,subtree:true,attributes:true});
    pickToday(); polish();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
