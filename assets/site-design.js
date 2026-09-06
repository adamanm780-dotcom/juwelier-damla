/* Progressive enhancement: the editorial gallery remains complete without JS. */
(() => {
  const story=document.querySelector('[data-ring-story]');
  if(story){
    const cards=[...story.querySelectorAll('.ring-story__card')];
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    const desktop=matchMedia('(min-width: 900px) and (min-height: 650px)');
    let queued=false;
    function update(){
      queued=false;
      if(reduce.matches||!desktop.matches){cards.forEach(c=>{c.style.removeProperty('--scale');c.style.removeProperty('--shade');});return;}
      const nav=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))||88;
      cards.forEach((card,i)=>{
        const next=cards[i+1];
        const progress=next?Math.max(0,Math.min(1,1-(next.getBoundingClientRect().top-nav-28)/Math.max(1,innerHeight*.75))):0;
        card.style.setProperty('--scale',String(1-progress*.035));
        card.style.setProperty('--shade',String(progress*.11));
      });
    }
    const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduce.addEventListener('change',schedule);desktop.addEventListener('change',schedule);update();
  }
  // Keep the mobile menu's accessible state and scroll behavior synchronized.
  const burger=document.getElementById('navBurger'),links=document.getElementById('navLinks');
  if(burger&&links){
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&burger.getAttribute('aria-expanded')==='true'){burger.click();burger.focus();}});
    addEventListener('resize',()=>{if(innerWidth>1120&&burger.getAttribute('aria-expanded')==='true'){burger.click();}});
  }
})();
