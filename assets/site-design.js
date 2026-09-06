/* Progressive enhancement: the editorial gallery remains complete without JS. */
(() => {
  const story=document.querySelector('[data-ring-story]');
  if(story){
    const cards=[...story.querySelectorAll('.ring-story__card')];
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    let queued=false;
    function measure(){
      const nav=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))||88;
      const viewport=document.documentElement.clientHeight;
      cards.forEach((card,i)=>{
        // Tall cards scroll fully into view before they pin, even in landscape.
        card.style.setProperty('--story-top',`${Math.min(nav+16,viewport-card.offsetHeight-16)}px`);
        card.style.zIndex=String(i+1);
      });
      schedule();
    }
    function update(){
      queued=false;
      if(reduce.matches){cards.forEach(c=>{c.style.removeProperty('--scale');c.style.removeProperty('--shade');});return;}
      cards.forEach((card,i)=>{
        const next=cards[i+1];
        const top=parseFloat(card.style.getPropertyValue('--story-top'))||0;
        const progress=next?Math.max(0,Math.min(1,1-(next.getBoundingClientRect().top-top)/Math.max(1,Math.min(card.offsetHeight,innerHeight)*.8))):0;
        card.style.setProperty('--scale',String(1-progress*.035));
        card.style.setProperty('--shade',String(progress*.11));
      });
    }
    const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);reduce.addEventListener('change',schedule);
    const observer=new ResizeObserver(measure);cards.forEach(card=>observer.observe(card));
    measure();
  }
  // Keep the mobile menu's accessible state and scroll behavior synchronized.
  const burger=document.getElementById('navBurger'),links=document.getElementById('navLinks');
  if(burger&&links){
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&burger.getAttribute('aria-expanded')==='true'){burger.click();burger.focus();}});
    addEventListener('resize',()=>{if(innerWidth>1120&&burger.getAttribute('aria-expanded')==='true'){burger.click();}});
  }
})();
