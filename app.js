'use strict';
const $=s=>document.querySelector(s),fmt=n=>(n<0?'-':'')+'₱'+Math.abs(Math.round(n)).toLocaleString(),pc=n=>n.toFixed(1)+'%';
const MON=['Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'],P0=[1100,1120,1150,1130,1180,1220,1260,1300,1350,1420,1480,1560].map(x=>x*56);
const STEPS=['Financial Analyst','Finance Manager','Director','CEO'],ENTRY_ROLES=['Financial Analyst','Finance Manager','Treasury'];
const iso=(d=0)=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);
const fresh=()=>({role:'Finance Manager',range:12,ma:3,tab:'Raw material purchase',view:'dashboard',status:'draft',opt:null,step:0,
 prices:P0.map((p,i)=>({l:MON[i],p,q:i>5?p+56*[40,35,50,45,60,55][i-6]:null})),
 inp:{price:135,target:30,adj:1.75,vol:370370,uc:97.2,rev:50000000,cogs:36000000},
 purchases:[{no:'PO-1043',sup:'Cebu Coco Oils',mat:'Coconut oil',qty:160,cost:87360,date:iso(-6)},{no:'PO-1042',sup:'Davao Agri Trading',mat:'Palm oil',qty:90,cost:50960,date:iso(-12)},{no:'PO-1041',sup:'Cebu Coco Oils',mat:'Coconut oil',qty:120,cost:82880,date:iso(-40)}],
 quotes:[{sup:'Cebu Coco Oils',q:90160,until:iso(20)},{sup:'Davao Agri Trading',q:89320,until:iso(14)},{sup:'Mindanao Oleo',q:91840,until:iso(30)}],
 entries:[{no:'E-0003',type:'Raw material purchase',amt:13977600,by:'Treasury',date:iso(-6)},{no:'E-0002',type:'Supplier quotation',amt:90160,by:'Financial Analyst',date:iso(-8)}]});
let S;try{S=JSON.parse(localStorage.getItem('fmis3'))}catch(e){}S=S||fresh();
const save=()=>{try{localStorage.setItem('fmis3',JSON.stringify(S))}catch(e){}};
/* Revenue and COGS are auto-generated: monthly volume x selling price, monthly volume x unit cost */
const sync=()=>{const i=S.inp;i.adj??=1.75;i.vol??=370370;i.uc??=97.2;i.rev=Math.round(i.vol*i.price);i.cogs=Math.round(i.vol*i.uc)};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t.h);t.h=setTimeout(()=>t.classList.remove('show'),2400)}

/* ---------- calculations ---------- */
const M=v=>(v<0?'-':'')+'₱'+(Math.abs(v)/1e6).toFixed(2)+'M';
function sim(pct,o={}){const sh=o.sh??.45,vm=o.vm??1,rev=o.rev??S.inp.rev,cogs=o.cogs??S.inp.cogs,newC=cogs*(1+sh*pct/100),d=newC-cogs;
 const O={A:{n:'Absorb cost',r:()=>0,v:0},B:{n:'Gradual increase',r:x=>x<15?0:x<35?.5:1,v:.01*vm},C:{n:'Immediate increase',r:x=>x<30?0:1,v:.04*vm}};
 for(const k in O){let wc=0,cash=0;O[k].ms=[];for(let x=0;x<=45;x++){const r=O[k].r(x),rv=rev*(1+d/rev*r);O[k].ms.push((rv-newC)/rv*100);if(x<45){wc+=d/30*(1-r);cash+=(rv-newC)/30*(1-O[k].v*r)}}Object.assign(O[k],{m:O[k].ms[45],wc,cash})}
 return O}
function calc(){const p=S.prices,c=p.at(-1).p,pr=p.at(-2).p,pct=(c-pr)/pr*100,exp=(c-pr)*400,{rev,cogs,target}=S.inp,newC=cogs*(1+.45*pct/100),d=newC-cogs,m0=(rev-cogs)/rev*100,risk=pct>=15?'High':pct>=5?'Medium':'Low',O=sim(pct),rec=Object.keys(O).sort((a,b)=>O[b].cash-O[a].cash)[0];
 return{c,pr,pct,exp,rev,cogs,target,m0,risk,newC,d,O,rec,low:Math.min(...O.A.ms)}}
const series=()=>S.prices.slice(-S.range);
const mgAt=p=>(S.inp.rev-S.inp.cogs*(1+.45*(p/S.prices.at(-2).p-1)))/S.inp.rev*100;
function stats(){const s=series(),y=s.map(x=>x.p),n=y.length,mx=(n-1)/2,my=y.reduce((a,b)=>a+b)/n,w=Math.min(S.ma,n);let sxy=0,sxx=0,syy=0;y.forEach((v,i)=>{sxy+=(i-mx)*(v-my);sxx+=(i-mx)**2;syy+=(v-my)**2});
 const b=sxy/sxx,a0=my-b*mx;return{s,y,b,a0,w,r2:sxy*sxy/(sxx*syy||1),trend:y.map((_,i)=>a0+b*i),fc:a0+b*n,ma:y.map((_,i)=>i>=w-1?y.slice(i-w+1,i+1).reduce((a,b)=>a+b)/w:null)}}
function analysis(a,st){const l=st.s.map(x=>x.l),ma=st.ma.at(-1),dv=(a.c/ma-1)*100,fcp=(st.fc/a.c-1)*100,str=st.r2>=.7?'Strong':st.r2>=.4?'Moderate':'Weak',mgs=st.y.map(mgAt),now=mgAt(a.c),sh=.45,
 be=a.pr*(1+((S.inp.rev*(1-a.target/100)/S.inp.cogs)-1)/sh),sg=v=>(v>=0?'+':'')+fmt(v);
 return`<div class="grid g3"><div class="card"><h3>Trend analysis (linear regression)</h3><dl class="kvs"><dt>Slope</dt><dd>${sg(st.b)}/MT per month</dd><dt>Monthly trend rate</dt><dd>${pc(st.b/st.y[0]*100)}</dd><dt>R² (fit)</dt><dd>${st.r2.toFixed(2)}</dd><dt>Forecast next month</dt><dd>${fmt(st.fc)}/MT</dd></dl><div class="sig">${str} ${st.b>0?'upward':'downward'} trend. Next month is projected ${pc(fcp)} ${fcp>=0?'above':'below'} today's price.</div></div>
 <div class="card"><h3>Moving average (${st.w}-month SMA)</h3><dl class="kvs"><dt>Latest SMA</dt><dd>${fmt(ma)}/MT</dd><dt>Spot price</dt><dd>${fmt(a.c)}/MT</dd><dt>Spot vs SMA</dt><dd class="${dv>0?'up':'dn'}">${dv>0?'+':''}${pc(dv)}</dd></dl><div class="sig">${dv>0?'Spot is above its average: upward momentum, supplier prices may keep rising.':'Spot is below its average: costs are easing.'}</div>
 <div class="row">${[3,4,6].map(w=>`<button class="${w==S.ma?'':'ghost'}" data-ma="${w}">${w}M</button>`).join('')}</div></div>
 <div class="card"><h3>Gross profit margin analysis</h3><dl class="kvs"><dt>Margin at today's price</dt><dd>${pc(now)}</dd><dt>Target margin</dt><dd>${a.target}%</dd><dt>Gap to target</dt><dd class="${now<a.target?'up':'dn'}">${(now-a.target).toFixed(1)} pts</dd><dt>Gross profit / month</dt><dd>${M(S.inp.rev*now/100)}</dd><dt>Price to hit target</dt><dd>${fmt(be)}/MT</dd></dl><div class="sig">Margin moved ${(mgs.at(-1)-mgs[0]).toFixed(1)} pts over ${l.length} months.</div></div></div>
 <div class="card" style="margin-bottom:16px"><h3>Gross margin at each month's coconut oil price vs target</h3>${line(l,[{n:'Gross margin',v:mgs,c:'#0f766e'},{n:'Target '+a.target+'%',v:mgs.map(()=>a.target),c:'#94a3b8',dash:1,nodot:1}],'%')}</div>`}
function torn(r){const W=560,L=150,m=Math.max(...r.flatMap(x=>[Math.abs(x[1]),Math.abs(x[2])]))||1,cx=L+(W-L)/2,sc=(W-L)/2-70;let o=`<svg viewBox="0 0 ${W} ${r.length*34+10}"><line x1="${cx}" x2="${cx}" y1="0" y2="${r.length*34+10}" stroke="#94a3b8"/>`;
 r.forEach((x,i)=>{const y=i*34+6;o+=`<text x="${L-8}" y="${y+15}" text-anchor="end">${x[0]}</text>`;[[x[1],0],[x[2],1]].sort((p,q)=>Math.abs(q[0])-Math.abs(p[0])).forEach(([v,j])=>{const w=Math.abs(v)/m*sc,x0=v<0?cx-w:cx;o+=`<rect x="${x0}" y="${y}" width="${w}" height="22" rx="4" fill="${j?'#0f766e':'#f59e0b'}"/><text x="${v<0?x0-4:x0+w+4}" y="${y+15}" text-anchor="${v<0?'end':'start'}">${v>=0?'+':''}${M(v)}</text>`})});
 return o+'</svg><div class="leg"><span><i style="background:#f59e0b"></i>Driver −10%</span><span><i style="background:#0f766e"></i>Driver +10%</span></div>'}
function scen(a,sel){const SC=[['Mild',.5],['Expected',1],['Severe',1.5]],K=['A','B','C'],R=SC.map(([,f])=>sim(a.pct*f)),xs=[-5,-2.5,0,2.5,5,7.5,10,12.5,15],sx=xs.map(x=>sim(x)),base=a.O[sel].cash,
 dr=[['Coconut oil price',x=>sim((a.c*x-a.pr)/a.pr*100)],['Coconut share of COGS',x=>sim(a.pct,{sh:.45*x})],['Volume loss',x=>sim(a.pct,{vm:x})],['Monthly revenue',x=>sim(a.pct,{rev:S.inp.rev*x})],['Monthly COGS',x=>sim(a.pct,{cogs:S.inp.cogs*x})]].map(([n,f])=>[n,f(.9)[sel].cash-base,f(1.1)[sel].cash-base]).sort((x,y)=>Math.max(...y.slice(1).map(Math.abs))-Math.max(...x.slice(1).map(Math.abs)));
 return`<div class="card" style="margin-bottom:16px"><h3>Scenario analysis: pricing simulation (ending margin · 45-day gross profit)</h3>${tbl(['Option',...SC.map(([n,f])=>`${n} cost shock (${pc(a.pct*f)})`)],K.map(k=>[`<b>${k}</b>: ${a.O[k].n}`,...R.map(o=>{const b=K.reduce((x,j)=>o[j].cash>o[x].cash?j:x)==k;return`${b?'<b>':''}${pc(o[k].m)} · ${M(o[k].cash)}${b?' ✓</b>':''}`})]))}<p class="k">✓ marks the option with the highest 45-day gross profit in each scenario.</p></div>
 <div class="grid g2"><div class="card"><h3>Sensitivity: ending margin vs coconut oil cost change</h3>${line(xs.map(x=>x+'%'),K.map((k,i)=>({n:'Option '+k,v:sx.map(o=>o[k].m),c:['#be123c','#0f766e','#6366f1'][i],nodot:1})),'%')}</div>
 <div class="card"><h3>Sensitivity: Option ${sel}, change in 45-day gross profit at ±10%</h3>${torn(dr)}</div></div>`}


/* ---------- charts (inline SVG) ---------- */
function line(lbl,ss,unit=''){const W=620,H=250,L=44,B=24,T=10,R=10,all=ss.flatMap(s=>s.v.filter(x=>x!=null)),mn=Math.min(...all),mx=Math.max(...all),pad=(mx-mn||1)*.1,lo=mn-pad,hi=mx+pad;
 const X=i=>L+i*(W-L-R)/Math.max(lbl.length-1,1),Y=v=>T+(hi-v)/(hi-lo)*(H-T-B);let o=`<svg viewBox="0 0 ${W} ${H}" role="img">`;
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,y=Y(v);o+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#e6eae6"/><text x="${L-6}" y="${y+4}" text-anchor="end">${unit=='%'?v.toFixed(1)+'%':Math.round(v)}</text>`}
 const step=Math.ceil(lbl.length/8);lbl.forEach((l,i)=>{if(i%step==0)o+=`<text x="${X(i)}" y="${H-6}" text-anchor="middle">${l}</text>`});
 ss.forEach(s=>{let pts=s.v.map((v,i)=>v==null?null:[X(i),Y(v)]).filter(Boolean);o+=`<polyline fill="none" stroke="${s.c}" stroke-width="2.5" ${s.dash?'stroke-dasharray="5 4"':''} points="${pts.join(' ')}"/>`;if(!s.nodot)pts.forEach(q=>o+=`<circle cx="${q[0]}" cy="${q[1]}" r="3" fill="${s.c}"/>`)});
 return o+'</svg><div class="leg">'+ss.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')+'</div>'}
function bars(lbl,vals,fmtf,tgt){const W=420,H=250,L=40,B=34,mx=Math.max(...vals,tgt||0)*1.15,bw=(W-L-10)/vals.length;let o=`<svg viewBox="0 0 ${W} ${H}" role="img">`;
 vals.forEach((v,i)=>{const h=v/mx*(H-B-14),x=L+i*bw+bw*.18;o+=`<rect x="${x}" y="${H-B-h}" width="${bw*.64}" height="${h}" rx="3" fill="${tgt&&v<tgt?'#b4531a':'#0f766e'}"/><text x="${x+bw*.32}" y="${H-B-h-5}" text-anchor="middle">${fmtf(v)}</text><text x="${x+bw*.32}" y="${H-12}" text-anchor="middle">${lbl[i]}</text>`});
 if(tgt){const y=H-B-tgt/mx*(H-B-14);o+=`<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#66736c" stroke-dasharray="4 3"/><text x="${L-4}" y="${y+4}" text-anchor="end">tgt</text>`}return o+'</svg>'}
const tbl=(h,rows)=>`<div class="tw"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${h.length}">No records yet.</td></tr>`}</table></div>`;
const alertBox=a=>a.risk=='Low'?`<div class="alert ok">Coconut oil prices are stable (${pc(a.pct)}). No pricing action needed.</div>`:
 `<div class="alert"><span><b>Coconut oil is up ${pc(a.pct)}</b> to ${fmt(a.c)}/MT. Monthly cost exposure is ${fmt(a.exp)} (${a.risk} risk). Recommended action: Option ${a.rec}, ${a.O[a.rec].n.toLowerCase()}.</span><a href="#pricing">Review options</a></div>`;
const kpi=(k,v,s)=>`<div class="card"><div class="k">${k}</div><div class="v">${v}</div><div class="sub">${s}</div></div>`;
const badge=r=>`<span class="badge ${r}">${r}</span>`;

/* ---------- views ---------- */
function dashboard(){const a=calc(),s=series(),segs=['Retail','Food service','Export','Industrial'],mg=[a.m0+3.5,a.m0+.5,a.m0-3.2,a.m0-6.4];
 const big=S.purchases.find(p=>p.qty*p.cost>=150000),sub=S.status;
 return`<h1>Dashboard</h1>${alertBox(a)}
 <div class="grid g4">${kpi('Coconut oil price change',(a.pct>=0?'+':'')+pc(a.pct),`<span class="${a.pct>0?'up':'dn'}">${a.pct>0?'▲ rising':'▼ falling'}</span> vs previous`)}
 ${kpi('Cost exposure',fmt(a.exp)+'/mo',badge(a.risk)+' risk')}
 ${kpi('Gross margin',pc(a.m0),`Target ${a.target}% · <span class="${a.m0<a.target?'up':'dn'}">${(a.m0-a.target).toFixed(1)} pts</span>`)}
 ${kpi('Recommended pricing',`Option ${a.rec}`,`${a.O[a.rec].n} · margin ${pc(a.O[a.rec].m)} (${(a.O[a.rec].m-a.O.A.m>=0?'+':'')}${(a.O[a.rec].m-a.O.A.m).toFixed(1)} pts vs absorb)`)}</div>
 <div class="grid g21"><div class="card"><h3>Coconut oil price trend (₱/MT)</h3>${line(s.map(x=>x.l),[{n:'Spot price',v:s.map(x=>x.p),c:'#0f766e'}])}</div>
 <div class="card"><h3>Margin by segment (%)</h3>${bars(segs,mg,v=>v.toFixed(1),a.target)}</div></div>
 <div class="card"><h3>Items waiting for you</h3>
 <div class="item"><span>Price increase request: ${S.opt?'Option '+S.opt:'not submitted'} ${badge(sub)}${sub=='pending'?` · waiting on ${STEPS[S.step]}`:''}</span><a href="#pricing">Open</a></div>
 <div class="item"><span>${big?`Large purchase to review: ${big.no}, ${big.qty} MT ${big.mat} (${fmt(big.qty*big.cost)})`:'No large purchases to review'}</span><a href="#data">${big?'View':'Add data'}</a></div></div>`}

const FORMS={'Raw material purchase':['Purchase no.','Supplier','Raw material','Quantity (MT)','Unit cost (₱/MT)','Date'],'Supplier quotation':['Supplier','Raw material','Quote (₱/MT)','Valid until']};
const MATS=['Coconut oil','Palm oil','Sugar','Packaging','Cocoa'];
function field(f,i){const n=/Quantity|cost|Quote|Amount/.test(f),dt=/Date|until/.test(f);
 const inp=f=='Raw material'?`<select name="f${i}">${MATS.map(m=>`<option>${m}</option>`).join('')}</select>`:`<input name="f${i}" ${n?'type="number" step="any" min="0"':dt?'type="date"':''} ${dt?`value="${iso(f=='Valid until'?30:0)}"`:f=='Purchase no.'?`value="PO-${1044+S.purchases.length-3}"`:''} required>`;
 return`<label class="f">${f}${inp}</label>`}
function data(){if(!ENTRY_ROLES.includes(S.role))return`<h1>Financial data entry</h1><div class="card deny"><h3>Access restricted</h3>Data entry is open to Finance, Treasury and Analysts. Switch role in the sidebar to continue.</div>`;
 if(!FORMS[S.tab])S.tab='Raw material purchase';const f=FORMS[S.tab],i=S.inp;
 return`<h1>Financial data entry</h1><div class="tabs">${Object.keys(FORMS).map(t=>`<button class="${t==S.tab?'on':''}" data-tab="${t}">${t}</button>`).join('')}</div>
 <div class="grid g21"><div class="card"><h3>${S.tab} entry</h3><form id="frm">${f.map(field).join('')}<div class="row"><button>Save entry</button><button type="reset" class="ghost">Cancel</button></div></form></div>
 <div class="card"><h3>Pricing inputs</h3>${[['price','Current selling price (₱/kg)'],['target','Target margin (%)'],['adj','Price adjustment (%)']].map(([k,l])=>`<label class="f">${l}<input type="number" step="any" data-inp="${k}" value="${i[k]}"></label>`).join('')}<p class="k">Revenue and COGS are auto-generated from recorded transactions (${M(i.rev)} revenue, ${M(i.cogs)} COGS per month).</p></div></div>
 <div class="card"><h3>Recent entries</h3>${tbl(['Entry no.','Type','Amount','Entered by','Date'],S.entries.slice(0,8).map(e=>[e.no,e.type,fmt(e.amt),e.by,e.date]))}</div>`}

function monitoring(){const a=calc(),s=series(),st=stats(),tot=[['Coconut oil',a.exp],['Palm oil',600000],['Sugar',450000],['Packaging',300000],['Cocoa',220000]],last=S.purchases.find(p=>p.mat=='Coconut oil');
 return`<h1>Raw material cost monitoring</h1>${alertBox(a)}
 <div class="tabs"><button class="on">Coconut oil (focus)</button><button class="ghost" data-t="Other raw materials are shown in the exposure chart.">Other raw material</button><button class="ghost" data-t="Supplier quotes are listed below.">Supplier</button></div>
 <div class="grid g4">${kpi('Current price',fmt(a.c)+'/MT','')}${kpi('Previous price',fmt(a.pr)+'/MT','')}${kpi('Price difference',(a.c-a.pr>=0?'+':'')+fmt(a.c-a.pr),'')}${kpi('Price change %',pc(a.pct),'')}</div>
 <div class="grid g2">${kpi('Cost exposure',fmt(a.exp)+'/month','Price rise × 400 MT monthly volume')}${kpi('Risk level',badge(a.risk),'Basis (price change %): '+badge('Low')+' 0–5% · '+badge('Medium')+' 5–15% · '+badge('High')+' 15% and above')}</div>
 <div class="grid g21"><div class="card"><h3>Historical price: coconut oil (₱/MT)</h3>${line(s.map(x=>x.l),[{n:'Spot price',v:s.map(x=>x.p),c:'#0f766e'},{n:'Supplier quotes',v:s.map(x=>x.q),c:'#f59e0b',dash:1},{n:st.w+'-month moving average',v:st.ma,c:'#6366f1',nodot:1},{n:'Linear trend',v:st.trend,c:'#be123c',dash:1,nodot:1}])}</div>
 <div class="card"><h3>Monthly cost exposure by raw material</h3>${bars(tot.map(t=>t[0].split(' ')[0]),tot.map(t=>t[1]),v=>'₱'+(v/1e6).toFixed(2)+'M')}</div></div>
 ${analysis(a,st)}<div class="grid g2"><div class="card"><h3>Supplier quotations</h3>${tbl(['Supplier','Quote','Average supplier price','Valid until','vs last purchase'],S.quotes.map(q=>{const d=last?(q.q-last.cost)/last.cost*100:0;return[q.sup,fmt(q.q),fmt(S.quotes.reduce((t,x)=>t+x.q,0)/S.quotes.length),q.until,`<span class="${d>0?'up':'dn'}">${d>0?'+':''}${pc(d)}</span>`]}))}</div>
 <div class="card"><h3>Recent raw material purchases</h3>${tbl(['Purchase no.','Supplier','Qty','Unit cost','Date'],S.purchases.slice(0,5).map(p=>[p.no,p.sup,p.qty,fmt(p.cost),p.date]))}</div></div>
 <button id="goPrice">Evaluate pricing response</button>`}

function pricing(){const a=calc(),O=a.O,sel=S.opt||a.rec,id=S.inp.price,add=d=>iso(d),
 con=[['Supermarket chain',id],['Food service group',id*.9],['Export distributor',id*1.1]],inc=a.d/a.rev,adjp=S.inp.adj>0?S.inp.adj/100:inc;
 const cur=S.step,st=STEPS.map((n,i)=>`<div class="step ${S.status=='approved'||(S.status!='draft'&&i<cur)||(S.status=='rejected'&&false)?'done':''} ${S.status=='pending'&&i==cur?'cur':''}"><b>${n}</b><br>${i==0&&S.status!='draft'?'Submitted':S.status=='draft'?'Waiting':S.status=='approved'||i<cur?'Approved':i==cur?(S.status=='rejected'?'Rejected':'Pending'):'Waiting'}</div>`).join('');
 const can=S.status=='pending'&&S.role==STEPS[S.step];
 return`<h1>Pricing decision evaluation</h1>
 <div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${kpi('Commodity cost (from monitoring)',fmt(a.c)+'/MT',`${a.pct>=0?'+':''}${pc(a.pct)}`)}${kpi('Current selling price','₱'+id.toFixed(2)+'/kg','')}${kpi('Target margin',a.target+'%','Current '+pc(a.m0))}${kpi('Price adjustment',pc(S.inp.adj),'Applied to contract prices')}${kpi('Revenue / COGS (auto-generated)',fmt(a.rev),'COGS '+fmt(a.cogs))}</div>
 <div class="grid g3">${Object.keys(O).map(k=>`<div class="opt ${k==a.rec?'rec':''} ${k==sel?'sel':''}"><b>Option ${k}: ${O[k].n}</b> ${k==a.rec?'<span class="badge">Recommended</span>':''}<dl><dt>Projected gross margin</dt><dd>${pc(O[k].m)}</dd><dt>Projected working capital</dt><dd>${fmt(-O[k].wc)}</dd><dt>Projected cash position (45d)</dt><dd>${fmt(O[k].cash)}</dd></dl>
 <div class="row"><button class="ghost" data-pick="${k}" ${S.status=='pending'||S.status=='approved'?'disabled':''}>${k==sel?'Selected':'Select'}</button></div></div>`).join('')}</div>
 <div class="grid g21"><div class="card"><h3>Gross margin by option over the 30–45 day adjustment lag</h3>${line(Array.from({length:46},(_,i)=>'Day '+i),['A','B','C'].map((k,i)=>({n:`${k}: ${O[k].n}`,v:O[k].ms,c:['#a82b2b','#0f766e','#7a8a2a'][i],nodot:1})),'%')}</div>
 <div class="card"><h3>Recommended pricing option</h3><p><b>Option ${a.rec}: ${O[a.rec].n}.</b> It keeps the most cash over 45 days (${fmt(O[a.rec].cash)}) and ends at ${pc(O[a.rec].m)} margin, ${O[a.rec].m>=a.target?'meeting':'still '+(a.target-O[a.rec].m).toFixed(1)+' pts below'} the ${a.target}% target.</p>
 <div class="callout">Margin pressure: until prices adjust, margin falls to ${pc(a.low)} (${(a.m0-a.low).toFixed(1)} pts below today). Needed price rise to pass the full cost through: about ${pc(inc*100)}.</div></div></div>
 ${scen(a,sel)}<div class="grid g21"><div class="card"><h3>Option ${sel}: price changes by contract</h3>${tbl(['Contract','Current price','Step 1 date','Step 2 date'],con.map(([n,p])=>{const f=sel=='B'?[.5,1]:sel=='C'?[1,1]:[0,0];return[n,'₱'+p.toFixed(2),`${add(sel=='C'?30:15)} → ₱${(p*(1+adjp*f[0])).toFixed(2)}`,sel=='B'?`${add(35)} → ₱${(p*(1+adjp*f[1])).toFixed(2)}`:'—']}))}</div>
 <div class="card"><h3>Approval status</h3><div class="steps">${st}</div><p>Status: ${badge(S.status)}${S.opt?` · Option ${S.opt}`:''}</p>
 <div class="row"><button class="ghost" id="mod" ${S.status=='draft'?'disabled':''}>Modify</button><button class="bad" id="rej" ${can?'':'disabled'}>Reject</button><button id="app" ${can?'':'disabled'}>Approve</button></div>
 <div class="row"><button id="sub" ${S.status=='draft'||S.status=='rejected'?'':'disabled'}>Submit for approval</button></div>
 <p class="k">${S.status=='pending'?`Switch role to "${STEPS[S.step]}" to act on this step.`:'Submitting needs the Financial Analyst role.'}</p></div></div>`}

/* ---------- router + events ---------- */
const VIEWS={dashboard:['Dashboard',dashboard],data:['Data entry',data],monitoring:['Cost monitoring',monitoring],pricing:['Pricing decisions',pricing]};
function render(){sync();const h=location.hash.slice(1),v=VIEWS[h]?h:'dashboard';S.view=v;
 $('#nav').innerHTML=Object.entries(VIEWS).map(([k,[n]])=>`<a href="#${k}" class="${k==v?'on':''}">${n}</a>`).join('');
 $('#crumb').innerHTML=v=='dashboard'?'Overview':v=='monitoring'?'<a href="#dashboard">Dashboard</a> / Cost monitoring':v=='pricing'?'<a href="#monitoring">Cost monitoring</a> / Coconut oil / Pricing decision':'Role-based access: Finance, Treasury, Analysts';
 $('#role').value=S.role;$('#range').value=S.range;$('#view').innerHTML=VIEWS[v][1]();bind();save()}
function bind(){const q=(s,f)=>document.querySelectorAll(s).forEach(f),on=(id,f)=>{const e=$(id);if(e&&!e.disabled)e.onclick=f};
 q('[data-tab]',b=>b.onclick=()=>{S.tab=b.dataset.tab;render()});
 q('[data-t]',b=>b.onclick=()=>toast(b.dataset.t));
 q('[data-inp]',i=>i.onchange=()=>{S.inp[i.dataset.inp]=+i.value;save();toast('Pricing inputs updated')});
 q('[data-ma]',b=>b.onclick=()=>{S.ma=+b.dataset.ma;render()});
 q('[data-pick]',b=>b.onclick=()=>{S.opt=b.dataset.pick;render()});
 on('#goPrice',()=>location.hash='pricing');
 const fr=$('#frm');if(fr)fr.onsubmit=e=>{e.preventDefault();const v=[...new FormData(fr).values()],t=S.tab,n=x=>+x||0;let amt=0;
  if(t=='Raw material purchase'){const[no,sup,mat,qty,cost,date]=v;S.purchases.unshift({no,sup,mat,qty:n(qty),cost:n(cost),date});amt=qty*cost;if(mat=='Coconut oil')S.prices.push({l:new Date(date).toLocaleString('en',{month:'short'}),p:n(cost),q:null})}
  else if(t=='Supplier quotation'){S.quotes.unshift({sup:v[0],q:n(v[2]),until:v[3]});amt=n(v[2])}
  
  S.entries.unshift({no:'E-'+String(S.entries.length+2).padStart(4,'0'),type:t,amt,by:S.role,date:iso()});toast(t+' saved');render()};
 on('#sub',()=>{if(S.role!='Financial Analyst')return toast('Only a Financial Analyst can submit.');S.opt=S.opt||calc().rec;S.status='pending';S.step=1;toast('Submitted for approval');render()});
 on('#app',()=>{S.step++;if(S.step>=STEPS.length){S.status='approved';S.step=STEPS.length}toast(S.status=='approved'?'Request approved':'Approved. Sent to '+STEPS[S.step]);render()});
 on('#rej',()=>{S.status='rejected';toast('Request rejected');render()});
 on('#mod',()=>{S.status='draft';S.step=0;toast('Request reopened for changes');render()})}
$('#role').onchange=e=>{S.role=e.target.value;render()};
$('#range').onchange=e=>{S.range=+e.target.value;render()};
$('#reset').onclick=()=>{S=fresh();render();toast('Demo data reset')};
$('#exp').onclick=()=>{const a=calc(),r=[['Month','Price ₱/MT','Supplier quote ₱/MT'],...series().map(x=>[x.l,x.p,x.q??'']),[],['Price change %',a.pct.toFixed(2)],['Cost exposure ₱/month',Math.round(a.exp)],['Risk',a.risk],['Gross margin %',a.m0.toFixed(2)],['Recommended option',a.rec]];
 const u=URL.createObjectURL(new Blob([r.map(x=>x.join(',')).join('\n')],{type:'text/csv'})),l=document.createElement('a');l.href=u;l.download='fmis-export.csv';l.click();toast('Exported')};
addEventListener('hashchange',render);render();