/* Signature gallery uses existing form changes and save handling. */
(function(){
 function mount(){
  if(!globalThis.FooteraKitArt)return;
  for(const side of ['Home','Away']){
   const select=document.getElementById('identity'+side+'Pattern'),preview=document.getElementById('identity'+side+'KitPreview');
   if(!select||!preview)continue;
   const box=document.createElement('details');box.className='kit-signature-picker';box.dataset.kitSide=side;
   box.innerHTML='<summary>7 neue Signature-Designs entdecken</summary><p>Wähle dein Design. Deine Haupt- und Zweitfarbe bleiben erhalten.</p><div class="kit-design-grid"></div>';
   preview.insertAdjacentElement('afterend',box);
   const render=()=>{
    const a=document.getElementById('identity'+side+'Primary').value||'#173e42',b=document.getElementById('identity'+side+'Secondary').value||'#d9f099';
    const focusId=document.activeElement?.closest('[data-kit-design]')?.dataset.kitDesign;
    box.querySelector('.kit-design-grid').innerHTML=FooteraKitArt.designs.map(d=>'<button type="button" class="kit-design-option" data-kit-design="'+d.id+'" aria-pressed="'+(select.value===d.id)+'" aria-label="'+d.name+': '+d.detail+'"><span class="kit-shirt pattern-'+d.id+'" style="--kit-a:'+a+';--kit-b:'+b+'">'+FooteraKitArt.svg(d.id)+'</span><b>'+d.name+'</b><small>'+d.detail+'</small></button>').join('');
    if(focusId)box.querySelector('[data-kit-design="'+focusId+'"]')?.focus({preventScroll:true});
   };
   new MutationObserver(()=>{if(box.open)render()}).observe(preview,{childList:true});
   box.addEventListener('toggle',()=>{if(box.open)render()});
   box.addEventListener('click',e=>{const button=e.target.closest('[data-kit-design]');if(!button)return;select.value=button.dataset.kitDesign;select.dispatchEvent(new Event('change',{bubbles:true}));render()});
   for(const input of select.closest('.kit-card').querySelectorAll('input,select')){input.addEventListener('change',render);input.addEventListener('input',render)}
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
