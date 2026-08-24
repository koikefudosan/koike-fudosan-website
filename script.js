document.addEventListener('DOMContentLoaded',()=>{const b=document.querySelector('.menu-btn'),n=document.querySelector('.nav');const close=()=>{n?.classList.remove('open');b?.setAttribute('aria-expanded','false')};if(b&&n){b.addEventListener('click',()=>{const open=n.classList.toggle('open');b.setAttribute('aria-expanded',String(open))});document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();b.focus()}})}document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',close));const emit=(name,params={})=>{if(typeof window.gtag==='function')window.gtag('event',name,params);else if(Array.isArray(window.dataLayer))window.dataLayer.push({event:name,...params})};document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.addEventListener('click',()=>emit('click_tel',{link_location:location.pathname})));document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.addEventListener('click',()=>emit('click_email',{link_location:location.pathname})));document.querySelectorAll('a[href="/contact/"]').forEach(a=>a.addEventListener('click',()=>emit('click_contact_cta',{link_location:location.pathname})));});
document.addEventListener('DOMContentLoaded',()=>{
  const lineUrl='https://line.me/R/ti/p/%40467cyghu';
  if(!document.querySelector('.line-floating-button')){
    const link=document.createElement('a');
    link.href=lineUrl;
    link.className='line-floating-button';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.setAttribute('aria-label','LINEでこいけ不動産へ無料相談');
    link.dataset.contactType='line';
    link.dataset.buttonLocation='floating';
    link.innerHTML='<span class="line-floating-icon" aria-hidden="true">LINE</span><span class="line-floating-copy"><strong>LINEで無料相談</strong><small>相続・空き家・不動産売却のご相談</small></span>';
    document.body.appendChild(link);
  }
  const emitLine=(element)=>{
    const params={button_location:element.dataset.buttonLocation||'unknown',page_path:location.pathname};
    if(typeof window.gtag==='function')window.gtag('event','line_contact_click',params);
    else if(Array.isArray(window.dataLayer))window.dataLayer.push({event:'line_contact_click',...params});
  };
  document.querySelectorAll('[data-contact-type="line"]').forEach(link=>{
    link.addEventListener('click',()=>emitLine(link));
  });
});
