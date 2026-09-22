/* eslint-disable */
// SAS DOOR nokshi renderer (SVG strings). 15 designs: royal, classic, medallion, vine, twin, lotus, shapla, peacock, tree, kalka, pyramid, mandala, islamic, modern, simple.
const U = 40;
/* ---------- color helpers ---------- */
function hex2rgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return [0,2,4].map(i=>parseInt(h.substr(i,2),16));}
function rgb2hex(a){return "#"+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");}
function mix(h,t,amt){const a=hex2rgb(h),b=hex2rgb(t);return rgb2hex(a.map((v,i)=>v+(b[i]-v)*amt));}
function lum(h){const a=hex2rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
function toneOf(doorHex){return lum(doorHex)>0.2 ? mix(doorHex,"#000000",.24) : mix(doorHex,"#FFFFFF",.2);}

/* ---------- ornament primitives (unit coords) ---------- */
const SCROLL="M0 0 C0 -16 14 -26 28 -22 C40 -18 42 -4 32 1 C25 4 19 -2 23 -8 C26 -12 31 -10 31 -6";
const LEAF="M0 0 C7 -8 8 -22 0 -34 C-8 -22 -7 -8 0 0Z";
const f=n=>+n.toFixed(2);
const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
function tr(x,y,s,sx=1,sy=1,rot=0){return `translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(s*sx)} ${f(s*sy)})`;}
function scroll(x,y,s,sx=1,sy=1,rot=0){return `<path transform="${tr(x,y,s,sx,sy,rot)}" d="${SCROLL}" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`;}
function leaf(x,y,s,rot=0,sy=1){return `<path transform="${tr(x,y,s,1,sy,rot)}" d="${LEAF}" fill="currentColor"/>`;}
function fleur(x,y,s,sy=1){ // anchored at base, grows up (sy=-1 grows down)
  let g=leaf(x,y,s*1.1,0,sy)+leaf(x,y,s*.62,-44*sy,sy)+leaf(x,y,s*.62,44*sy,sy);
  g+=scroll(x+3*s,y+4*s*sy,s*.62,1,sy)+scroll(x-3*s,y+4*s*sy,s*.62,-1,sy);
  g+=`<ellipse cx="${f(x)}" cy="${f(y+2*s*sy)}" rx="${f(9*s)}" ry="${f(3*s)}" fill="currentColor"/>`;
  return g;
}
function crest(cx,y,s,sy=1){ // symmetrical scroll crest, sy=-1 flips vertically
  let g=fleur(cx,y,s*.7,sy);
  g+=scroll(cx+7*s,y,s*1.05,1,sy)+scroll(cx-7*s,y,s*1.05,-1,sy);
  g+=scroll(cx+40*s,y-2*s*sy,s*.62,1,sy,0)+scroll(cx-40*s,y-2*s*sy,s*.62,-1,sy,0);
  return g;
}
function rosette(cx,cy,r,n){
  let g="";const p=`M0 0 C${f(r*.36)} ${f(-r*.3)} ${f(r*.3)} ${f(-r*.86)} 0 ${f(-r)} C${f(-r*.3)} ${f(-r*.86)} ${f(-r*.36)} ${f(-r*.3)} 0 0Z`;
  for(let i=0;i<n;i++)g+=`<path transform="translate(${f(cx)} ${f(cy)}) rotate(${f(i*360/n)})" d="${p}" fill="currentColor"/>`;
  return g;
}
function lineRect(x,y,w,h,sw,rx=0){return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;}

/* ---------- designs: return {main, detail} for one leaf of size w x h ---------- */
function royal(w,h){
  const s=w/120, m=w*.08, sw=3*s; let main="", det="";
  const archY=m+w*.2, apex=m-w*.02;
  const arch=(o)=>`<path d="M${f(m+o)} ${f(h-m-o)} L${f(m+o)} ${f(archY+o)} Q${f(w/2)} ${f(apex+o*1.4)} ${f(w-m-o)} ${f(archY+o)} L${f(w-m-o)} ${f(h-m-o)} Z" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  main+=arch(0)+arch(w*.035);
  const il=m+w*.07, ir=w-m-w*.07;
  const crestBase=archY+w*.24;
  main+=`<path d="M${f(il)} ${f(crestBase)} H${f(ir)}" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  main+=crest(w/2,crestBase-w*.04,s*.8,1);
  const botBase=h-m-w*.26;
  main+=`<path d="M${f(il)} ${f(botBase)} H${f(ir)}" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  main+=crest(w/2,botBase+w*.04,s*.8,-1);
  const gap=w*.08, pw=(ir-il-gap)/2;
  const pt=crestBase+w*.3, pb=botBase-w*.3;
  // center bead line
  main+=`<path d="M${f(w/2)} ${f(crestBase+w*.05)} V${f(botBase-w*.05)}" stroke="currentColor" stroke-width="${f(sw*1.6)}" stroke-linecap="round"/>`;
  main+=`<path transform="translate(${f(w/2)} ${f((pt+pb)/2)})" d="M0 ${f(-9*s)} L${f(6*s)} 0 L0 ${f(9*s)} L${f(-6*s)} 0Z" fill="currentColor"/>`;
  [il, il+pw+gap].forEach((px,idx)=>{
    const cx=px+pw/2;
    main+=fleur(cx,pt-w*.03,s*.8,1)+fleur(cx,pb+w*.03,s*.8,-1);
    if(pb-pt>w*.3){
      main+=lineRect(px,pt,pw,pb-pt,sw)+lineRect(px+w*.02,pt+w*.02,pw-w*.04,pb-pt-w*.04,sw*.6);
      const pad=w*.04, b=(pw-pad*2)/2, rows=Math.max(1,Math.floor((pb-pt-pad*2)/b));
      const oy=pt+(pb-pt-rows*b)/2;
      for(let r=0;r<rows;r++){
        const col=(r+idx)%2, x=px+pad+col*b, y=oy+r*b, c=[x+b/2,y+b/2];
        main+=`<rect x="${f(x+b*.06)}" y="${f(y+b*.06)}" width="${f(b*.88)}" height="${f(b*.88)}" fill="currentColor"/>`;
        const X0=x+b*.06,Y0=y+b*.06,X1=x+b*.94,Y1=y+b*.94;
        det+=`<path d="M${f(X0)} ${f(Y0)} L${f(X1)} ${f(Y0)} L${f(c[0])} ${f(c[1])}Z" fill="#fff" opacity=".32"/>`;
        det+=`<path d="M${f(X0)} ${f(Y0)} L${f(X0)} ${f(Y1)} L${f(c[0])} ${f(c[1])}Z" fill="#fff" opacity=".14"/>`;
        det+=`<path d="M${f(X1)} ${f(Y0)} L${f(X1)} ${f(Y1)} L${f(c[0])} ${f(c[1])}Z" fill="#000" opacity=".14"/>`;
        det+=`<path d="M${f(X0)} ${f(Y1)} L${f(X1)} ${f(Y1)} L${f(c[0])} ${f(c[1])}Z" fill="#000" opacity=".3"/>`;
      }
    }
  });
  return {main,det};
}
function medallion(w,h){
  const s=w/120, m=w*.08, sw=3*s; let main="", det="";
  main+=lineRect(m,m,w-2*m,h-2*m,sw,w*.02)+lineRect(m+w*.04,m+w*.04,w-2*m-w*.08,h-2*m-w*.08,sw*.7,w*.015);
  const cr=w*.065, ci=m+w*.11;
  [[ci,ci],[w-ci,ci],[ci,h-ci],[w-ci,h-ci]].forEach(p=>{main+=rosette(p[0],p[1],cr,6)+`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(cr*.25)}" fill="currentColor"/>`;});
  const cx=w/2, cy=h*.46, R=w*.29;
  main+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="currentColor" stroke-width="${f(sw*1.2)}"/>`;
  main+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R*.86)}" fill="none" stroke="currentColor" stroke-width="${f(sw*.6)}"/>`;
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;main+=`<circle cx="${f(cx+Math.cos(a)*R*.93)}" cy="${f(cy+Math.sin(a)*R*.93)}" r="${f(1.8*s)}" fill="currentColor"/>`;}
  main+=rosette(cx,cy,R*.72,12);
  det+=rosette(cx,cy,R*.42,12).replace(/fill="currentColor"/g,'fill="#000" opacity=".16"');
  main+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R*.14)}" fill="currentColor"/>`;
  det+=`<circle cx="${f(cx-R*.03)}" cy="${f(cy-R*.03)}" r="${f(R*.07)}" fill="#fff" opacity=".35"/>`;
  // vines above & below, leaves repeat by height
  const vine=(y0,y1,dir)=>{
    let g=`<path d="M${f(cx)} ${f(y0)} V${f(y1)}" stroke="currentColor" stroke-width="${f(sw)}" stroke-linecap="round"/>`;
    const step=w*.1, n=Math.floor(Math.abs(y1-y0)/step);
    for(let i=1;i<n;i++){const y=y0+dir*i*step;const side=i%2?1:-1;g+=leaf(cx,y,s*.7,side*58*dir*-1+(dir>0?180:0),1);}
    return g;
  };
  const topEnd=m+w*.2, botEnd=h-m-w*.2;
  main+=vine(cy-R-2*s,topEnd,-1)+vine(cy+R+2*s,botEnd,1);
  main+=fleur(cx,topEnd+2*s,s*.75,-1)+fleur(cx,botEnd-2*s,s*.75,1);
  return {main,det};
}
function modern(w,h){
  const s=w/120, sw=2.4*s; let main="", det="";
  const x0=w*.4, x1=w-w*.08, gapY=w*.16;
  const ys=[]; for(let y=h*.1;y<=h*.9;y+=gapY)ys.push(y);
  ys.forEach(y=>{main+=`<path d="M${f(x0)} ${f(y)} H${f(x1)}" stroke="currentColor" stroke-width="${f(sw)}" stroke-linecap="round"/>`;det+=`<path d="M${f(x0)} ${f(y+sw*.9)} H${f(x1)}" stroke="#fff" stroke-width="${f(sw*.5)}" opacity=".25"/>`;});
  main+=`<path d="M${f(w*.32)} ${f(h*.06)} V${f(h*.94)}" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  const sx=w*.18, top=h*.28, bot=h*.9;
  main+=`<path d="M${f(sx)} ${f(bot)} C${f(sx+w*.08)} ${f(bot-(bot-top)*.35)} ${f(sx-w*.08)} ${f(bot-(bot-top)*.65)} ${f(sx)} ${f(top)}" fill="none" stroke="currentColor" stroke-width="${f(sw*1.2)}" stroke-linecap="round"/>`;
  const n=Math.max(3,Math.floor((bot-top)/(w*.18)));
  for(let i=1;i<=n;i++){const t=i/(n+1);const y=bot-(bot-top)*t;const side=i%2?1:-1;main+=leaf(sx+side*w*.01,y,s*.75,side*52,1);}
  main+=rosette(sx,top-w*.06,w*.075,6)+`<circle cx="${f(sx)}" cy="${f(top-w*.06)}" r="${f(w*.018)}" fill="currentColor"/>`;
  main+=leaf(sx,top-w*.06,s*.5,0,1).replace("currentColor","currentColor");
  return {main,det};
}
function petal(len,wid){return `M0 0 C${f(wid)} ${f(-len*.3)} ${f(wid*.8)} ${f(-len*.8)} 0 ${f(-len)} C${f(-wid*.8)} ${f(-len*.8)} ${f(-wid)} ${f(-len*.3)} 0 0Z`;}
function petalAt(x,y,len,wid,rot,stroke){return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="${petal(len,wid)}" ${stroke?`fill="none" stroke="currentColor" stroke-width="${f(stroke)}"`:'fill="currentColor"'}/>`;}
function dot(x,y,r){return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="currentColor"/>`;}
function hline(x0,x1,y,sw){return `<path d="M${f(x0)} ${f(y)} H${f(x1)}" stroke="currentColor" stroke-width="${f(sw)}" stroke-linecap="round"/>`;}
function vline(x,y0,y1,sw){return `<path d="M${f(x)} ${f(y0)} V${f(y1)}" stroke="currentColor" stroke-width="${f(sw)}" stroke-linecap="round"/>`;}
function frame2(w,h,m,sw){return lineRect(m,m,w-2*m,h-2*m,sw)+lineRect(m+w*.035,m+w*.035,w-2*m-w*.07,h-2*m-w*.07,sw*.6);}
function pyr(x,y,b){
  const X0=x+b*.06,Y0=y+b*.06,X1=x+b*.94,Y1=y+b*.94,cx=x+b/2,cy=y+b/2;
  const main=`<rect x="${f(X0)}" y="${f(Y0)}" width="${f(X1-X0)}" height="${f(Y1-Y0)}" fill="currentColor"/>`;
  const det=`<path d="M${f(X0)} ${f(Y0)} L${f(X1)} ${f(Y0)} L${f(cx)} ${f(cy)}Z" fill="#fff" opacity=".32"/><path d="M${f(X0)} ${f(Y0)} L${f(X0)} ${f(Y1)} L${f(cx)} ${f(cy)}Z" fill="#fff" opacity=".14"/><path d="M${f(X1)} ${f(Y0)} L${f(X1)} ${f(Y1)} L${f(cx)} ${f(cy)}Z" fill="#000" opacity=".14"/><path d="M${f(X0)} ${f(Y1)} L${f(X1)} ${f(Y1)} L${f(cx)} ${f(cy)}Z" fill="#000" opacity=".3"/>`;
  return {main,det};
}
function raised(x,y,pw,ph,b,sw){
  const main=lineRect(x,y,pw,ph,sw)+lineRect(x+b,y+b,pw-2*b,ph-2*b,sw*.7);
  const det=`<path d="M${f(x)} ${f(y)} L${f(x+pw)} ${f(y)} L${f(x+pw-b)} ${f(y+b)} L${f(x+b)} ${f(y+b)}Z" fill="#fff" opacity=".22"/>`+
  `<path d="M${f(x)} ${f(y)} L${f(x+b)} ${f(y+b)} L${f(x+b)} ${f(y+ph-b)} L${f(x)} ${f(y+ph)}Z" fill="#fff" opacity=".1"/>`+
  `<path d="M${f(x+pw)} ${f(y)} L${f(x+pw)} ${f(y+ph)} L${f(x+pw-b)} ${f(y+ph-b)} L${f(x+pw-b)} ${f(y+b)}Z" fill="#000" opacity=".12"/>`+
  `<path d="M${f(x)} ${f(y+ph)} L${f(x+b)} ${f(y+ph-b)} L${f(x+pw-b)} ${f(y+ph-b)} L${f(x+pw)} ${f(y+ph)}Z" fill="#000" opacity=".22"/>`;
  return {main,det};
}
function classic(w,h){
  const s=w/120,m=w*.1,sw=3*s,g=w*.05;let main=lineRect(m*.5,m*.5,w-m,h-m,sw*.6),det="";
  const pw=(w-2*m-g)/2, H=h-2*m-2*g, ratios=[.22,.46,.32];let y=m;
  ratios.forEach((r,ri)=>{const ph=H*r;[0,1].forEach(c=>{const x=m+c*(pw+g);const p=raised(x,y,pw,ph,w*.045,sw);main+=p.main;det+=p.det;
    const cx=x+pw/2,cy=y+ph/2;
    if(ri===0){main+=rosette(cx,cy,Math.min(pw,ph)*.24,6)+dot(cx,cy,Math.min(pw,ph)*.06);}
    if(ri===2){const d=Math.min(pw,ph)*.22;main+=`<path d="M${f(cx)} ${f(cy-d)} L${f(cx+d*.7)} ${f(cy)} L${f(cx)} ${f(cy+d)} L${f(cx-d*.7)} ${f(cy)}Z" fill="none" stroke="currentColor" stroke-width="${f(sw*.8)}"/>`+dot(cx,cy,d*.2);}
  });y+=ph+g;});
  return {main,det};
}
function vine(w,h){
  const s=w/120,m=w*.07,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const i=m+w*.12;
  main+=lineRect(i,i,w-2*i,h-2*i,sw*.8,w*.03);
  const E=[[i,i,w-i,i,90],[w-i,i,w-i,h-i,180],[w-i,h-i,i,h-i,270],[i,h-i,i,i,0]];
  const step=w*.085;
  E.forEach(e=>{const L=Math.hypot(e[2]-e[0],e[3]-e[1]),n=Math.max(2,Math.floor(L/step));
    for(let k=1;k<n;k++){const t=k/n,x=e[0]+(e[2]-e[0])*t,y=e[1]+(e[3]-e[1])*t;const side=k%2;
      main+=leaf(x,y,s*.5,e[4]+(side?-48:48));
      if(k%3===0)main+=dot(x+(side?1:-1)*w*.02*Math.cos((e[4])*Math.PI/180),y+(side?1:-1)*w*.02*Math.sin(e[4]*Math.PI/180),w*.01);
    }});
  [[i,i],[w-i,i],[w-i,h-i],[i,h-i]].forEach(p=>{main+=rosette(p[0],p[1],w*.055,5)+dot(p[0],p[1],w*.014);});
  const cx=w/2,cy=h/2,d=w*.13;
  main+=`<path d="M${f(cx)} ${f(cy-d*1.3)} L${f(cx+d)} ${f(cy)} L${f(cx)} ${f(cy+d*1.3)} L${f(cx-d)} ${f(cy)}Z" fill="none" stroke="currentColor" stroke-width="${f(sw*.8)}"/>`+rosette(cx,cy,d*.5,6)+dot(cx,cy,d*.12);
  return {main,det};
}
function twin(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const topB=m+w*.3, botB=h-m-w*.28;
  main+=crest(w/2,topB-w*.08,s*.72,1)+crest(w/2,botB+w*.08,s*.72,-1);
  const gap=w*.07, px=m+w*.08, pw=(w-2*px-gap)/2, py=topB, pb=botB;
  [px,px+pw+gap].forEach(x=>{
    const arch=(o)=>`<path d="M${f(x+o)} ${f(pb-o)} L${f(x+o)} ${f(py+pw*.45)} Q${f(x+pw/2)} ${f(py-pw*.22+o*1.6)} ${f(x+pw-o)} ${f(py+pw*.45)} L${f(x+pw-o)} ${f(pb-o)}Z" fill="none" stroke="currentColor" stroke-width="${f(o?sw*.6:sw)}"/>`;
    main+=arch(0)+arch(w*.025);
    main+=fleur(x+pw/2,pb-w*.05,s*.5,1);
    main+=scroll(x+pw/2+2*s,py+pw*.35,s*.45,1,1)+scroll(x+pw/2-2*s,py+pw*.35,s*.45,-1,1);
  });
  main+=rosette(w/2,(py+pb)/2,w*.035,6)+dot(w/2,(py+pb)/2,w*.01);
  return {main,det};
}
function lotus(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const cx=w/2, ly=m+w*.42;
  [-62,-31,0,31,62].forEach(a=>main+=petalAt(cx,ly,w*.25,w*.07,a,sw*.8));
  [-78,-46,-16,16,46,78].forEach(a=>main+=petalAt(cx,ly,w*.18,w*.045,a));
  main+=`<path d="M${f(cx-w*.2)} ${f(ly)} C${f(cx-w*.14)} ${f(ly+w*.08)} ${f(cx+w*.14)} ${f(ly+w*.08)} ${f(cx+w*.2)} ${f(ly)}" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  main+=leaf(cx-w*.05,ly+w*.07,s*.9,-118)+leaf(cx+w*.05,ly+w*.07,s*.9,118);
  const g0=ly+w*.2, g1=h-m-w*.28;
  if(g1>g0){[-.12,0,.12].forEach(o=>main+=vline(cx+o*w,g0,g1,o?sw*.7:sw));
    for(let y=g0+w*.08;y<g1-w*.04;y+=w*.16)main+=dot(cx,y,w*.018);}
  const by=h-m-w*.1;
  main+=hline(cx-w*.26,cx+w*.26,by,sw*.8)+petalAt(cx,by-w*.02,w*.13,w*.05,0)+leaf(cx-w*.02,by-w*.02,s*.6,-55)+leaf(cx+w*.02,by-w*.02,s*.6,55);
  return {main,det};
}
function shaplaFlower(cx,cy,r,sw){
  let g="";for(let i=0;i<10;i++)g+=petalAt(cx,cy,r,r*.24,i*36,sw);
  for(let i=0;i<10;i++)g+=petalAt(cx,cy,r*.62,r*.16,i*36+18);
  return g+`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r*.2)}" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;
}
function shapla(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const px=m+w*.07,pw=w-2*px,gap=w*.05,top=m+w*.07,H=h-2*top-2*gap;let y=top;
  [.28,.44,.28].forEach((r,i)=>{const ph=H*r;main+=lineRect(px,y,pw,ph,sw)+lineRect(px+w*.025,y+w*.025,pw-w*.05,ph-w*.05,sw*.5);
    const rr=Math.min(pw,ph)*(i===1?.36:.32);main+=shaplaFlower(px+pw/2,y+ph/2,rr,sw*.7);
    for(let k=0;k<10;k++){const a=(k*36+18)*Math.PI/180;det+=`<circle cx="${f(px+pw/2+Math.sin(a)*rr*.3)}" cy="${f(y+ph/2-Math.cos(a)*rr*.3)}" r="${f(rr*.03)}" fill="#000" opacity=".25"/>`;}
    y+=ph+gap;});
  return {main,det};
}
function peacock(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const cx=w/2, cy=h*.47, R=w*.33;
  main+=crest(cx,m+w*.17,s*.55,1);
  for(let i=0;i<11;i++){const a=(-80+i*16)*Math.PI/180, ex=cx+Math.sin(a)*R, ey=cy-Math.cos(a)*R;
    main+=`<path d="M${f(cx)} ${f(cy)} L${f(ex)} ${f(ey)}" stroke="currentColor" stroke-width="${f(sw*.55)}"/>`;
    const deg=(-80+i*16);
    main+=`<ellipse transform="translate(${f(ex)} ${f(ey)}) rotate(${deg})" rx="${f(w*.034)}" ry="${f(w*.05)}" fill="currentColor"/>`;
    det+=`<ellipse transform="translate(${f(ex)} ${f(ey)}) rotate(${deg})" rx="${f(w*.018)}" ry="${f(w*.028)}" fill="#000" opacity=".3"/><circle cx="${f(ex)}" cy="${f(ey)}" r="${f(w*.008)}" fill="#fff" opacity=".45"/>`;
    const a2=(-80+i*16+8)*Math.PI/180; if(i<10)main+=dot(cx+Math.sin(a2)*R*1.13,cy-Math.cos(a2)*R*1.13,w*.009);
  }
  const k=s*1.25, bx=cx, by=cy+w*.1;
  main+=`<path transform="translate(${f(bx)} ${f(by)}) scale(${f(k)})" d="M0 26 C15 12 13 -12 0 -20 C-13 -12 -15 12 0 26Z" fill="currentColor"/>`;
  main+=`<path transform="translate(${f(bx)} ${f(by)}) scale(${f(k)})" d="M0 -18 C7 -30 -3 -40 4 -50" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;
  main+=`<g transform="translate(${f(bx)} ${f(by)}) scale(${f(k)})"><circle cx="4" cy="-53" r="4.5" fill="currentColor"/><path d="M8 -54 L14 -52 L8 -51Z" fill="currentColor"/><path d="M3 -57 L0 -66 M5 -57 L5 -67 M7 -57 L10 -66" stroke="currentColor" stroke-width="1.6"/><circle cx="0" cy="-67" r="1.8" fill="currentColor"/><circle cx="5" cy="-68" r="1.8" fill="currentColor"/><circle cx="10" cy="-67" r="1.8" fill="currentColor"/></g>`;
  det+=`<path transform="translate(${f(bx)} ${f(by)}) scale(${f(k)})" d="M0 18 C8 8 7 -8 0 -13 C-7 -8 -8 8 0 18Z" fill="#000" opacity=".18"/><circle transform="translate(${f(bx)} ${f(by)}) scale(${f(k)})" cx="5" cy="-54" r="1.2" fill="#fff" opacity=".7"/>`;
  const py=by+26*k+w*.02;
  main+=hline(cx-w*.14,cx+w*.14,py,sw)+scroll(cx+w*.14,py,s*.6,1,-1)+scroll(cx-w*.14,py,s*.6,-1,-1);
  main+=crest(cx,h-m-w*.17,s*.55,-1);
  return {main,det};
}
function tree(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main="",det="";
  const archY=m+w*.2;
  main+=`<path d="M${f(m)} ${f(h-m)} L${f(m)} ${f(archY)} Q${f(w/2)} ${f(m-w*.03)} ${f(w-m)} ${f(archY)} L${f(w-m)} ${f(h-m)}Z" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  main+=`<path d="M${f(m+w*.035)} ${f(h-m-w*.035)} L${f(m+w*.035)} ${f(archY+w*.03)} Q${f(w/2)} ${f(m+w*.02)} ${f(w-m-w*.035)} ${f(archY+w*.03)} L${f(w-m-w*.035)} ${f(h-m-w*.035)}Z" fill="none" stroke="currentColor" stroke-width="${f(sw*.6)}"/>`;
  const cx=w/2, base=h-m-w*.16, top=archY+w*.16;
  main+=`<path d="M${f(cx-w*.22)} ${f(base+w*.03)} C${f(cx-w*.12)} ${f(base-w*.05)} ${f(cx+w*.12)} ${f(base-w*.05)} ${f(cx+w*.22)} ${f(base+w*.03)}" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  main+=`<path d="M${f(cx)} ${f(base-w*.02)} C${f(cx+w*.03)} ${f(base-(base-top)*.35)} ${f(cx-w*.03)} ${f(base-(base-top)*.7)} ${f(cx)} ${f(top)}" fill="none" stroke="currentColor" stroke-width="${f(sw*2)}" stroke-linecap="round"/>`;
  let lv=0;
  for(let y=base-w*.14;y>top+w*.12;y-=w*.17){[1,-1].forEach(sd=>{
    const ex=cx+sd*w*.26, ey=y-w*.11;
    main+=`<path d="M${f(cx)} ${f(y)} Q${f(cx+sd*w*.14)} ${f(y+w*.01)} ${f(ex)} ${f(ey)}" fill="none" stroke="currentColor" stroke-width="${f(sw*.9)}" stroke-linecap="round"/>`;
    main+=leaf(cx+sd*w*.1,y-w*.005,s*.5,sd*(lv%2?40:130))+leaf(cx+sd*w*.19,y-w*.04,s*.5,sd*(lv%2?130:40));
    main+=rosette(ex,ey,w*.04,5)+dot(ex,ey,w*.01);
  });lv++;}
  main+=rosette(cx,top-w*.02,w*.07,8)+dot(cx,top-w*.02,w*.018)+leaf(cx-w*.03,top+w*.05,s*.55,-60)+leaf(cx+w*.03,top+w*.05,s*.55,60);
  return {main,det};
}
const KALKA="M0 50 C-36 50 -42 8 -22 -18 C-10 -34 6 -38 12 -56 C24 -36 38 -6 30 20 C25 40 14 50 0 50Z";
function kalkaAt(x,y,k,rot,sw,inner){
  let g=`<path transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(k)})" d="${KALKA}" fill="none" stroke="currentColor" stroke-width="${f(sw/k)}"/>`;
  if(inner){g+=`<path transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(k*.7)}) translate(0 6)" d="${KALKA}" fill="currentColor"/>`;}
  return g;
}
function kalka(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const b1=m+w*.2, b2=h-m-w*.2;
  main+=hline(m+w*.035,w-m-w*.035,b1,sw*.8)+hline(m+w*.035,w-m-w*.035,b2,sw*.8);
  [.3,.5,.7].forEach(t=>{main+=rosette(w*t,(m+b1)/2+w*.015,w*.045,6)+rosette(w*t,(b2+h-m)/2-w*.015,w*.045,6);});
  const cx=w/2, cy=(b1+b2)/2, k=Math.min((w-2*m)*.62/80,(b2-b1)*.62/106);
  main+=kalkaAt(cx,cy,k,0,sw*1.2,true);
  det+=`<path transform="translate(${f(cx)} ${f(cy)}) scale(${f(k*.42)}) translate(0 14)" d="${KALKA}" fill="#000" opacity=".2"/>`;
  main+=rosette(cx,cy+12*k,11*k,6)+dot(cx,cy+12*k,3*k);
  for(let i=0;i<9;i++){const t=i/8;main+=dot(cx-38*k+76*k*t,cy+60*k,1.6*s);}
  const ks=k*.35;
  if(cy-56*k-b1>w*.2){main+=kalkaAt(cx-w*.22,b1+w*.14,ks,-20,sw*.7,true)+kalkaAt(cx+w*.22,b1+w*.14,ks,20,sw*.7,true);}
  if(b2-(cy+50*k)>w*.2){main+=kalkaAt(cx-w*.22,b2-w*.12,ks,200,sw*.7,true)+kalkaAt(cx+w*.22,b2-w*.12,ks,160,sw*.7,true);}
  main+=vline(cx,b1+w*.02,cy-56*k-w*.03,sw*.7)+vline(cx,cy+64*k,b2-w*.02,sw*.7);
  return {main,det};
}
function pyramid(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const pad=m+w*.08, iw=w-2*pad, ih=h-2*pad, cols=(w/U)<=3.2?3:4, b=iw/cols, rows=Math.floor(ih/b);
  const oy=pad+(ih-rows*b)/2;
  main+=lineRect(pad-w*.02,oy-w*.02,iw+w*.04,rows*b+w*.04,sw*.8);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const p=pyr(pad+c*b,oy+r*b,b);main+=p.main;det+=p.det;}
  return {main,det};
}
function mandala(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const cx=w/2, cy=h*.47, R=w*.3;
  for(let i=0;i<16;i++){const a=i*22.5;main+=`<path transform="translate(${f(cx)} ${f(cy)}) rotate(${a}) translate(0 ${f(-R*.98)})" d="${petal(R*.2,R*.07)}" fill="none" stroke="currentColor" stroke-width="${f(sw*.7)}"/>`;}
  main+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`;
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;main+=dot(cx+Math.cos(a)*R*.9,cy+Math.sin(a)*R*.9,1.7*s);}
  main+=rosette(cx,cy,R*.8,16);
  det+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R*.55)}" fill="none" stroke="#000" stroke-width="${f(sw*.9)}" opacity=".28"/>`;
  det+=rosette(cx,cy,R*.5,8).replace(/fill="currentColor"/g,'fill="#000" opacity=".16"');
  main+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R*.12)}" fill="currentColor"/>`;
  det+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R*.05)}" fill="#fff" opacity=".4"/>`;
  const ci=m+w*.1;
  [[ci,ci],[w-ci,ci],[ci,h-ci],[w-ci,h-ci]].forEach(p=>{main+=rosette(p[0],p[1],w*.06,8)+`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(w*.075)}" fill="none" stroke="currentColor" stroke-width="${f(sw*.5)}"/>`+dot(p[0],p[1],w*.012);});
  const t0=ci+w*.12, t1=cy-R*1.25, b0=cy+R*1.25, b1=h-ci-w*.12;
  const diam=(x,y)=>`<path d="M${f(x)} ${f(y-w*.03)} L${f(x+w*.02)} ${f(y)} L${f(x)} ${f(y+w*.03)} L${f(x-w*.02)} ${f(y)}Z" fill="currentColor"/>`;
  if(t1-t0>w*.05)main+=vline(cx,t0,t1,sw*.8)+diam(cx,t0);
  if(b1-b0>w*.05)main+=vline(cx,b0,b1,sw*.8)+diam(cx,b1);
  return {main,det};
}
function star8(cx,cy,R,attrs){
  const pts=[];for(let i=0;i<16;i++){const a=i*22.5*Math.PI/180, r=i%2?R*.765:R;pts.push(`${f(cx+Math.sin(a)*r)},${f(cy-Math.cos(a)*r)}`);}
  return `<polygon points="${pts.join(" ")}" ${attrs}/>`;
}
function islamic(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main="",det="";
  const ya=m+w*.32, apex=m;
  const arch=(o)=>`<path d="M${f(m+o)} ${f(h-m-o)} L${f(m+o)} ${f(ya)} Q${f(m+o)} ${f(apex+w*.08+o)} ${f(w/2)} ${f(apex+o*1.4)} Q${f(w-m-o)} ${f(apex+w*.08+o)} ${f(w-m-o)} ${f(ya)} L${f(w-m-o)} ${f(h-m-o)}Z" fill="none" stroke="currentColor" stroke-width="${f(o?sw*.6:sw)}"/>`;
  main+=arch(0)+arch(w*.035);
  const cx=w/2, cy=h*.5, R=w*.25;
  main+=star8(cx,cy,R,`fill="none" stroke="currentColor" stroke-width="${f(sw*1.2)}"`);
  main+=star8(cx,cy,R*.72,`fill="currentColor"`);
  det+=rosette(cx,cy,R*.42,8).replace(/fill="currentColor"/g,'fill="#000" opacity=".2"');
  det+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R*.08)}" fill="#fff" opacity=".4"/>`;
  const c=w*.2, x0=m+w*.08, x1=w-m-w*.08, cols=Math.max(1,Math.floor((x1-x0)/c)), ox=x0+((x1-x0)-cols*c)/2;
  const zone=(y0,y1)=>{const rows=Math.floor((y1-y0)/c);if(rows<1)return "";let g=lineRect(ox-w*.015,y0+((y1-y0)-rows*c)/2-w*.015,cols*c+w*.03,rows*c+w*.03,sw*.6);
    const oy=y0+((y1-y0)-rows*c)/2;
    for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const sx=ox+k*c+c/2, sy=oy+r*c+c/2;g+=star8(sx,sy,c*.4,`fill="none" stroke="currentColor" stroke-width="${f(sw*.6)}"`)+dot(sx,sy,c*.07);}
    return g;};
  main+=zone(ya+w*.04,cy-R-w*.06)+zone(cy+R+w*.06,h-m-w*.08);
  return {main,det};
}
function simple(w,h){
  const s=w/120,m=w*.08,sw=3*s;let main=frame2(w,h,m,sw),det="";
  const i=m+w*.13;main+=lineRect(i,i,w-2*i,h-2*i,sw*.6);
  const c=m+w*.075;
  [[c,c,135],[w-c,c,225],[c,h-c,45],[w-c,h-c,315]].forEach(p=>{main+=leaf(p[0],p[1],s*.55,p[2])+leaf(p[0],p[1],s*.4,p[2]-40)+leaf(p[0],p[1],s*.4,p[2]+40)+dot(p[0],p[1],w*.012);});
  [h*.5].forEach(y=>{main+=dot(i,y,w*.012)+dot(w-i,y,w*.012);});
  return {main,det};
}

const BUILD={royal,classic,medallion,vine,twin,lotus,shapla,peacock,tree,kalka,pyramid,mandala,islamic,modern,simple};

/* ---------- uploaded carving ---------- */
/**
 * An uploaded carving is a traced SVG, not one of the 15 built-ins. Everything below
 * treats it exactly like a built-in: it only has to return {main, det} the same way
 * BUILD[key](w,h) does, so the three-layer shadow/highlight/colour pass applies to it
 * unchanged. That is the whole reason the picture is vectorised in the first place.
 * `fit` is optional: { scale, dx, dy } from the preview sliders, all relative.
 */
function uploadedLeaf(svgText,w,h,fit){
  if(!svgText) return null;
  const open=/<svg[^>]*>/i.exec(svgText);
  if(!open) return null;
  const tag=open[0];
  const inner=svgText.slice(open.index+tag.length).replace(/<\/svg\s*>\s*$/i,"");
  if(!inner.trim()) return null;

  // The traced carving keeps the coordinates it had inside the photo, and its viewBox
  // crops down to the ink: "400 100 200 300" means the drawing starts 400 across and
  // 100 down. Reading only the last two numbers and ignoring the first two - which is
  // what this used to do - dropped the carving a whole viewBox origin to the right and
  // down, so it walked off the leaf and over the frame. The origin has to come out too,
  // and be subtracted again before the leaf places it.
  let vx=0,vy=0,vw=0,vh=0;
  const vb=/viewBox\s*=\s*["']([^"']+)["']/i.exec(tag);
  if(vb){
    const p=vb[1].trim().split(/[\s,]+/).map(Number);
    if(p.length===4&&p.every(n=>isFinite(n))&&p[2]>0&&p[3]>0){vx=p[0];vy=p[1];vw=p[2];vh=p[3];}
  }
  if(!vw||!vh){
    const wq=/\bwidth\s*=\s*["']?([\d.]+)/i.exec(tag), hq=/\bheight\s*=\s*["']?([\d.]+)/i.exec(tag);
    vw=wq?+wq[1]:0; vh=hq?+hq[1]:0; vx=0; vy=0;
  }
  if(!(vw>0)||!(vh>0)) return null;

  const m=w*0.09;                                  // same margin the built-ins leave
  const base=Math.min((w-2*m)/vw,(h-2*m)/vh);
  if(!(base>0)) return null;
  // The slider is a multiplier on that margin fit, so it is held to what the leaf can
  // hold: at the top of its range the carving reaches the leaf edge and no further.
  const want=fit&&fit.scale>0?fit.scale:1;
  const k=base*Math.max(0.1,Math.min(want,Math.min(w/(vw*base),h/(vh*base))));
  const dx=fit&&isFinite(fit.dx)?fit.dx:0, dy=fit&&isFinite(fit.dy)?fit.dy:0;
  // Centre first, then nudge, then clamp the nudge so it can never push the drawing
  // off the leaf however far the slider is dragged.
  const x=clamp((w-vw*k)/2+dx*w,Math.min(0,w-vw*k),Math.max(0,w-vw*k));
  const y=clamp((h-vh*k)/2+dy*h,Math.min(0,h-vh*k),Math.max(0,h-vh*k));
  // translate(-vx -vy) undoes the viewBox origin, so the ink starts at 0,0 before it is placed
  const shift=(vx||vy)?` translate(${f(-vx)} ${f(-vy)})`:"";
  // The scale needs more decimals than a coordinate does. A traced carving can be a
  // thousand units tall, so two decimals on the scale alone is a couple of units of
  // error at the far end - enough to push the bottom of the drawing back over the edge
  // the clamp above just pulled it inside.
  return {main:`<g transform="translate(${f(x)} ${f(y)}) scale(${+k.toPrecision(8)})${shift}">${inner}</g>`,det:""};
}

/* ---------- leaf renderer ---------- */
let uid=0;
function leafSVG(design,w,h,doorHex,orn,opts){
  const id="l"+(uid++);
  const edge=mix(doorHex,"#000",.28);
  let out=`<defs><filter id="g${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.42" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.3 0.92"/></filter>`;
  const uploaded = !!(opts&&opts.designSvg);
  const d = uploaded ? uploadedLeaf(opts.designSvg,w,h,opts.fit)
          : (design!=="plain"&&BUILD[design]) ? BUILD[design](w,h)
          : null;
  if(d) out+=`<g id="o${id}">${d.main}</g>`;
  // A traced carving is whatever the photo happened to contain, so the leaf holds it to
  // its own edges: nothing it draws may land on the frame, the wall or the dimension
  // lines. The 15 built-ins are drawn to fit and are left untouched, so they render
  // exactly as before.
  if(d&&uploaded) out+=`<clipPath id="nkc${id}"><rect width="${f(w)}" height="${f(h)}"/></clipPath>`;
  out+=`</defs>`;
  out+=`<rect width="${f(w)}" height="${f(h)}" fill="${doorHex}"/>`;
  out+=`<rect width="${f(w)}" height="${f(h)}" filter="url(#g${id})" opacity="${lum(doorHex)>.5?.1:.22}"/>`;
  out+=`<rect x="1" y="1" width="${f(w-2)}" height="${f(h-2)}" fill="none" stroke="${edge}" stroke-width="2"/>`;
  if(d){
    const k=Math.max(1.1,w/90);
    if(uploaded) out+=`<g clip-path="url(#nkc${id})">`;
    out+=`<use href="#o${id}" style="color:#000" opacity=".42" transform="translate(${f(k)} ${f(k*1.3)})"/>`;
    out+=`<use href="#o${id}" style="color:#fff" opacity="${lum(doorHex)>.6?.55:.28}" transform="translate(${f(-k*.7)} ${f(-k*.8)})"/>`;
    out+=`<use href="#o${id}" style="color:${orn}"/>`;
    out+=`<g>${d.det}</g>`;
    if(uploaded) out+=`</g>`;
  }
  if(opts&&opts.handle){
    const hx=w-w*.09, hy=h*.52;
    out+=`<rect x="${f(hx-3)}" y="${f(hy-14)}" width="6" height="28" rx="3" fill="#6d6f70"/><rect x="${f(hx-22)}" y="${f(hy-3)}" width="26" height="6" rx="3" fill="#a9acae"/>`;
  }
  return out;
}


function ftin(v){const ft=Math.floor(v+1e-6);const inch=Math.round((v-ft)*12);return inch===12?`${ft+1}' 0"`:`${ft}' ${inch}"`;}

/**
 * Full door with frame + dimension lines.
 * opts: { type:"SINGLE"|"DOUBLE", heightFt, widthFt, doorHex, designKey|null, ornHex, dims:true, inkHex }
 * returns { viewBox, svg }
 */
function renderDoor(o){
  const W=o.widthFt*U, H=o.heightFt*U, FT=.38*U, padL=16, padT=16, padR=o.dims===false?16:62, padB=o.dims===false?16:56;
  const vbW=padL+FT*2+W+padR, vbH=padT+FT+H+padB;
  const doorHex=o.doorHex, orn=o.ornHex, design=o.designKey&&BUILD[o.designKey]?o.designKey:"plain";
  // An uploaded carving has no BUILD entry; its drawing comes in as o.designSvg.
  const extra={handle:true, designSvg:o.designSvg||null, fit:o.fit||null};
  const frame=mix(doorHex,"#000000",.35), ink=o.inkHex||"#6b6259";
  const ox=padL+FT, oy=padT+FT;
  let g=`<rect x="${padL}" y="${padT}" width="${f(W+FT*2)}" height="${f(H+FT)}" fill="${frame}"/>`;
  g+=`<rect x="${f(ox-3)}" y="${f(oy-3)}" width="${f(W+6)}" height="${f(H+3)}" fill="${mix(frame,"#000000",.3)}"/>`;
  if(o.type!=="DOUBLE"){
    g+=`<g transform="translate(${f(ox)} ${f(oy)})">${leafSVG(design,W,H,doorHex,orn,extra)}</g>`;
  }else{
    const lw=W/2;
    g+=`<g transform="translate(${f(ox)} ${f(oy)})">${leafSVG(design,lw,H,doorHex,orn,extra)}</g>`;
    // the right leaf is mirrored, same as every built-in: an asymmetric upload shows reversed here
    g+=`<g transform="translate(${f(ox+W)} ${f(oy)}) scale(-1 1)">${leafSVG(design,lw,H,doorHex,orn,extra)}</g>`;
  }
  g+=`<rect x="${f(padL-6)}" y="${f(padT+FT+H)}" width="${f(W+FT*2+12)}" height="5" fill="${mix(frame,"#000000",.2)}"/>`;
  if(o.dims!==false){
    const dy=padT+FT+H+30, dx=padL+FT*2+W+30, dim=`stroke="${ink}" stroke-width="1.2"`;
    g+=`<path d="M${f(ox)} ${f(dy)} H${f(ox+W)} M${f(ox)} ${f(dy-6)} V${f(dy+6)} M${f(ox+W)} ${f(dy-6)} V${f(dy+6)}" ${dim}/>`;
    g+=`<text x="${f(ox+W/2)}" y="${f(dy+19)}" text-anchor="middle" font-family="monospace" font-size="13" fill="${ink}">${ftin(o.widthFt)}</text>`;
    g+=`<path d="M${f(dx)} ${f(oy)} V${f(oy+H)} M${f(dx-6)} ${f(oy)} H${f(dx+6)} M${f(dx-6)} ${f(oy+H)} H${f(dx+6)}" ${dim}/>`;
    g+=`<text x="${f(dx+10)}" y="${f(oy+H/2+4)}" font-family="monospace" font-size="13" fill="${ink}" transform="rotate(-90 ${f(dx+10)} ${f(oy+H/2)})" text-anchor="middle">${ftin(o.heightFt)}</text>`;
  }
  return { viewBox:`0 0 ${f(vbW)} ${f(vbH)}`, svg:g };
}

/** Small thumbnail of one leaf (for cards) */
function renderThumb(designKey, doorHex, ornHex, designSvg){
  return { viewBox:"-14 -12 148 224", svg: leafSVG(designKey&&BUILD[designKey]?designKey:"plain",120,200,doorHex,ornHex,{designSvg:designSvg||null}) };
}

const DESIGN_KEYS = Object.keys(BUILD);
module.exports = { renderDoor, renderThumb, toneOf, lum, mix, ftin, DESIGN_KEYS };
