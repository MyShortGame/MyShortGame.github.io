const KEY='mygame_demo_v1';
function state(){return JSON.parse(localStorage.getItem(KEY)||'null')||{logged:false,user:null,coins:12500,wallet:0,claims:{},ref:'MG'+Math.floor(100000+Math.random()*899999)}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
function coin(n){return Number(n||0).toLocaleString('id-ID')+' Coin'}
function money(n){return 'Rp '+Number(n||0).toLocaleString('id-ID')}
function toast(t){const x=document.querySelector('.toast');if(!x)return;x.textContent=t;x.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.style.display='none',2200)}
function nav(active){const items=[['⌂','Beranda','dashboard.html'],['◎','Misi','mission.html'],['▣','Wallet','wallet.html'],['♧','Referral','referral.html'],['◎','Profil','profile.html']];document.write('<nav class="bottom">'+items.map((x,i)=>`<button class="nav ${i===active?'active':''}" onclick="location.href='${x[2]}'"><span class="ico">${x[0]}</span>${x[1]}</button>`).join('')+'</nav>')}
function requireLogin(){if(!state().logged){location.href='login.html';return false}return true}
function protect(){if(!requireLogin())return;const e=document.querySelector('[data-user]');if(e)e.textContent=state().user?.name||'Member'}
function logout(){let s=state();s.logged=false;s.user=null;save(s);location.href='index.html'}
function claim(id,amount){let s=state();if(s.claims[id]){toast('Misi sudah diklaim.');return}s.claims[id]=Date.now();s.coins+=amount;save(s);toast('+'+amount.toLocaleString('id-ID')+' Coin masuk!');setTimeout(()=>location.reload(),700)}
