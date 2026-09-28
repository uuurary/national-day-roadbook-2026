// Regional numerical inverse for OSM display only. Keep original AMap GCJ-02
// coordinates in the cache for AMap rendering; do not apply a second GCJ offset.
function offset(lng,lat){
 const x=lng-105,y=lat-35,pi=Math.PI;
 let a=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));
 let b=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
 a+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
 a+=(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3;
 a+=(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;
 b+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
 b+=(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3;
 b+=(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;
 const rad=lat*pi/180,magic=1-.006693421622965943*Math.sin(rad)**2,sqrt=Math.sqrt(magic);
 return [b*180/(6378245/sqrt*Math.cos(rad)*pi),a*180/((6378245*(1-.006693421622965943))/(magic*sqrt)*pi)];
}
export function gcjToWgs([lng,lat]){
 let x=lng,y=lat;
 for(let i=0;i<5;i++){const [dx,dy]=offset(x,y);x-=x+dx-lng;y-=y+dy-lat;}
 return [Number(x.toFixed(7)),Number(y.toFixed(7))];
}
