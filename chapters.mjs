export function mountChapterNavigation(host,active='national'){
 const root=new URL('./',import.meta.url),nav=document.createElement('nav');nav.className='chapter-nav';nav.setAttribute('aria-label','路书篇章');
 const label=document.createElement('span');label.textContent='路书篇章';nav.append(label);
 for(const [id,name,url]of [['national','2026-10-皖南 · 实际路书',new URL('chapters/2026-10-wannan/',root).href],['taishan','2026-11-泰山',new URL('chapters/2026-11-taishan/',root).href]]){
  const a=document.createElement('a');a.href=url;a.textContent=name;if(active===id)a.setAttribute('aria-current','page');nav.append(a);
 }host.prepend(nav);
}
