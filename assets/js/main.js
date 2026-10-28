(function(){
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
const hero = document.getElementById('hero');
const line1Text = 'I write code to rewrite';
const line2Prefix = 'a new ';
const line2Word = 'world';
const line2Suffix = '.';

function startTypingHero() {
  if (!hero) return;
  hero.innerHTML = `
    <span class="hero-line hero-line-1"><span class="t1"></span></span>
    <span class="hero-line hero-line-2"><span class="t2"></span><span class="type-cursor">_</span></span>
  `;
  const t1 = hero.querySelector('.t1');
  const t2 = hero.querySelector('.t2');
  const cursor = hero.querySelector('.type-cursor');
  
  if (reduce) {
    if (t1) t1.textContent = line1Text;
    if (t2) t2.innerHTML = `${line2Prefix}<span class="word-glint">${line2Word}</span>${line2Suffix}`;
    if (cursor) cursor.remove();
    return;
  }
  
  let i = 0, j = 0;
  const fullLine2 = line2Prefix + line2Word + line2Suffix;
  
  function type1() {
    if (i < line1Text.length) {
      const char = line1Text[i++];
      if (t1) t1.textContent += char;
      const delay = (char === ' ' ? 140 : 85) + Math.random() * 35;
      setTimeout(type1, delay);
    } else {
      setTimeout(type2, 450); // Natural pause between line 1 and line 2
    }
  }
  
  function type2() {
    if (j < fullLine2.length) {
      j++;
      const current = fullLine2.slice(0, j);
      const char = fullLine2[j - 1];
      if (current.includes(line2Prefix + line2Word)) {
        const afterWord = current.slice((line2Prefix + line2Word).length);
        if (t2) t2.innerHTML = `${line2Prefix}<span class="word-glint">${line2Word}</span>${afterWord}`;
      } else if (current.startsWith(line2Prefix)) {
        const partial = current.slice(line2Prefix.length);
        if (t2) t2.innerHTML = `${line2Prefix}<span class="word-glint">${partial}</span>`;
      } else {
        if (t2) t2.textContent = current;
      }
      const delay = (char === ' ' ? 140 : 90) + Math.random() * 40;
      setTimeout(type2, delay);
    } else {
      if (t2) t2.innerHTML = `${line2Prefix}<span class="word-glint">${line2Word}</span>${line2Suffix}`;
      setTimeout(() => {
        if (cursor) {
          cursor.style.transition = 'opacity 0.8s';
          cursor.style.opacity = '0';
        }
      }, 3000);
    }
  }
  
  type1();
}

// Background reveal logic: starts full black, reveals on text hover or scroll, and STAYS VISIBLE PERMANENTLY (tidak hilang saat berhenti di-hover)
const glCanvas = document.getElementById('gl');
let permanentlyRevealed = false;

function revealBgPermanently() {
  if (permanentlyRevealed) return;
  permanentlyRevealed = true;
  if (glCanvas) glCanvas.classList.add('revealed');
  document.body.classList.add('hero-hovered', 'scrolled');
}

// When text is hovered, reveal and KEEP IT VISIBLE (no hide on pointerleave!)
if (hero) {
  hero.addEventListener('pointerenter', revealBgPermanently);
  hero.addEventListener('pointerover', revealBgPermanently);
}

// Once scrolled even once, also reveal and keep visible permanently
window.addEventListener('scroll', revealBgPermanently, { passive: true });
window.addEventListener('wheel', revealBgPermanently, { passive: true });
window.addEventListener('touchmove', revealBgPermanently, { passive: true });
window.addEventListener('keydown', e => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
    revealBgPermanently();
  }
}, { passive: true });

let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance'}); }
catch(e){ canvas.remove(); return; } // static fallback: text remains

const cores = navigator.hardwareConcurrency||4, mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const tier = mobile ? 0 : cores<=4 ? 1 : 2;
const dprCap = () => Math.min(devicePixelRatio,2)*(tier===0?0.75:1);
renderer.setClearColor(0x000000,1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55,1,0.1,400);
camera.position.set(0,0,60);
function resize(){
  renderer.setPixelRatio(dprCap());
  renderer.setSize(innerWidth,innerHeight,false);
  if(window.POST&&POST.size)POST.size();
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
}
resize();

/* ---- Starfield: twinkling, size-attenuated points with depth-weighted parallax ---- */
const N = [3000,9000,18000][tier];
const pos = new Float32Array(N*3), size = new Float32Array(N), seed = new Float32Array(N);
for(let i=0;i<N;i++){
  const u=Math.random()*2-1, th=Math.random()*Math.PI*2, s=Math.sqrt(1-u*u), r=40+Math.random()*140;
  pos[i*3]=r*s*Math.cos(th); pos[i*3+1]=r*u; pos[i*3+2]=r*s*Math.sin(th);
  size[i]=0.4+Math.pow(Math.random(),4)*2.2; seed[i]=Math.random();
}
const sg = new THREE.BufferGeometry();
sg.setAttribute('position',new THREE.BufferAttribute(pos,3));
sg.setAttribute('aSize',new THREE.BufferAttribute(size,1));
sg.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
const sm = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uPR:{value:1},uBright:{value:1},uOff:{value:new THREE.Vector2()},uDim:{value:1},uAsp:{value:1},uPtr:{value:new THREE.Vector2(9,9)}},
  vertexShader:`
    uniform float uTime,uPR,uBright,uDim,uAsp; uniform vec2 uOff,uPtr;
    attribute float aSize,aSeed; varying float vA,vM;
    void main(){
      vec3 p=position; p.xy+=uOff*(0.5+aSeed);              // deeper stars move less
      vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
      float tw=0.65+0.35*sin(uTime*(0.6+aSeed*2.0)+aSeed*40.0);
      vec2 nd=gl_Position.xy/gl_Position.w-uPtr; nd.x*=uAsp; float ob=smoothstep(0.4,0.0,length(nd));   // observer effect: stars only fully "exist" near the cursor
      gl_PointSize=aSize*uPR*tw*(180.0/-mv.z)*(1.0+ob*0.8);               // perspective size attenuation
      vA=tw*uBright*mix(uDim,1.35,ob); vM=aSeed;
    }`,
  fragmentShader:`
    varying float vA,vM;
    void main(){
      float d=length(gl_PointCoord-0.5);
      float a=pow(smoothstep(0.5,0.0,d),1.8)*vA;             // soft round falloff
      vec3 c=mix(vec3(0.30,0.91,1.0),vec3(0.55,0.36,0.96),vM);
      gl_FragColor=vec4(mix(c,vec3(1.0),0.5),a);
    }`
});
const stars = new THREE.Points(sg,sm); stars.frustumCulled=false; scene.add(stars);

/* ---- Orb: fresnel rim glow, brightened on the side facing the mouse ---- */
const og = new THREE.SphereGeometry(3,64,64);
const om = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uMouse:{value:new THREE.Vector3(0,0,1)}},
  vertexShader:`
    varying vec3 vN,vV;
    void main(){
      vN=normalize(normalMatrix*normal);
      vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz);
      gl_Position=projectionMatrix*mv;
    }`,
  fragmentShader:`
    uniform float uTime; uniform vec3 uMouse; varying vec3 vN,vV;
    void main(){
      float f=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),2.5);   // fresnel
      float m=0.5+0.5*dot(normalize(vN),normalize(uMouse));              // mouse-facing boost
      float pulse=0.9+0.1*sin(uTime*1.2);
      vec3 c=mix(vec3(0.55,0.36,0.96),vec3(0.30,0.91,1.0),m);
      gl_FragColor=vec4(c*(0.08+f*(0.6+m*1.2))*pulse,1.0);
    }`
});
/* ---- Marble head hologram: flat (2D) portrait made of blue dots; dot size + brightness follow the marble's light and shadow ---- */
const orb=new THREE.Group();orb.position.set(7,1,0);scene.add(orb);
const HU={uTime:{value:0},uPR:{value:1},uK:{value:700},uD:{value:.06}};
{
 const HV='uniform float uTime,uPR,uK,uD;attribute float aL;varying float vY,vL;void main(){vec3 p=position;float b=step(0.985,fract(sin(floor(uTime*7.0))*43758.5))*step(abs(p.y-sin(uTime*2.3)*3.5),0.4);p.x+=b*0.35;   // glitch band\n'+
  'vY=p.y;vL=aL;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.5,uPR*uK*uD*(0.45+0.95*aL)/-mv.z);}';   // dot size follows brightness
 const HF='uniform float uTime;varying float vY,vL;void main(){float a=smoothstep(0.5,0.12,length(gl_PointCoord-0.5));'+
  'float sc=0.5+0.5*smoothstep(0.2,1.0,0.5+0.5*sin(vY*14.0-uTime*3.0));float fl=0.9+0.1*sin(uTime*37.0)*sin(uTime*11.0);'+   // scanlines + flicker
  'float by=mod(uTime*2.2,11.0)-5.5;float beam=exp(-pow((vY-by)*1.8,2.0))*1.4;'+                                                // bright sweep travelling up the portrait
  'vec3 c=mix(vec3(0.12,0.42,1.0),vec3(0.45,0.86,1.0),vL)+beam*vec3(0.25,0.45,0.55);gl_FragColor=vec4(c*1.2,min(1.0,a*sc*fl*(0.3+0.9*vL+beam*0.6)));}';
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:HU,vertexShader:HV,fragmentShader:HF});
 const img=new Image();
 img.onload=()=>{
  const W=img.width,H=img.height,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c2=cv.getContext('2d');c2.drawImage(img,0,0);
  const D=c2.getImageData(0,0,W,H).data,S=9.4/H,st=[3,2,2][tier],P=[],PL=[];                         // S: world units per pixel (portrait is 9.4 units tall), st: dot grid spacing in pixels
  for(let y=0;y<H;y+=st)for(let x=0;x<W;x+=st){const i=(y*W+x)*4;if(D[i+3]<128)continue;const l=D[i]/255;if(l<.1)continue;P.push((x-W/2)*S,(H/2-y)*S,0);PL.push(l);}
  HU.uD.value=S*st*0.9;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aL',new THREE.Float32BufferAttribute(PL,1));
  const pts=new THREE.Points(g,mat);pts.frustumCulled=false;orb.add(pts);  };
 img.src="data:image/png;base64,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";
}

/* ================= BRAIN (procedural) ================= */
/* SK data loaded from assets/js/skills-data.js */

const BY=-30;                                   // brain world Y; the camera flies down to it
const brain=new THREE.Group(); brain.position.set(0,BY,0); brain.scale.setScalar(8); brain.rotation.y=Math.PI/2; brain.visible=false; scene.add(brain);
// Uniforms shared by particles + synapses: hover highlight, shockwave, boost
const U={uTime:{value:0},uPR:{value:1},uRes:{value:new THREE.Vector2(1,1)},uW:{value:1.5},uHot:{value:new THREE.Vector3(9,9,9)},uHotR:{value:0},uWC:{value:new THREE.Vector3()},uWR:{value:-1},uBoost:{value:0},uFade:{value:0}};
const fold=(x,y,z)=>Math.sin(x*9+y*3)*Math.sin(y*8-z*4)*Math.sin(z*9+x*5)+0.5*Math.sin(x*19-y*13+z*5)*Math.sin(z*17+y*11); // gyri/sulci noise (two octaves)
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const sm5=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*t*(t*(t*6-15)+10);};   // smootherstep: zero velocity AND acceleration at both ends
// Human-brain hemisphere: unit direction -> surface point. Temporal lobe bulge, flattened underside, tapered occipital pole, longitudinal fissure (+0.07)
function hemi(dx,dy,dz,side){
 const r=1+0.09*fold(dx,dy,dz),lf=sstep(0.15,-0.5,dy)*sstep(-0.6,0.4,dz);
 let y=dy;if(y<-0.35)y=-0.35+(y+0.35)*0.45;
 return [side*(Math.abs(dx)*0.5*(1+0.28*lf)*(dz<-0.5?0.92:1)*r+0.07),0.12+y*0.6*r-0.1*lf,dz*0.95*r];}
// Skill nodes sit on the lateral (left) hemisphere surface, which faces the camera in the default side view
const DIR={laravel:[-0.3,0.35,0.95],nuxt:[-0.95,0.3,0.15],tailwind:[-0.1,1,0.05],database:[0.5,0.8,-0.4,1],ai:[-0.3,0.3,-0.95],devops:[0.45,0.7,0.6,1]}; // [x,y,z,side]; side 1 = far hemisphere
SK.forEach(s=>{const d=DIR[s.id];if(!d)return;const l=Math.hypot(d[0],d[1],d[2]),q=hemi(d[0]/l,d[1]/l,d[2]/l,d[3]||-1);s.p=[q[0]*1.03,q[1]*1.03,q[2]*1.03];});
function surf(cx,cy,cz,sx,sy,sz,side){            // random point on a noise-deformed ellipsoid surface
  const u=Math.random()*2-1,th=Math.random()*6.2832,s=Math.sqrt(1-u*u);
  const x=s*Math.cos(th),y=u,z=s*Math.sin(th),r=1+0.07*fold(x,y,z);
  return [side?side*(Math.abs(x)*sx*r+0.04):cx+x*sx*r, cy+y*sy*r, cz+z*sz*r];
}
const BN=[1800,2600,3400][tier],P=[];
const rd=()=>{const u=Math.random()*2-1,th=Math.random()*6.2832,s=Math.sqrt(1-u*u);return [s*Math.cos(th),u,s*Math.sin(th)];};
for(let i=0;i<BN;i++){const q=Math.random();
 if(q<0.84){const d=rd();P.push(hemi(d[0],d[1],d[2],Math.random()<0.5?-1:1));}       // cerebral hemispheres
 else if(q<0.96)P.push(surf(0,-0.45,-0.55,0.35,0.2,0.3,0));                             // cerebellum
 else{const a=Math.random()*6.2832,t=Math.random();P.push([Math.cos(a)*0.08,-0.4-t*0.45,-0.28-t*0.05+Math.sin(a)*0.08]);}} // brainstem
const bpos=new Float32Array(BN*3),bseed=new Float32Array(BN);
P.forEach((p,i)=>{bpos.set(p,i*3);bseed[i]=Math.random();});
const bg=new THREE.BufferGeometry();
bg.setAttribute('position',new THREE.BufferAttribute(bpos,3));bg.setAttribute('aSeed',new THREE.BufferAttribute(bseed,1));
const COMMON=`uniform float uTime,uHotR,uWR,uBoost,uFade;uniform vec3 uHot,uWC;
float hotAt(vec3 p){return uHotR>0.001?smoothstep(uHotR,0.0,distance(p,uHot)):0.0;}      // hover highlight radius
float waveAt(vec3 p){return uWR>=0.0?smoothstep(0.14,0.0,abs(distance(p,uWC)-uWR)):0.0;} // expanding shockwave ring
vec3 grad(vec3 p){return mix(vec3(0.30,0.91,1.0),vec3(0.55,0.36,0.96),clamp(p.y*0.9+0.4,0.0,1.0));}
float cutAt(vec3 p){return smoothstep(0.05,0.3,p.y);}   // hides everything below the upper dome
`;
const bm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:U,
 vertexShader:COMMON+`uniform float uPR;attribute float aSeed;varying vec3 vP;varying float vK;
  void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;
   float pulse=0.7+0.3*sin(uTime*1.5+aSeed*30.0);float h=hotAt(position),w=waveAt(position);
   vK=pulse*(0.12+h*1.0+w*1.5+uBoost*0.3)*cutAt(position)*uFade;gl_PointSize=(1.0+h*2.0+w*3.0)*uPR*(25.0/-mv.z);}`,
 fragmentShader:COMMON+`varying vec3 vP;varying float vK;
  void main(){float d=length(gl_PointCoord-0.5);float a=pow(smoothstep(0.5,0.0,d),1.6)*vK;gl_FragColor=vec4(grad(vP)*1.2,a);}`});
const bpts=new THREE.Points(bg,bm);bpts.frustumCulled=false;brain.add(bpts);
// Synapses: link each point to up to 3 neighbours; a pulse travels along each segment
const L=[],LP=[],LE=[];const TH2=0.15*0.15;
for(let i=0;i<BN;i++){let c=0;for(let j=i+1;j<BN&&c<1;j++){const a=P[i],b=P[j],dx=a[0]-b[0],dy=a[1]-b[1],dz=a[2]-b[2];
 if(dx*dx+dy*dy+dz*dz<TH2){const ph=Math.random();L.push(...a,...b);LP.push(ph,ph);LE.push(0,1);c++;}}}
const lg=new THREE.BufferGeometry();
lg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(L),3));
lg.setAttribute('aPhase',new THREE.BufferAttribute(new Float32Array(LP),1));
lg.setAttribute('aEnd',new THREE.BufferAttribute(new Float32Array(LE),1));
// WebGL lines are always 1px, which is nearly invisible. Convert each line segment into a screen-space quad (width in px) so fibres read as real strokes.
function quad(g){const P=g.attributes.position.array,Ph=g.attributes.aPhase.array,E=g.attributes.aEnd.array,n=P.length/6;
 const pos=new Float32Array(n*12),oth=new Float32Array(n*12),side=new Float32Array(n*4),tt=new Float32Array(n*4),ph=new Float32Array(n*4),en=new Float32Array(n*4),idx=new Uint32Array(n*6);
 for(let k=0;k<n;k++){const a=k*6,b=a+3;
  for(let v=0;v<4;v++){const own=v<2?a:b,ot=v<2?b:a,o=k*4+v;
   pos.set([P[own],P[own+1],P[own+2]],o*3);oth.set([P[ot],P[ot+1],P[ot+2]],o*3);
   side[o]=(v&1)?1:-1;tt[o]=v<2?0:1;ph[o]=Ph[k*2];en[o]=E[k*2+(v<2?0:1)];}
  const i=k*4;idx.set([i,i+1,i+2,i+1,i+3,i+2],k*6);}
 const q=new THREE.BufferGeometry();
 q.setAttribute('position',new THREE.BufferAttribute(pos,3));q.setAttribute('aOther',new THREE.BufferAttribute(oth,3));q.setAttribute('aSide',new THREE.BufferAttribute(side,1));
 q.setAttribute('aT',new THREE.BufferAttribute(tt,1));q.setAttribute('aPhase',new THREE.BufferAttribute(ph,1));q.setAttribute('aEnd',new THREE.BufferAttribute(en,1));
 q.setIndex(new THREE.BufferAttribute(idx,1));return q;}
const lm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:U,
 vertexShader:`uniform vec2 uRes;uniform float uW;attribute vec3 aOther;attribute float aSide,aT,aPhase,aEnd;varying float vE,vPh,vS;varying vec3 vP;
  void main(){vE=aEnd;vPh=aPhase;vS=aSide;vP=position;
   mat4 m=projectionMatrix*modelViewMatrix;vec4 c0=m*vec4(position,1.0),c1=m*vec4(aOther,1.0);
   vec2 d=((c1.xy/c1.w)-(c0.xy/c0.w))*uRes*0.5;if(aT>0.5)d=-d;       // screen-space direction of the stroke
   d=normalize(d+vec2(1e-5));vec2 n=vec2(-d.y,d.x);
   gl_Position=c0;gl_Position.xy+=n*aSide*uW/uRes*c0.w;}`,           // push the vertex sideways by half the stroke width
 fragmentShader:COMMON+`varying float vE,vPh,vS;varying vec3 vP;
  void main(){float pulse=smoothstep(0.25,0.0,abs(fract(uTime*0.35+vPh)*1.6-0.3-vE));   // light pulse travelling along the fibre
   float a=(0.12+pulse*0.35+hotAt(vP)*0.4+waveAt(vP)*0.5+uBoost*0.05)*cutAt(vP)*uFade*(1.0-smoothstep(0.5,1.0,abs(vS))); // soft stroke edge
   gl_FragColor=vec4(grad(vP),a);}`});
const lines=new THREE.Mesh(quad(lg),lm);lines.frustumCulled=false;brain.add(lines);
// Neuron tracts: long fibres that follow the gyri around each hemisphere, so the pathways themselves draw the brain's shape
function sp(side,u,th){const s=Math.sqrt(1-u*u);return hemi(s*Math.cos(th),u,s*Math.sin(th),side);}
const TP=[],TPh=[],TE=[],TR=[40,70,100][tier],ST=56;
function pushTract(pts){const ph=Math.random();for(let j=0;j<pts.length-1;j++){TP.push(...pts[j],...pts[j+1]);TPh.push(ph,ph);TE.push(j/(pts.length-1),(j+1)/(pts.length-1));}}
for(let side=-1;side<=1;side+=2)for(let i=0;i<TR;i++){
 const u0=Math.random()*1.6-0.8,th0=Math.random()*6.2832,dth=(Math.random()<0.5?-1:1)*(0.035+Math.random()*0.05),amp=0.04+Math.random()*0.1,k=8+Math.random()*10,ph=Math.random()*6.2832,pts=[];
 for(let j=0;j<=ST;j++)pts.push(sp(side,Math.max(-0.95,Math.min(0.95,u0+amp*Math.sin(j/ST*k+ph))),th0+j*dth));
 pushTract(pts);}
for(let i=0;i<28;i++){const z=-0.7+1.4*i/27,pts=[];                                 // corpus callosum: arches bridging the hemispheres
 for(let j=0;j<=24;j++){const t=j/24;pts.push([-0.5+t,0.12+0.38*Math.sin(Math.PI*t)*(1-0.4*Math.abs(z)),z]);}pushTract(pts);}
// Landmark lines that make the lines read as a human brain: Sylvian fissure, central sulcus, cerebellar folds, brainstem
for(const sd of [-1,1]){
 const nz=v=>{const l=Math.hypot(...v);return v.map(a=>a/l);},lat=[],cen=[];
 for(let j=0;j<=30;j++){const t=j/30,w=0.04*Math.sin(t*9);
  lat.push(hemi(...nz([0.95,-0.25+0.45*t+w,0.55-1.1*t]),sd));      // lateral fissure: low-front -> high-back
  cen.push(hemi(...nz([0.12+0.8*t+w,0.98-1.03*t,0.05+0.25*t]),sd));} // central sulcus: top midline -> down toward the temporal lobe
 pushTract(lat);pushTract(cen);
 const st=[];for(let j=0;j<=8;j++){const t=j/8;st.push([sd*(0.05+0.02*t),-0.4-0.5*t,-0.3-0.08*t]);}pushTract(st);} // brainstem edges
for(let k=0;k<8;k++){const u=-0.85+k*0.24,rr=Math.sqrt(1-u*u),pts=[];                     // cerebellum: stacked folds
 for(let j=0;j<=40;j++){const a=j/40*6.2832;pts.push([Math.cos(a)*0.35*rr,-0.45+u*0.2,-0.55+Math.sin(a)*0.3*rr]);}pushTract(pts);}
const tg2=new THREE.BufferGeometry();
tg2.setAttribute('position',new THREE.BufferAttribute(new Float32Array(TP),3));tg2.setAttribute('aPhase',new THREE.BufferAttribute(new Float32Array(TPh),1));tg2.setAttribute('aEnd',new THREE.BufferAttribute(new Float32Array(TE),1));
const tracts=new THREE.Mesh(quad(tg2),lm);tracts.frustumCulled=false;brain.add(tracts);
// Translucent cortex surface (fresnel rim + gyri shading) gives the point cloud a solid brain silhouette
function hemiGeo(side){const g=new THREE.SphereGeometry(1,72,56),p=g.attributes.position,fo=new Float32Array(p.count);
 for(let i=0;i<p.count;i++){const dx=p.getX(i),dy=p.getY(i),dz=p.getZ(i),q=hemi(dx,dy,dz,side);p.setXYZ(i,q[0],q[1],q[2]);fo[i]=fold(dx,dy,dz);}
 g.setAttribute('aF',new THREE.BufferAttribute(fo,1));g.computeVertexNormals();return g;}
const cortexM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:U,
 vertexShader:'attribute float aF;varying vec3 vN,vV,vP;varying float vF;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);vP=position;vF=aF;gl_Position=projectionMatrix*mv;}',
 fragmentShader:COMMON+'varying vec3 vN,vV,vP;varying float vF;void main(){float f=1.0-abs(dot(normalize(vN),normalize(vV)));float a=(0.01+pow(f,2.5)*0.3+smoothstep(-0.2,0.6,vF)*0.03+hotAt(vP)*0.12+waveAt(vP)*0.2)*cutAt(vP)*uFade;gl_FragColor=vec4(grad(vP),a);}'});
[-1,1].forEach(sd=>{const m=new THREE.Mesh(hemiGeo(sd),cortexM);m.frustumCulled=false;brain.add(m);});
// Skill nodes
const nG=new THREE.BufferGeometry(),nPos=new Float32Array(SK.length*3),nSize=new Float32Array(SK.length).fill(5),nAct=new Float32Array(SK.length);
SK.forEach((s,i)=>nPos.set(s.p,i*3));
nG.setAttribute('position',new THREE.BufferAttribute(nPos,3));nG.setAttribute('aSize',new THREE.BufferAttribute(nSize,1));nG.setAttribute('aAct',new THREE.BufferAttribute(nAct,1));
const nM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:U,
 vertexShader:`uniform float uPR,uFade;attribute float aSize,aAct;varying float vA,vF;
  void main(){vA=aAct;vF=uFade;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uPR*(95.0/-mv.z);}`,
 fragmentShader:`varying float vA,vF;void main(){float d=length(gl_PointCoord-0.5);float core=smoothstep(0.12,0.0,d),halo=pow(smoothstep(0.5,0.0,d),2.0);
  vec3 c=mix(vec3(0.30,0.91,1.0),vec3(1.0,0.30,0.82),vA);gl_FragColor=vec4(c*(halo*0.7+core*1.2)*vF,(halo+core)*vF);}`});
const nodes=new THREE.Points(nG,nM);nodes.frustumCulled=false;brain.add(nodes);

/* ---- Brain state, UI, interaction ---- */
const skillsEl=document.getElementById('skills'),panel=document.getElementById('panel'),lab=document.getElementById('lab'),cl=document.getElementById('cl'),list=skillsEl.querySelector('.sl');
const spin={v:0.08},drag={v:0,on:false,moved:0},focus={x:0,y:0,z:0},ptr={x:-999,y:-999,mouse:false};
let active=-1,hov=-1,kBrain=0;
let dive=0,warp=0,sT=0,flashV=0,diveR=0,sTR=0;   // *R = raw scroll progress, dive/sT = damped values used by every effect
const ddOf=el=>{const d=(el.offsetTop+el.offsetHeight/2-scrollY-innerHeight/2)/innerHeight,ex=Math.max(0,(el.offsetHeight-innerHeight)/2/innerHeight);return Math.sign(d)*Math.max(0,Math.abs(d)-ex);};   // a section taller than the screen counts as "centered" for as long as it covers the screen   // layout-based offset (ignores transforms): <0 = already passed                                   // dive: progress of leaving About (0..1); warp: streak/FOV intensity
let gN=2;const GW=new THREE.Vector3();               // gN: the node (facing the camera) that the dive heads into when leaving Skills; GW: its world position
const heroRef={x:0,y:0},ZW=new THREE.Vector3(),vz=new THREE.Vector3(),gate={x:innerWidth/2,y:innerHeight/2};
const v3=new THREE.Vector3(),scr=SK.map(()=>({x:0,y:0}));
function scramble(el,txt){clearInterval(el._t);if(reduce){el.textContent=txt;return;}let f=0;el._t=setInterval(()=>{
 el.textContent=[...txt].map((c,i)=>i<f/2||c===' '?c:'#%&@*+=?'[Math.random()*8|0]).join('');if(++f>txt.length*2){el.textContent=txt;clearInterval(el._t);}},30);}
function nearest(x,y,r){let b=-1,bd=r*r;SK.forEach((s,i)=>{const dx=scr[i].x-x,dy=scr[i].y-y,d=dx*dx+dy*dy;if(d<bd){bd=d;b=i;}});return b;}
function fill(s){panel.innerHTML=`<button class="x" aria-label="Close panel">\u00d7</button><p class="z">${s.zone}</p><h2>${s.label}</h2><div class="car">`+
 s.projects.map(p=>`<article><div class="th"${p.image?` style="background:url('${p.image}') center/cover no-repeat;border:1px solid rgba(77,232,255,0.3)"`:''}></div><h3>${p.title}</h3><p>${p.desc}</p><ul>${p.stack.map(t=>`<li>${t}</li>`).join('')}</ul><span class="y">${p.year}</span><a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.url.includes('vercel.app')?'Live Demo ↗':'View Project ↗'}</a></article>`).join('')+`</div>`;
 panel.querySelector('.x').onclick=deselect;}
function select(i){
 if(i===active)return;const first=active<0;active=i;const s=SK[i];fill(s);panel.setAttribute('aria-hidden','false');panel.style.pointerEvents='auto';
 const mob=matchMedia('(max-width:700px)').matches;gsap.set(panel,{yPercent:mob?0:-50});
 gsap.fromTo(panel,{opacity:0,y:first?28:10,filter:'blur(10px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.7,ease:'power3.out'});
 gsap.to(spin,{v:0,duration:.6});drag.v=0;
 let tgt=-Math.atan2(s.p[0],s.p[2]),cur=brain.rotation.y;tgt+=Math.round((cur-tgt)/6.2832)*6.2832; // shortest turn that faces the node to camera
 gsap.to(brain.rotation,{y:tgt,duration:1.4,ease:'power3.inOut'});
 gsap.to(focus,{x:mob?0:2.6,y:s.p[1]*6.4,z:-6,duration:1.4,ease:'power3.inOut'});          // fly toward the node's area
 U.uWC.value.fromArray(s.p);U.uWR.value=0;gsap.to(U.uWR,{value:2.4,duration:1.8,ease:'power2.out',onComplete:()=>{U.uWR.value=-1;}}); // shockwave
 gsap.fromTo(U.uBoost,{value:1.6},{value:0,duration:1.4,ease:'power2.out'});}               // brightness spike (bloom pass comes with post-FX)
function deselect(){if(active<0)return;active=-1;panel.setAttribute('aria-hidden','true');
 gsap.to(panel,{opacity:0,y:24,duration:.4,onComplete:()=>{panel.style.pointerEvents='none';}});
 gsap.to(focus,{x:0,y:0,z:0,duration:1.2,ease:'power3.inOut'});gsap.to(spin,{v:0.08,duration:1.5});cl.setAttribute('visibility','hidden');}
SK.forEach((s,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=s.label;b.onclick=e=>{e.stopPropagation();select(i);};li.append(b);list.append(li);});
addEventListener('keydown',e=>{if(e.key==='Escape')deselect();});
addEventListener('pointermove',e=>{ptr.x=e.clientX;ptr.y=e.clientY;ptr.mouse=e.pointerType==='mouse';
 if(drag.on&&active<0){brain.rotation.y+=e.movementX*0.006;drag.v=e.movementX*0.36;drag.moved+=Math.abs(e.movementX);}});
addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&kBrain>0.5&&!e.target.closest('#panel,.sl')){drag.on=true;drag.moved=0;}});
addEventListener('pointerup',()=>{drag.on=false;});
addEventListener('click',e=>{if(kBrain<0.4||e.target.closest('#panel,.sl')||drag.moved>5)return;
 const i=nearest(e.clientX,e.clientY,58);if(i>=0)select(i);else deselect();});

function placeCamera(time,dt){
 // Brain presence: appears IN PLACE after the flash (no camera travel), dissolves into the next flash when leaving Skills
 const inB=dive>=0.83&&sT<0.5,pin0=sm5(0.83,1.0,dive),k=pin0*(1-sm5(0.38,0.5,sT));kBrain=k*(1-sstep(0,0.08,sT));
 U.uFade.value=sstep(0,0.6,k);
 const hx=mouse.x*0.8+aboutShift,hy=-scrollP*6+mouse.y*0.5,hz=dolly.z-scrollP*4,ly=-scrollP*3,ty=BY+3+focus.y;
 heroRef.x=hx;heroRef.y=hy;zod.position.set(hx*0.5,hy*0.95,-32);
 // Dive: the camera accelerates toward the gate star of the Sagittarius drawing and passes through it
 const e=(reduce||dive>=0.83)?0:Math.pow(sm5(0.05,0.83,dive),2.0);
 ZW.set(ZT.x+zod.position.x,ZT.y+zod.position.y,ZT.z+zod.position.z);
 if(inB){
  const e2=reduce?0:Math.pow(sm5(0.04,0.5,sT),2.0),bx=focus.x+mouse.x*0.5,bz=16+focus.z;
  brain.updateMatrixWorld();
  if(sT<0.04){let best=-1e9;SK.forEach((n,i)=>{GW.fromArray(n.p);brain.localToWorld(GW);const sc=GW.z-0.4*Math.abs(GW.x-brain.position.x);if(sc>best){best=sc;gN=i;}});}   // lock the node that faces the camera right now; the brain keeps turning naturally
  GW.fromArray(SK[gN].p);brain.localToWorld(GW);GW.lerp(brain.position,0.4);   // aim a little inside the cortex
  camera.position.set(bx+(GW.x-bx)*e2,ty+(GW.y-ty)*e2,bz+(GW.z-bz)*e2);camera.lookAt(focus.x,ty,0);}   // base view (hard cut hidden under the flash) -> dive into the node
 else{camera.position.set(hx+(ZW.x-hx)*e,hy+(ZW.y-hy)*e,hz+(ZW.z+2.5-hz)*e);camera.lookAt(ZW.x*e,ly+(ZW.y-ly)*e,ZW.z*e);}
 camera.updateMatrixWorld();
 vz.copy(inB?GW:ZW).project(camera);                         // screen position of the gate star (origin of streaks + flash)
 const gOn=inB?(sT>0.001&&sT<0.999):(dive>0.001&&dive<0.999);
 if(gOn&&vz.z<1){gate.x=(vz.x*0.5+0.5)*innerWidth;gate.y=(-vz.y*0.5+0.5)*innerHeight;}else{gate.x=innerWidth/2;gate.y=innerHeight/2;}
 brain.visible=k>0.02;if(!brain.visible)return;
 const ke=1-Math.pow(1-pin0,3);brain.scale.setScalar(8*(0.5+0.5*ke));
 if(active<0){U.uWC.value.set(0,0.35,0);U.uWR.value=(pin0>0.01&&pin0<0.99)?ke*2.6:-1;}    // shockwave ring while the brain materialises
 if(active>=0&&(k<0.25||sT>0.03))deselect();
 if(active<0&&!drag.on){brain.rotation.y+=Math.cos(time*0.3)*spin.v*3*dt*(1-sstep(0.05,0.3,sT)*0.7)+drag.v*dt;drag.v*=Math.exp(-dt*2.5);}  // slow spin + drag inertia
 U.uTime.value=time;U.uPR.value=renderer.getPixelRatio();U.uRes.value.set(innerWidth*U.uPR.value,innerHeight*U.uPR.value);U.uW.value=1.1*U.uPR.value;
 camera.updateMatrixWorld();brain.updateMatrixWorld();
 SK.forEach((s,i)=>{v3.fromArray(s.p);brain.localToWorld(v3);v3.project(camera);scr[i].x=(v3.x*0.5+0.5)*innerWidth;scr[i].y=(-v3.y*0.5+0.5)*innerHeight;});
 const h=(kBrain>0.4&&ptr.mouse&&active<0)?nearest(ptr.x,ptr.y,52):-1;
 if(h!==hov){hov=h;document.body.style.cursor=h>=0?'pointer':'';if(h>=0){scramble(lab,SK[h].label);blip(620,0.12);}}
 const shown=hov>=0?hov:active;
 if(active>=0&&lab.textContent!==SK[active].label&&hov<0)lab.textContent=SK[active].label;
 SK.forEach((s,i)=>{const t=i===active?9:i===hov?7.5:5;nSize[i]+=(t-nSize[i])*Math.min(1,dt*10);nAct[i]=i===active?1:0;});
 nG.attributes.aSize.needsUpdate=true;nG.attributes.aAct.needsUpdate=true;
 if(shown>=0)U.uHot.value.fromArray(SK[shown].p);
 U.uHotR.value+=((shown>=0?0.55:0)-U.uHotR.value)*Math.min(1,dt*6);
 if(shown>=0){lab.style.opacity=1;lab.style.transform=`translate(${scr[shown].x+16}px,${scr[shown].y-8}px)`;}else lab.style.opacity=0;
 if(active>=0&&!matchMedia('(max-width:700px)').matches){const pr=panel.getBoundingClientRect();
  cl.setAttribute('visibility','visible');cl.setAttribute('x1',scr[active].x);cl.setAttribute('y1',scr[active].y);cl.setAttribute('x2',pr.left);cl.setAttribute('y2',pr.top+pr.height/2);}}

/* ================= SELECTED WORKS ================= */
const flare={v:1};                                   // star brightness multiplier used by the transmit burst
const pv=document.getElementById('pv'),ov=document.getElementById('ov');
const PV_BG=['linear-gradient(135deg,#8b5cf6,#4de8ff)',"url('assets/images/sistem_kasir.jpg') center/cover no-repeat",'linear-gradient(135deg,#4de8ff,#1a0f3a)'];
const pvS={x:0,y:0,tx:0,ty:0};
document.querySelectorAll('.wl a').forEach((a,i)=>{
 a.addEventListener('pointerenter',()=>{
   pv.style.background=PV_BG[i%3];
   pv.style.border='1px solid rgba(77,232,255,.35)';
   pv.style.boxShadow='0 12px 30px rgba(0,0,0,.6)';
   gsap.to(pv,{opacity:1,scale:1,duration:.35});
 });
 a.addEventListener('pointerleave',()=>gsap.to(pv,{opacity:0,scale:.85,duration:.3}));
 a.addEventListener('click',e=>{
   const href=a.getAttribute('href');
   if(href&&href!=='#'){
     if(a.target==='_blank'||href.startsWith('http')){
       window.open(href,'_blank');
       return;
     }
     e.preventDefault();
     gsap.set(ov,{left:e.clientX,top:e.clientY,scale:0,display:'block',opacity:1});
     gsap.to(ov,{scale:120,duration:.9,ease:'power3.in',onComplete:()=>{location.href=href;}});
   }
 });
});
addEventListener('pointermove',e=>{pvS.tx=e.clientX;pvS.ty=e.clientY;});
gsap.ticker.add((t,ms)=>{const k=1-Math.exp(-ms/1000*10),nx=pvS.x+(pvS.tx-pvS.x)*k,vx=nx-pvS.x;pvS.x=nx;pvS.y+=(pvS.ty-pvS.y)*k;
 gsap.set(pv,{x:pvS.x-130,y:pvS.y-85,skewX:reduce?0:Math.max(-18,Math.min(18,-vx*0.6))});}); // velocity-based skew

/* ================= CONTACT FORM ================= */
const tf=document.getElementById('tf'),st=document.getElementById('st');
const ENDPOINT='';                                   // e.g. 'https://formspree.io/f/xxxx'; empty = simulated send
function typeIt(el,txt){let i=0;el.textContent='';const t=setInterval(()=>{el.textContent=txt.slice(0,++i)+(i<txt.length?'_':'');if(i>=txt.length)clearInterval(t);},reduce?0:40);}
{const tt=()=>{if(Math.abs(ddOf(document.getElementById('contact')))<0.4){tf.querySelectorAll('.tl').forEach(el=>typeIt(el,el.dataset.t));gsap.ticker.remove(tt);}};gsap.ticker.add(tt);} // typing effect on first view
tf.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(tf),n=f.get('name').trim(),m=f.get('email').trim(),g=f.get('message').trim();
 const err=!n?'ERR: NAME REQUIRED':!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)?'ERR: INVALID EMAIL':g.length<10?'ERR: MESSAGE TOO SHORT (MIN 10)':'';
 st.textContent=err;if(err)return;st.textContent='TRANSMITTING...';
 try{if(ENDPOINT){const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name:n,email:m,message:g,constellation:sigData()})});if(!r.ok)throw 0;}
  else await new Promise(r=>setTimeout(r,900));}catch(_){st.textContent='ERR: TRANSMISSION FAILED. RETRY.';return;}
 tf.querySelectorAll('input,textarea,button').forEach(x=>{x.disabled=true;});scramble(st,'SIGNAL TRANSMITTED');
 gsap.fromTo(flare,{v:1},{v:2.4,duration:.6,yoyo:true,repeat:1});});                          // stars flare on success
document.querySelectorAll('.mag').forEach(el=>{if(reduce||!matchMedia('(pointer:fine)').matches)return;   // magnetic hover
 el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.35,y:(e.clientY-r.top-r.height/2)*.35,duration:.4,ease:'power3.out'});});
 el.addEventListener('pointerleave',()=>gsap.to(el,{x:0,y:0,duration:.7,ease:'elastic.out(1,.4)'}));});
const clk=document.getElementById('clk');setInterval(()=>{clk.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});},1000);
document.getElementById('top').addEventListener('click',()=>{glide(0,2.5);});

/* ================= POST-PROCESSING (bloom + aberration + vignette + grain) ================= */
const POST=window.POST={};
(function(){
 let comp=null,bloom,fx,vel=0,pS=0;
 if(tier>0&&THREE.EffectComposer&&THREE.UnrealBloomPass&&THREE.ShaderPass){            // tier 0 = no post FX
  comp=new THREE.EffectComposer(renderer);comp.addPass(new THREE.RenderPass(scene,camera));
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.5,0.6,0.2);comp.addPass(bloom);
  fx=new THREE.ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uAb:{value:0},uVig:{value:0.55},uGrain:{value:0.05}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uAb,uVig,uGrain;varying vec2 vUv;
    float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec2 c=vUv-0.5;float d=dot(c,c);vec2 off=c*uAb*(0.4+d*3.0);              // aberration grows toward the edges
     vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
     col*=1.0-uVig*smoothstep(0.15,0.85,d*2.2);                                            // vignette
     col+=(rnd(vUv*vec2(1920.0,1080.0)+fract(uTime)*100.0)-0.5)*uGrain;                    // film grain
     gl_FragColor=vec4(col,1.0);}`});
  comp.addPass(fx);
 }
 POST.size=()=>{if(comp){comp.setSize(innerWidth,innerHeight);}};
 POST.render=(time,dt)=>{
  if(!comp){renderer.render(scene,camera);return;}
  const v=Math.abs(scrollP-pS)/Math.max(dt,0.001);pS=scrollP;vel+=(v-vel)*Math.min(1,dt*6); // scroll speed -> aberration
  fx.uniforms.uTime.value=time%100;
  fx.uniforms.uAb.value=((tier>=2&&!reduce)?0.0015+Math.min(vel*0.012,0.012):0)+((tier>=1&&!reduce)?warp*0.014:0);
  bloom.strength=MOOD.bloom+0.05*kBrain+U.uBoost.value*0.5+warp*0.7;            // per-section bloom, spikes on node click
  comp.render(dt);};
 POST.size();
})();

/* ================= AUDIO (muted by default, procedural) ================= */
let ac=null,master,sndOn=false,busSend,padLP,padOsc=[],subO,shimG,shimBP,noiseBuf,tickT=0,flashHit=false;
// Original ambient score in the spirit of a space epic: breathing pipe-organ chords, deep sub, a ticking clock that speeds up in warp, shimmer riser, impact on the flash
const CH=[[73.42,110,146.83,174.61,220],[58.27,116.54,174.61,233.08,293.66],[87.31,130.81,174.61,220,261.63],[65.41,130.81,196,261.63,329.63]];  // Dm, Bb, F, C (root, 5th, ... voicings)
function initAudio(){
 ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=0;
 const comp=ac.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;
 const rev=ac.createConvolver(),len=ac.sampleRate*5,ir=ac.createBuffer(2,len,ac.sampleRate);                 // synthetic 5 s hall
 for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}
 rev.buffer=ir;const wet=ac.createGain();wet.gain.value=0.7;rev.connect(wet);wet.connect(comp);
 const dry=ac.createGain();dry.gain.value=0.6;dry.connect(comp);comp.connect(master);master.connect(ac.destination);
 busSend=(node,amt)=>{node.connect(dry);const g=ac.createGain();g.gain.value=amt;node.connect(g);g.connect(rev);};
 // organ pad: additive harmonics, detuned pairs, slow swell, filter opens with warp
 padLP=ac.createBiquadFilter();padLP.type='lowpass';padLP.frequency.value=520;padLP.Q.value=0.4;
 const padG=ac.createGain();padG.gain.value=0.5;padLP.connect(padG);busSend(padG,0.9);
 const wave=ac.createPeriodicWave(new Float32Array(8),new Float32Array([0,1,.55,.4,.3,.18,.12,.06]));
 CH[0].forEach((f,i)=>[-5,5].forEach(dt=>{const o=ac.createOscillator(),g=ac.createGain();o.setPeriodicWave(wave);o.frequency.value=f;o.detune.value=dt;g.gain.value=0.11/(1+i*0.25);o.connect(g);g.connect(padLP);o.start();padOsc.push([o,i]);}));
 const sw=ac.createOscillator(),swg=ac.createGain();sw.frequency.value=0.07;swg.gain.value=0.18;sw.connect(swg);swg.connect(padG.gain);sw.start();
 subO=ac.createOscillator();const sg=ac.createGain();subO.type='sine';subO.frequency.value=CH[0][0]/2;sg.gain.value=0.22;subO.connect(sg);sg.connect(dry);subO.start();
 let ci=0;setInterval(()=>{ci=(ci+1)%CH.length;const t=ac.currentTime;padOsc.forEach(([o,i])=>o.frequency.setTargetAtTime(CH[ci][i],t,1.6));subO.frequency.setTargetAtTime(CH[ci][0]/2,t,1.6);},13000);
 // shimmer riser (filtered noise driven by warp)
 noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 const ns=ac.createBufferSource();ns.buffer=noiseBuf;ns.loop=true;shimBP=ac.createBiquadFilter();shimBP.type='bandpass';shimBP.Q.value=1.2;shimBP.frequency.value=600;
 shimG=ac.createGain();shimG.gain.value=0;ns.connect(shimBP);shimBP.connect(shimG);busSend(shimG,0.8);ns.start();}
function tick(){const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(900,t+0.05);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.09,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.connect(g);busSend(g,0.35);o.start(t);o.stop(t+0.15);}
function boom(){const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(28,t+1.6);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.55,t+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+2.4);o.connect(g);busSend(g,1.1);o.start(t);o.stop(t+2.6);
 const n=ac.createBufferSource(),f=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=noiseBuf;f.type='lowpass';f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(120,t+1.8);
 ng.gain.setValueAtTime(0.35,t);ng.gain.exponentialRampToValueAtTime(0.0001,t+2);n.connect(f);f.connect(ng);busSend(ng,1);n.start(t);n.stop(t+2.1);}
function audioTick(dt){
 if(!ac||!sndOn)return;const t=ac.currentTime;
 padLP.frequency.setTargetAtTime(520+warp*1900+kBrain*350,t,0.25);
 shimG.gain.setTargetAtTime(warp*0.32,t,0.15);shimBP.frequency.setTargetAtTime(500+warp*3800,t,0.2);
 tickT-=dt;if(tickT<=0){tick();tickT=1.05-0.78*warp;}                                   // clock ticks faster as the warp builds
 if(flashV>0.85&&!flashHit){flashHit=true;boom();}else if(flashV<0.3)flashHit=false;}
function blip(f,v){if(!sndOn||!ac)return;const t=ac.currentTime,g=ac.createGain();                              // soft bell for hover / select
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((v||0.2)*0.25,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+1.4);
 [1,2.01,3.02].forEach((m,i)=>{const o=ac.createOscillator(),og=ac.createGain();o.type='sine';o.frequency.value=f*m;og.gain.value=1/(1+i*1.4);o.connect(og);og.connect(g);o.start(t);o.stop(t+1.5);});busSend(g,0.9);}
const snd=document.getElementById('snd');
snd.addEventListener('click',()=>{sndOn=!sndOn;if(!ac)initAudio();ac.resume();
 master.gain.cancelScheduledValues(ac.currentTime);master.gain.linearRampToValueAtTime(sndOn?0.6:0,ac.currentTime+2.5);  // smooth fade
 snd.setAttribute('aria-pressed',sndOn);snd.dataset.t=snd.textContent=sndOn?'Sound on':'Sound off';});
const _sel=select;select=function(i){if(i!==active)blip(240,0.3);_sel(i);};

/* ================= NAV + MENU ================= */
const secs=[...document.querySelectorAll('main>section')];secs[0].id='hero-s';secs[1].id='about';
const menu=document.getElementById('menu'),mb=document.getElementById('mb');
function menuSet(o){menu.classList.toggle('open',o);mb.setAttribute('aria-expanded',o);mb.textContent=mb.dataset.t=o?'Close':'Menu';}
mb.addEventListener('click',()=>menuSet(!menu.classList.contains('open')));
addEventListener('keydown',e=>{if(e.key==='Escape')menuSet(false);});
document.querySelectorAll('[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();menuSet(false);
 const el=document.getElementById(a.dataset.go);glide(el.offsetTop,2.4);}));
let snapBusy=0,glideT=null;
function glide(y,d=2.2){snapBusy=performance.now()+d*1000;if(glideT)glideT.kill();   // own tween on the real scroll position: Lenis cancels its animations on every wheel event
 if(reduce){scrollTo({top:y,left:0,behavior:'instant'});return;}
 const o={y:scrollY};glideT=gsap.to(o,{y,duration:d,ease:'power3.inOut',onUpdate:()=>scrollTo({top:o.y,left:0,behavior:'instant'})});}
const dotA=[...document.querySelectorAll('.dots a')];
document.querySelectorAll('.sc').forEach(el=>el.addEventListener('pointerenter',()=>scramble(el,el.dataset.t))); // HUD scramble on hover

/* ================= CURSOR (fine pointers only) ================= */
if(matchMedia('(pointer:fine)').matches){
 const cd=document.getElementById('cd'),cr=document.getElementById('cr'),c={x:innerWidth/2,y:innerHeight/2,rx:innerWidth/2,ry:innerHeight/2};
 document.body.classList.add('hc');
 addEventListener('pointermove',e=>{c.x=e.clientX;c.y=e.clientY;});
 document.addEventListener('pointerover',e=>document.body.classList.toggle('c-link',!!e.target.closest('a,button,input,textarea')));
 gsap.ticker.add((t,ms)=>{const k=reduce?1:1-Math.exp(-ms/1000*14);c.rx+=(c.x-c.rx)*k;c.ry+=(c.y-c.ry)*k;
  cd.style.transform='translate('+c.x+'px,'+c.y+'px) translate(-50%,-50%)';cr.style.transform='translate('+c.rx+'px,'+c.ry+'px) translate(-50%,-50%)';
  document.body.classList.toggle('c-node',hov>=0);document.body.classList.toggle('c-drag',drag.on&&drag.moved>3);});
}

/* ================= PRELOADER ================= */
const ld=document.getElementById('ld'),ldn=document.getElementById('ldn'),ldt=document.getElementById('ldt'),prog={v:0};
const BOOT=['CALIBRATING NEURAL LINK...','MAPPING SYNAPSES...','ALIGNING STARFIELD...','HALF OF WHAT REMAINS, AGAIN...','LINK ESTABLISHED'];
let fontsOk=false;(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{fontsOk=true;});
document.documentElement.style.overflow='hidden';
function ldUpd(){const v=prog.v,dec=v<90?0:v<99?1:2;ldn.textContent=v.toFixed(dec).padStart(3+(dec?dec+1:0),'0');ldt.textContent=BOOT[prog.done?4:v<30?0:v<60?1:v<90?2:3];}
function ldOpen(){document.documentElement.style.overflow='';intro.play();                    // iris opens while the camera dollies in
 gsap.to(ld,{'--r':'150vmax',duration:reduce?0.4:1.4,ease:'power2.inOut',onComplete:()=>ld.remove()});}
// Zeno loader: every HALF seconds the remaining distance is cut in half, so it slows toward 100 and only "arrives" once MINT has passed and fonts are ready
const HALF=reduce?0.08:0.4,MINT=reduce?0.4:3.4;let zt=0;
function zeno(t,ms){zt+=Math.min(ms,100)/1000;prog.v=Math.min(99.99,100*(1-Math.pow(0.5,zt/HALF)));ldUpd();
 if(zt>=MINT&&fontsOk){gsap.ticker.remove(zeno);prog.v=100;prog.done=true;ldUpd();gsap.fromTo(ldn,{scale:1.08},{scale:1,duration:.5,ease:'power3.out'});gsap.delayedCall(reduce?0:0.5,ldOpen);}}
gsap.ticker.add(zeno);

/* ================= ABOUT: lanyard ID card (verlet rope) + line-by-line bio ================= */
let aboutShift=0;                                   // small sideways camera shift while About is on screen
(function(){
 const box=document.getElementById('lanyard'),cv=document.getElementById('lc'),card=document.getElementById('card'),ctx=cv.getContext('2d');
 const N=8,SEG=28,HALF=172;                         // rope points, segment length, clip-to-card-centre distance
 const px=new Float32Array(N+1),py=new Float32Array(N+1),qx=new Float32Array(N+1),qy=new Float32Array(N+1); // current/previous positions
 let W=0,H=0,ax=0,vis=false,grab=false,gx=0,gy=0,ox=0,oy=0,acc=0;
 const flipO={a:0},QR_URL='https://www.linkedin.com/in/muhammad-akmal-faishal-46689237b/';let flipped=false;               // QR_URL: where the card's QR code points
 function flip(){flipped=!flipped;gsap.to(flipO,{a:flipped?180:0,duration:reduce?0.01:0.9,ease:'power3.inOut'});}
 try{const q=qrcode(0,'M');q.addData(QR_URL);q.make();document.getElementById('qr').innerHTML='<img alt="QR code" src="'+q.createDataURL(5,0)+'">';}catch(_){document.getElementById('qr').textContent=QR_URL;}
 function reset(){for(let i=0;i<=N;i++){px[i]=qx[i]=ax;py[i]=qy[i]=i<N?i*SEG:(N-1)*SEG+HALF;}}
 function size(){const d=Math.min(devicePixelRatio,2);W=box.offsetWidth;H=box.offsetHeight;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);ax=W/2;reset();draw();}
 function step(dt){                                 // Verlet integration + distance constraints
  const g=2000*dt*dt;
  for(let i=1;i<=N;i++){const vx=(px[i]-qx[i])*0.992,vy=(py[i]-qy[i])*0.992;qx[i]=px[i];qy[i]=py[i];px[i]+=vx;py[i]+=vy+g;}
  for(let it=0;it<10;it++){
   px[0]=ax;py[0]=0;
   for(let i=0;i<N;i++){const L=i<N-1?SEG:HALF,dx=px[i+1]-px[i],dy=py[i+1]-py[i],d=Math.hypot(dx,dy)||1e-4,f=(d-L)/d;
    if(i===0){px[1]-=dx*f;py[1]-=dy*f;}else{px[i]+=dx*f*.5;py[i]+=dy*f*.5;px[i+1]-=dx*f*.5;py[i+1]-=dy*f*.5;}}
   if(grab){px[N]=gx;py[N]=gy;}                     // dragged card is pinned to the pointer
  }}
 function draw(){
  ctx.clearRect(0,0,W,H);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(77,232,255,.85)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(px[0],py[0]);for(let i=1;i<N;i++)ctx.lineTo(px[i],py[i]);ctx.stroke();
  ctx.fillStyle='#8b5cf6';ctx.fillRect(px[N-1]-9,py[N-1]-4,18,10);   // clip
  const th=Math.atan2(-(px[N]-px[N-1]),py[N]-py[N-1]),vx=px[N]-qx[N];
  card.style.transform='translate('+px[N]+'px,'+py[N]+'px) rotate('+th+'rad) rotateY('+(Math.max(-35,Math.min(35,vx*3))+flipO.a)+'deg)';
  card.style.setProperty('--hx',(50+th*90)+'%');card.style.setProperty('--hy',(py[N]/H*100)+'%');card.style.setProperty('--sx',(50-th*120)+'%'); // iridescence follows tilt
 }
 gsap.ticker.add((t,ms)=>{if(!vis)return;acc+=Math.min(ms/1000,0.05);while(acc>1/120){step(1/120);acc-=1/120;}draw();});
 gsap.ticker.add(()=>{const was=vis;vis=Math.abs(ddOf(document.querySelector('.ab')))<0.7;if(vis&&!was&&!reduce)qx[N]=px[N]-14;}); // entrance swing
 card.addEventListener('pointerdown',e=>{const r=box.getBoundingClientRect();grab=true;card._sx=e.clientX;card._sy=e.clientY;card.setPointerCapture(e.pointerId);ox=px[N]-(e.clientX-r.left);oy=py[N]-(e.clientY-r.top);document.body.classList.add('c-grab');});
 card.addEventListener('pointermove',e=>{if(!grab)return;const r=box.getBoundingClientRect();gx=Math.max(0,Math.min(W,e.clientX-r.left+ox));gy=Math.max(60,Math.min(H,e.clientY-r.top+oy));});
 const rel=()=>{grab=false;document.body.classList.remove('c-grab');};
 card.addEventListener('pointerup',e=>{const mv=Math.hypot(e.clientX-card._sx,e.clientY-card._sy);rel();if(mv<6)flip();});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}});card.addEventListener('pointercancel',rel);
 card.addEventListener('pointerenter',()=>document.body.classList.add('c-grab'));card.addEventListener('pointerleave',()=>{if(!grab)document.body.classList.remove('c-grab');});
 let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(size,200);});size();
 // About text: split into words, then lines (measured by offsetTop), each line masked and revealed on scroll
 const BIO=['I am a *Full-Stack* Developer specializing in *Laravel* and *Nuxt.js* ecosystems.','I build scalable *web* applications, combining *clean* architecture, reliable *APIs*, and intuitive modern interfaces.','Currently open to *collaborations*, engineering projects, and turning ideas into real-world *products*.'];
 const bio=document.getElementById('bio');let shown=false;
 function splitBio(){bio.innerHTML=BIO.map(t=>'<p class="pp">'+t.split(' ').map(w=>/^\*.+\*[.,]?$/.test(w)?'<span class="w k">'+w.replace(/\*/g,'')+'</span>':'<span class="w">'+w+'</span>').join(' ')+'</p>').join('');
  bio.querySelectorAll('p').forEach(p=>{const lines=[];let top=-1e9;p.querySelectorAll('.w').forEach(w=>{if(Math.abs(w.offsetTop-top)>4){lines.push([]);top=w.offsetTop;}lines[lines.length-1].push(w.outerHTML);});
   p.innerHTML=lines.map(l=>'<span class="ln"><span class="li">'+l.join(' ')+'</span></span>').join('');});
  if(!reduce)gsap.set('#bio .li',{yPercent:shown?0:110});}
 splitBio();if(document.fonts)document.fonts.ready.then(splitBio);
 let rb;addEventListener('resize',()=>{clearTimeout(rb);rb=setTimeout(splitBio,250);});          // re-split on resize
 const bioT=()=>{if(!shown&&Math.abs(ddOf(document.querySelector('.ab')))<0.4){shown=true;if(!reduce)gsap.to('#bio .li',{yPercent:0,duration:1,ease:'power4.out',stagger:0.09});gsap.ticker.remove(bioT);}};gsap.ticker.add(bioT);
 const abEl=document.querySelector('.ab');
 gsap.ticker.add(()=>{const d=Math.abs(ddOf(abEl));let k=Math.min(1,Math.max(0,1.2-d*1.6));aboutShift=k*k*(3-2*k)*-1.6;});
})();

/* ================= NEBULA (fbm planes) + SCROLL MOOD (FOV / atmosphere / bloom / stars) ================= */
const MOOD={fov:55,bloom:0.5,stars:1,z:0,q:0,o:1};
// Keyframes per <section>: hero, about, note, skills, works, contact
const MK=[{f:55,b:.4,s:1,z:0,q:0,o:1,c:[0,0,0]},{f:50,b:.35,s:0,z:0,q:1,o:0,c:[0,0,0]},{f:62,b:.2,s:0,z:0,q:0,o:0,c:[0,0,0]},{f:50,b:.35,s:0,z:1,q:0,o:0,c:[0,0,0]},{f:55,b:.5,s:.9,z:0,q:0,o:0,c:[0,0,0]}];
const bgCol=new THREE.Color(0,0,0),bgT=[0,0,0];
gsap.ticker.add((t,ms)=>{
 const dt=ms/1000,kk=1-Math.exp(-dt*3);let sw=0,f=0,b=0,s=0,r=0,g=0,bl=0,zz=0,qq=0,oo=0;
 secs.forEach((el,i)=>{const w=Math.max(0,1-Math.abs(ddOf(el)));if(!w)return;
  const k=MK[i];sw+=w;f+=k.f*w;b+=k.b*w;s+=k.s*w*w*w;zz+=k.z*w*w*w;qq+=k.q*w*w*w;oo+=k.o*w*w*w;r+=k.c[0]*w;g+=k.c[1]*w;bl+=k.c[2]*w;});
 if(sw>0){MOOD.fov+=(f/sw-MOOD.fov)*kk;MOOD.bloom+=(b/sw-MOOD.bloom)*kk;MOOD.stars+=(Math.min(s,1)-MOOD.stars)*kk;MOOD.z+=(Math.min(zz,1)-MOOD.z)*kk;MOOD.q+=(Math.min(qq,1)-MOOD.q)*kk;MOOD.o+=(Math.min(oo,1)-MOOD.o)*kk;bgT[0]=r/sw;bgT[1]=g/sw;bgT[2]=bl/sw;}
 const fv=MOOD.fov+(reduce?0:warp*36);                  // FOV stretch = sense of speed during the dive
 if(Math.abs(camera.fov-fv)>0.02){camera.fov=fv;camera.updateProjectionMatrix();}
 bgCol.r+=(bgT[0]-bgCol.r)*kk;bgCol.g+=(bgT[1]-bgCol.g)*kk;bgCol.b+=(bgT[2]-bgCol.b)*kk;renderer.setClearColor(bgCol,1);skyTick();
});

/* ================= COSMIC SKETCH (thin line-art orbits + constellations on a near-black sky) ================= */
const sketch=new THREE.Group();scene.add(sketch);
(function(){
 const pos=[],dd=[],dots=[],jit=()=>(Math.random()-0.5)*0.25;                  // jitter = hand-drawn wobble
 for(let o=0,OR=[6,12,16][tier];o<OR;o++){                                       // dashed orbit ellipses
  const rx=14+Math.random()*50,rz=rx*(0.4+Math.random()*0.5),cx=(Math.random()-0.5)*90,cy=(Math.random()-0.5)*50,cz=-45-Math.random()*50,e=new THREE.Euler((Math.random()-0.5)*1.2,0,(Math.random()-0.5)*1.2),v=new THREE.Vector3();
  let prev=null,dist=0;
  for(let j=0;j<=96;j++){const a=j/96*6.2832;v.set(Math.cos(a)*rx+jit(),jit(),Math.sin(a)*rz+jit()).applyEuler(e);const p=[cx+v.x,cy+v.y,cz+v.z];
   if(prev){const d0=dist;dist+=Math.hypot(p[0]-prev[0],p[1]-prev[1],p[2]-prev[2]);pos.push(...prev,...p);dd.push(d0,dist);}prev=p;}}
 for(let c=0,CN=[8,14,20][tier];c<CN;c++){                                       // constellations: dots joined by thin solid lines
  const cx=(Math.random()-0.5)*110,cy=(Math.random()-0.5)*60,cz=-40-Math.random()*60,n=4+(Math.random()*4|0);let prev=null;
  for(let j=0;j<n;j++){const p=[cx+(Math.random()-0.5)*16,cy+(Math.random()-0.5)*10,cz+(Math.random()-0.5)*6];dots.push(...p);if(prev){pos.push(...prev,...p);dd.push(0,0);}prev=p;}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aD',new THREE.Float32BufferAttribute(dd,1));
 sketch.add(new THREE.LineSegments(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uA:{value:1}},vertexShader:'attribute float aD;varying float vD;void main(){vD=aD;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float uA;varying float vD;void main(){if(fract(vD*0.22)>0.62)discard;gl_FragColor=vec4(0.62,0.78,1.0,0.16*uA);}'})));  // dash pattern from distance along the orbit
 const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dots,3));
 sketch.add(new THREE.Points(dg,new THREE.PointsMaterial({color:0xbfe3ff,size:0.7,sizeAttenuation:true,transparent:true,opacity:0.7,depthWrite:false})));
})();
gsap.ticker.add(t=>{sketch.position.y=camera.position.y*0.9;sketch.rotation.y=Math.sin(t*0.02)*0.05;});

/* ================= ZODIAC: Sagittarius constellation + glyph (About background) ================= */
const zod=new THREE.Group();zod.visible=false;zod.position.z=-32;scene.add(zod);
const ZT=new THREE.Vector3();                                                      // local position of the "gate" star the camera dives into
function glowMat(S,pu){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,   // round glowing star (no square points)
 uniforms:{uA:{value:0},uS:{value:S},uP:{value:pu},uT:{value:0},uPR:{value:1}},
 vertexShader:'uniform float uS,uP,uT,uPR;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;float pu=1.0+uP*0.35*sin(uT*3.0);gl_PointSize=min(uS*pu*uPR*(180.0/max(-mv.z,0.5)),260.0*uPR);}',
 fragmentShader:'uniform float uA;void main(){float d=length(gl_PointCoord-0.5);float h=pow(smoothstep(0.5,0.0,d),2.2),c=smoothstep(0.1,0.0,d);gl_FragColor=vec4(vec3(0.75,0.9,1.0)*(h*0.8+c*1.4),(h+c)*uA);}'});}
(function(){
 // Approximate sky positions (RA/Dec projected, east to the left), in degrees: the "teapot" asterism plus the arm of the bow
 const S=[[7.9,-0.4],[4.6,0.2],[4.0,-4.4],[3.0,4.6],[-0.9,3.0],[-2.9,3.7],[-5.3,2.3],[-4.5,0.1],[5.4,-6.8],[-3.4,8.9],[-5.0,8.3],[-6.0,9.0]];
 const E=[[0,1],[1,2],[2,7],[7,6],[6,5],[5,4],[4,3],[3,1],[4,7],[2,8],[5,9],[9,10],[10,11]],K=2.4,pos=[],dots=[],P=i=>[S[i][0]*K,S[i][1]*K-2,0];
 E.forEach(e=>pos.push(...P(e[0]),...P(e[1])));S.forEach((s,i)=>dots.push(...P(i)));
 const gx=18,gy=-11,gs=4.5;                                                       // the Sagittarius glyph: an arrow with a crossbar
 [[-1,-1,1,1],[0.2,1,1,1],[1,1,1,0.2],[-0.6,0,0,-0.6]].forEach(l=>pos.push(gx+l[0]*gs,gy+l[1]*gs,0,gx+l[2]*gs,gy+l[3]*gs,0));
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 zod.add(new THREE.LineSegments(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uA:{value:0}},
  vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float uA;void main(){gl_FragColor=vec4(0.75,0.88,1.0,0.6*uA);}'})));
 const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dots,3));
 zod.add(new THREE.Points(dg,glowMat(3.2,0)));
 const GATE=3,gp=P(GATE);ZT.set(gp[0],gp[1],gp[2]);                              // gate star: the camera flies into this point
 const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));
 zod.add(new THREE.Points(tg,glowMat(7.5,1)));                                    // larger, pulsing marker
})();
function skyTick(){                                                                // fade backdrops per section via MOOD
 const zl=zod.children[0].material,zp=zod.children[1].material,zt=zod.children[2].material,sl=sketch.children[0].material,sd=sketch.children[1].material;
 const zq=Math.max(MOOD.q,sstep(0,0.15,dive)*(1-sstep(0.8,0.95,dive)));           // zodiac stays lit for the whole dive
 zod.visible=zq>0.01;zl.uniforms.uA.value=zq;zp.uniforms.uA.value=zq;zt.uniforms.uA.value=zq;
 zp.uniforms.uPR.value=zt.uniforms.uPR.value=renderer.getPixelRatio();zt.uniforms.uT.value=performance.now()/1000;
 sketch.visible=MOOD.z>0.01;sl.uniforms.uA.value=MOOD.z;sd.opacity=0.7*MOOD.z;orb.visible=MOOD.o>0.02;orb.scale.setScalar(0.5+0.5*MOOD.o);stars.visible=Math.max(MOOD.stars,warp*0.9)>0.01;}

/* ================= SECTION TRANSITIONS: each section "flies in" from depth and flies past as you leave ================= */
gsap.ticker.add(()=>{let best=null,ba=9;secs.forEach(el=>{
 const dd=ddOf(el),a=Math.abs(dd);if(a<ba){ba=a;best=el;}                 // dd>0: section is ahead (below), dd<0: already passed
 let fade=1-sm5(0.08,0.62,a);if(el.id==='skills')fade*=sm5(0.9,1.0,dive);   // Skills content appears only after the flash
 const sc=1+(dd>0?-0.16:0.2)*sm5(0,0.7,a);                                // ahead: grows from far away; passed: swells and dissolves
 const pin=!reduce&&el.offsetHeight<=innerHeight*1.05;                       // pinned in place: sections never slide up from below, they only fly in/out of depth
 el.style.opacity=fade.toFixed(3);
 el.style.transform=reduce?'':(pin?'translate3d(0,'+(-dd*innerHeight).toFixed(1)+'px,0) ':'')+'scale('+sc.toFixed(4)+')';
 el.style.pointerEvents=fade<0.15?'none':'';});
 dotA.forEach(d=>d.classList.toggle('on',!!best&&d.dataset.go===best.id));});

/* ---- Input ---- */
const target = new THREE.Vector2(), mouse = new THREE.Vector2();
addEventListener('pointermove',e=>target.set(e.clientX/innerWidth-0.5,-(e.clientY/innerHeight-0.5)));
let rt; addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(resize,150);});

/* ---- Smooth scroll, ticked by gsap (single loop) ---- */
let scrollP = 0, lenis = null;
if(!reduce && window.Lenis){
  lenis = new Lenis({lerp:0.07,smoothWheel:false});   // wheel is handled by the section snap below; Lenis only animates the jumps
  lenis.on('scroll',e=>{scrollP = e.limit ? e.scroll/e.limit : 0;});
  gsap.ticker.add(t=>lenis.raf(t*1000));
} else {
  addEventListener('scroll',()=>{scrollP=scrollY/Math.max(1,document.body.scrollHeight-innerHeight);});
}

/* ================= SECTION SNAP: one wheel flick / swipe / key press glides straight to the next section ================= */
{
 let lastW=0,lastD=0,ty=0,tOK=true;
 const maxS=()=>document.documentElement.scrollHeight-innerHeight;
 const free=e=>document.documentElement.style.overflow==='hidden'||!!(e.target.closest&&e.target.closest('#panel'));   // loader up / project panel scrolls natively
 const stops=()=>{const m=maxS(),a=[];secs.forEach((el,i)=>{const top=el.offsetTop,bot=top+el.offsetHeight;a.push(top);
  if(bot-top-innerHeight>innerHeight*.3){let s=top;while(s+innerHeight<bot-4){s=Math.min(s+innerHeight*.85,bot-innerHeight);a.push(s);}}   // clearly taller than the screen: extra stops so nothing is unreachable
  else if(i===secs.length-1)a.push(bot-innerHeight);});                                                                                  // last section: always reach the very bottom (footer)
  return a.map(v=>Math.max(0,Math.min(m,Math.round(v)))).sort((x,y)=>x-y).filter((v,i,r)=>!i||v-r[i-1]>8);};
 function go(dir){const s=stops(),y=scrollY;let t=null;
  if(dir>0)t=s.find(v=>v>y+8);else for(let i=s.length-1;i>=0;i--)if(s[i]<y-8){t=s[i];break;}
  if(t!=null)glide(t);}
 addEventListener('wheel',e=>{if(e.ctrlKey||free(e))return;e.preventDefault();
  const now=performance.now(),d=Math.abs(e.deltaY)*(e.deltaMode===1?33:e.deltaMode===2?innerHeight:1),fresh=now-lastW>80||(d>=30&&d>lastD*2+15);lastW=now;lastD=d;   // a gesture starts after a short pause; trackpad inertia tails are ignored
  if(now<snapBusy||!fresh||!d||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;go(e.deltaY>0?1:-1);},{passive:false});
 addEventListener('touchstart',e=>{ty=e.touches[0].clientY;tOK=!e.target.closest('#card,#panel,#cs button,input,textarea');},{passive:true});
 addEventListener('touchmove',e=>{if(e.touches.length<2&&!free(e)&&!e.target.closest('textarea'))e.preventDefault();},{passive:false});
 addEventListener('touchend',e=>{if(!tOK||free(e))return;const d=ty-e.changedTouches[0].clientY;if(Math.abs(d)>45&&performance.now()>snapBusy)go(d>0?1:-1);});
 addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||free(e))return;const t=e.target;if(t.closest&&t.closest('input,textarea,select'))return;
  const k=e.key,btn=t.closest&&t.closest('button,a');let d=0;
  if(k==='ArrowDown'||k==='PageDown'||(k===' '&&!e.shiftKey&&!btn))d=1;else if(k==='ArrowUp'||k==='PageUp'||(k===' '&&e.shiftKey&&!btn))d=-1;
  else if(k==='Home'||k==='End'){e.preventDefault();if(performance.now()>snapBusy)glide(k==='Home'?0:maxS(),2.4);return;}
  if(!d)return;e.preventDefault();if(!e.repeat&&performance.now()>snapBusy)go(d);});
}

/* ---- Intro: camera dollies in, letters reveal ---- */
const dolly = {z:60}; const intro = gsap.timeline({paused:true});
if(reduce){ dolly.z=14; }
else{
  intro.to(dolly,{z:14,duration:3.2,ease:'power3.out'},0);
  intro.call(startTypingHero, null, 0.4);
}

/* ================= WARP TRANSITIONS: progress per boundary + speed streaks + gate flash ================= */
function transit(dt){
 let w=0;
 for(let i=0;i<secs.length-1;i++){const t=Math.min(1,Math.max(0,-ddOf(secs[i])));
  if(i===1){diveR=Math.min(1,t/0.88);w=Math.max(w,sm5(0.05,0.5,dive)*(1-sm5(0.8,0.97,dive)));}   // dive completes slightly before Skills is centred, so Skills has a resting zone      // About -> Skills: full dive through the gate star
  else if(i===2){sTR=Math.max(0,(t-0.12)/0.88);w=Math.max(w,sm5(0.04,0.3,sT)*(1-sm5(0.5,0.85,sT)));}   // dead zone of 12% around Skills: nodes stay clickable until you really scroll away   // Skills -> Works: dive into the gate node, then streaks fade out after the cut
  else w=Math.max(w,Math.sin(Math.PI*t)*0.55);}                                  // other boundaries: lighter warp
 const kd=1-Math.exp(-dt*9);dive+=(diveR-dive)*kd;sT+=(sTR-sT)*kd;                 // critically-damped follow: fast scroll flicks never make the camera jump
 if(Math.abs(diveR-dive)<5e-4)dive=diveR;if(Math.abs(sTR-sT)<5e-4)sT=sTR;
 if(reduce)w=0;warp+=(w-warp)*(1-Math.exp(-dt*8));}
const wc=document.getElementById('wc'),wx=wc.getContext('2d'),wf=document.getElementById('wf'),SN=reduce?0:[90,150,220][tier];
const wk=Array.from({length:SN},()=>({a:Math.random()*6.2832,r:Math.random(),s:0.4+Math.random()*0.9,c:Math.random()<0.7?'150,230,255':'190,160,255'}));
let wcW=0,wcH=0,wOn=false,wfV='';
function wcSize(){const d=Math.min(devicePixelRatio,tier===0?1:2);wcW=innerWidth;wcH=innerHeight;wc.width=wcW*d;wc.height=wcH*d;wx.setTransform(d,0,0,d,0,0);}
wcSize();addEventListener('resize',wcSize);
function warpFx(dt){
 const fl=Math.max(sm5(0.55,0.83,dive)*(1-sm5(0.83,1.0,dive)),sm5(0.25,0.5,sT)*(1-sm5(0.5,0.8,sT))),v=fl.toFixed(3);          // white-violet flash at the moment of passing through the star
 flashV=fl;if(v!==wfV){wfV=v;wf.style.opacity=v;}
 if(fl>0.001){wf.style.setProperty('--fx',gate.x+'px');wf.style.setProperty('--fy',gate.y+'px');}
 if(!SN)return;
 if(warp<0.01){if(wOn){wx.clearRect(0,0,wcW,wcH);wOn=false;}return;}
 wOn=true;wx.clearRect(0,0,wcW,wcH);wx.lineCap='round';
 const R=Math.hypot(wcW,wcH)*0.55;
 for(const p of wk){p.r+=(0.05+warp*1.8)*p.s*dt;if(p.r>1){p.r=Math.random()*0.08;p.a=Math.random()*6.2832;}
  const r0=p.r,r1=Math.max(0,r0-(0.02+warp*0.22)*r0),ca=Math.cos(p.a),sa=Math.sin(p.a);
  wx.strokeStyle='rgba('+p.c+','+(warp*Math.min(1,r0*4)*0.85).toFixed(3)+')';wx.lineWidth=0.6+r0*2.2;
  wx.beginPath();wx.moveTo(gate.x+ca*r1*R,gate.y+sa*r1*R);wx.lineTo(gate.x+ca*r0*R,gate.y+sa*r0*R);wx.stroke();}}

/* ================= OBSERVER STATE + FOOTER TIMER ================= */
const OBS=matchMedia('(pointer:fine)').matches,obs=new THREE.Vector2(OBS?0:9,OBS?0:9);     // observer effect is for mouse users; touch keeps the full sky
{const tm=document.getElementById('tm');let n=0;const r=()=>{tm.textContent='You have been here for '+n+(n===1?' second':' seconds')+'. Thank you \u2014 time is finite, and you spent some of it here.';};
 r();setInterval(()=>{if(!document.hidden){n++;r();}},1000);}                                   // counts only while the tab is visible

/* ================= CONSTELLATION: draw your own in the hero; it signs the contact form ================= */
let sigData=()=>null;                                                                           // read by the contact form on submit
(function(){
 const NS='http://www.w3.org/2000/svg',box=document.getElementById('cs'),svg=document.getElementById('csl'),msg=document.getElementById('csh'),clr=document.getElementById('csc'),sgs=document.getElementById('sgs'),sgd=document.getElementById('sgd');
 let a0=20260427;const rnd=()=>{a0=a0+0x6D2B79F5|0;let t=Math.imul(a0^a0>>>15,1|a0);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};   // seeded: same sky every visit
 const ST=[],E=[],LN=[];let cur=-1;
 for(let k=0;k<4000&&ST.length<14;k++){const u=rnd(),v=rnd();if(ST.every(a=>Math.hypot(a.u-u,a.v-v)>0.17))ST.push({u,v,x:0,y:0});}
 const btns=ST.map((a,i)=>{const b=document.createElement('button');b.type='button';b.className='cst';b.style.setProperty('--d',(3+(rnd()*3|0))+'px');
  b.setAttribute('aria-label','Star '+(i+1));b.setAttribute('aria-pressed','false');b.addEventListener('click',e=>{e.stopPropagation();pick(i);});box.append(b);return b;});
 const has=(a,b)=>E.some(e=>(e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a));
 function place(o){const A=ST[o.a],B=ST[o.b];o.l.setAttribute('x1',A.x);o.l.setAttribute('y1',A.y);o.l.setAttribute('x2',B.x);o.l.setAttribute('y2',B.y);}
 function layout(){const w=innerWidth<800;ST.forEach((a,i)=>{a.x=w?6+a.u*88:52+a.u*42;a.y=w?50+a.v*34:10+a.v*72;btns[i].style.left=a.x+'%';btns[i].style.top=a.y+'%';});LN.forEach(place);sign();}
 function addLine(a,b,anim){const l=document.createElementNS(NS,'line'),o={a,b,l};LN.push(o);svg.append(l);place(o);
  if(anim&&!reduce)gsap.fromTo(l,{attr:{x2:ST[a].x,y2:ST[a].y}},{attr:{x2:ST[b].x,y2:ST[b].y},duration:.5,ease:'power2.out'});}
 function sign(){                                                                               // redraw the signature in the form from the same edges
  const used=[...new Set(E.flat())];sgd.textContent=used.length?'Redraw':'Draw yours';
  if(!used.length){sgs.innerHTML='<text x="80" y="44" text-anchor="middle" fill="#7a8299" font-size="9" font-family="JetBrains Mono,monospace">no constellation yet</text>';sigData=()=>null;return;}
  const W=innerWidth,H=innerHeight,P=used.map(i=>[ST[i].x*W/100,ST[i].y*H/100]),xs=P.map(p=>p[0]),ys=P.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),
   k=Math.min(136/Math.max(x1-x0,1),56/Math.max(y1-y0,1)),m={};                                // fit into 160x80, keeping the on-screen proportions
  used.forEach((id,j)=>{m[id]=[80+(P[j][0]-(x0+x1)/2)*k,40+(P[j][1]-(y0+y1)/2)*k];});
  sgs.innerHTML=E.map(e=>'<line x1="'+m[e[0]][0].toFixed(1)+'" y1="'+m[e[0]][1].toFixed(1)+'" x2="'+m[e[1]][0].toFixed(1)+'" y2="'+m[e[1]][1].toFixed(1)+'"/>').join('')+used.map(id=>'<circle cx="'+m[id][0].toFixed(1)+'" cy="'+m[id][1].toFixed(1)+'" r="2.2"/>').join('');
  sigData=()=>({edges:E.map(e=>[e[0]+1,e[1]+1]),stars:used.map(id=>({id:id+1,x:+(m[id][0]/160).toFixed(3),y:+(m[id][1]/80).toFixed(3)}))});}
 function paint(){const used=new Set(E.flat());
  btns.forEach((b,i)=>{b.classList.toggle('on',i===cur);b.classList.toggle('used',used.has(i));b.setAttribute('aria-pressed',i===cur);});
  clr.hidden=!E.length;
  msg.textContent=E.length?'The pattern was never in the sky \u2014 you just made it. It will sign your message below.':'Click the stars to draw your own constellation.';
  
  sign();}
 function pick(i){                                                                              // click a star, then another to join them; click the same star to lift the pen
  if(cur<0)cur=i;else if(cur===i)cur=-1;
  else{if(!has(cur,i)){E.push([cur,i]);addLine(cur,i,true);blip(440+E.length*45,0.14);}cur=i;}
  paint();}
 clr.onclick=()=>{E.length=0;try{sessionStorage.removeItem('cs');}catch(_){}cur=-1;LN.forEach(o=>o.l.remove());LN.length=0;paint();};
 layout();
 try{sessionStorage.removeItem('cs');}catch(_){}
 paint();addEventListener('resize',layout);
})();

/* ---- Render loop ---- */
const dir = new THREE.Vector3();
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time,dtMs)=>{
  if(document.hidden) return;
  const dt = Math.min(dtMs/1000,0.05);
  mouse.lerp(target,1-Math.exp(-dt*3));                       // frame-rate independent damping
  sm.uniforms.uTime.value=time; om.uniforms.uTime.value=time;
  sm.uniforms.uPR.value=renderer.getPixelRatio();
  sm.uniforms.uOff.value.copy(mouse).multiplyScalar(6);
  if(OBS){const ko=1-Math.exp(-dt*14);obs.x+=(target.x*2-obs.x)*ko;obs.y+=(target.y*2-obs.y)*ko;}   // observer light follows the cursor
  sm.uniforms.uPtr.value.copy(obs);sm.uniforms.uAsp.value=innerWidth/innerHeight;
  sm.uniforms.uDim.value=OBS?0.2+0.8*Math.min(1,warp*1.6):1;                                         // unobserved stars dim to 20%; the warp lights them all
  sm.uniforms.uBright.value=Math.max(MOOD.stars,warp*0.9)*flare.v;                   // stars dim slightly with depth
  dir.set(mouse.x*2,mouse.y*2,1);                             // approximate mouse direction in view space
  om.uniforms.uMouse.value.copy(dir);
  stars.rotation.y += dt*0.004; orb.rotation.y=Math.sin(time*0.35)*0.12+mouse.x*0.25; HU.uK.value=innerHeight/(2*Math.tan(camera.fov*Math.PI/360)); orb.position.y=1+Math.sin(time*0.8)*0.18; HU.uTime.value=time; HU.uPR.value=renderer.getPixelRatio();   // hologram sways and floats
  transit(dt);
  placeCamera(time,dt);
  warpFx(dt);
  audioTick(dt);
  POST.render(time,dt);
});
})();