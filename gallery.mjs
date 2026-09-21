export function createGallery(figure,photos,initial=0){
 const abort=new AbortController(),options={signal:abort.signal},motion=matchMedia('(prefers-reduced-motion: reduce)');
 let index=initial,timer,paused=motion.matches,hovered=false,visible=true,destroyed=false;
 const image=figure.querySelector('img'),caption=figure.querySelector('figcaption'),fallback=figure.querySelector('.image-fallback');
 figure.classList.add('hero-gallery');figure.setAttribute('role','region');figure.setAttribute('aria-roledescription','轮播图');figure.setAttribute('aria-label','两条候选路线的5张历史实景');
 const stage=document.createElement('button');stage.type='button';stage.className='gallery-stage';stage.setAttribute('aria-label','点击图片，切换下一张实景');stage.append(image,fallback);figure.prepend(stage);
 const controls=document.createElement('div');controls.className='gallery-controls';
 function button(label,text,action){const node=document.createElement('button');node.type='button';node.setAttribute('aria-label',label);node.textContent=text;node.addEventListener('click',action,options);return node;}
 const previous=button('上一张实景','←',()=>show(index-1,true)),next=button('下一张实景','→',()=>show(index+1,true));
 const toggle=button('暂停自动轮播','暂停轮播',()=>{paused=!paused;schedule();});toggle.className='gallery-toggle';
 const counter=document.createElement('span');counter.className='gallery-counter';counter.setAttribute('aria-live','off');
 controls.append(previous,counter,toggle,next);figure.insertBefore(controls,caption);
 function schedule(){clearTimeout(timer);toggle.textContent=paused?'播放轮播':'暂停轮播';toggle.setAttribute('aria-label',paused?'开始自动轮播':'暂停自动轮播');figure.dataset.playing=String(!paused&&!hovered&&visible&&!document.hidden);if(!destroyed&&!paused&&!hovered&&visible&&!document.hidden)timer=setTimeout(()=>show(index+1,false),7000);}
 function anchor(url,text){const a=document.createElement('a');a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function show(value,manual){index=(value+photos.length)%photos.length;if(manual)paused=true;const p=photos[index];figure.classList.remove('failed');figure.dataset.slide=String(index);counter.textContent=`${index+1} / ${photos.length}`;counter.setAttribute('aria-live',manual?'polite':'off');image.alt=p.alt;image.src=p.src;
  caption.replaceChildren();const title=document.createElement('strong');title.textContent=p.title;caption.append(title,document.createElement('br'),`${p.year}年历史实景 · 非实时 · 显示裁切`,document.createElement('br'),anchor(p.source,p.author+' / 原图'),' · ',anchor(p.licenseURL,p.license));schedule();
 }
 image.addEventListener('load',()=>figure.classList.remove('failed'),options);image.addEventListener('error',()=>{figure.classList.add('failed');paused=true;schedule();},options);
 stage.addEventListener('click',()=>show(index+1,true),options);
 figure.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;schedule();}},options);figure.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hovered=false;schedule();}},options);
 figure.addEventListener('focusin',e=>{if(e.target!==toggle){paused=true;schedule();}},options);
 figure.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1),true);}},options);
 document.addEventListener('visibilitychange',schedule,options);motion.addEventListener('change',e=>{if(e.matches)paused=true;schedule();},options);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();});observer.observe(figure);show(index,false);
 if(image.complete&&!image.naturalWidth){figure.classList.add('failed');paused=true;schedule();}
 return {destroy(){destroyed=true;clearTimeout(timer);abort.abort();observer.disconnect();}};
}
