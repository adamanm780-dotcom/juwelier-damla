/* Local inquiry preparation. No delivery address exists yet; never claim a send. */
(() => {
  const form=document.getElementById('damlaContact');
  if(!form)return;
  const name=document.getElementById('inquiryName');
  const reply=document.getElementById('inquiryReply');
  const message=document.getElementById('inquiryMessage');
  const result=document.getElementById('inquiryResult');
  const summary=document.getElementById('inquirySummary');
  const status=document.getElementById('inquiryStatus');
  message.addEventListener('input',()=>{document.getElementById('inquiryCount').textContent=message.value.length;message.setCustomValidity('');});
  [name,reply].forEach(input=>input.addEventListener('input',()=>input.setCustomValidity('')));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    name.value=name.value.trim();reply.value=reply.value.trim();message.value=message.value.trim();
    const address=reply.value;
    const valid=address.includes('@')?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address):/^[+\d\s()./–-]+$/.test(address)&&address.replace(/\D/g,'').length>=6;
    reply.setCustomValidity(valid?'':'Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer ein.');
    message.setCustomValidity(message.value.length>=10?'':'Beschreiben Sie Ihren Wunsch bitte mit mindestens 10 Zeichen.');
    if(!form.reportValidity())return;
    const topic=form.querySelector('input[name="topic"]:checked').value;
    summary.textContent=`Anfrage an Juwelier Damla\n\nThema: ${topic}\nName: ${name.value}\nKontakt: ${address}\n\n${message.value}`;
    form.hidden=true;result.hidden=false;status.textContent='';
    document.getElementById('inquiryResultTitle').focus({preventScroll:true});
    result.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  document.getElementById('inquiryEdit').addEventListener('click',()=>{result.hidden=true;form.hidden=false;message.focus();});
  document.getElementById('inquiryCopy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(summary.textContent);status.textContent='Ihr Text wurde kopiert. Er wurde noch nicht versendet.';}
    catch{const range=document.createRange();range.selectNodeContents(summary);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Bitte kopieren Sie den markierten Text über das Menü Ihres Geräts.';}
  });
  form.hidden=false;
})();
