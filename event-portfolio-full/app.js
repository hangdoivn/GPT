const DRIVE=(id,w=1600)=>`https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
const FALLBACK=(id,w=1600)=>`https://lh3.googleusercontent.com/d/${id}=w${w}`;

const projects=[
  {slug:'bao-ve-sinh-ke',title:'Hội thảo Bảo vệ sinh kế',category:'Community',type:'Conference · Community',images:['1lHodZB4NYHSxbDeZGFEVVJDVx3EnsF3-','1MWcCWuaodRGwKPGx0-7jNCJESikTgVz4','1ZIkSfz0WAWGzX2UdtDWSK37ERhpobBiA','1Wx636mCBljbkQmLDp62be-FrYggsfr4q','1SomotQXH3ILIM9rWUJ-ja19A42Ay7TQJ','1R1dtmqTyGC1U2a7D-otsbGw-DCg2_AJz','1JLuX0ccAMuEqNzSVIzl1A0ZbZhA-9RZ4','19WhU3KmW_QmIT3rS2AgHe5O8ZeLRBNOh']},
  {slug:'easter-day',title:'Easter Day Premier',category:'Hospitality',type:'Family Event · Hospitality',images:['166W1895dXYc-YdlZCb3BFiFCzZR-xUj8','1tE6iXmIvHMxurm02ccINmI1Sqr5Vo65b','1yDR1-L40ta_DSx9EroUEdPW3ueviK3TD','1KY73iO35-PTmkqyEIUfBqs450AKgtY6_','1UECznwv9q0RhIIIXwRvm_8I_USnW_45D','1khixGly_ZHBpn34vL8t2hqsOPZYCc3CZ']},
  {slug:'the-founder',title:'The Founder',category:'Corporate',type:'Business Event · Networking',images:['1dFHz3JJbFR47GPt_EaOeyJIjxA_iGUMk','1n9dIDzuonpniCdEz75CdzeFGNu9BNw7O','1r3z0R9XqWQkLxP5EmMsTZwo7b3u43NR5','1WcvRtMB4rJ72ch1p02J7i5t2OCs7wHr-','1fDXiQHigNvP99jjiWsFkpJs8KVyIlvhD','1R6HLto3hkVkeZcJdMv1p3oUPEtTWfDwD','13_gMOlh7JOuG8NGrTFeTNBeihGI_Zseh','1FUVMNkC5LwZqAC4YNwetmKw0Wp49tZl5']},
  {slug:'vnpay-trade-fair',title:'VNPAY Hội chợ thương mại',category:'Activation',type:'Trade Fair · Brand Activation',images:['1arv3WUfDVq8xcuZLTve54e3pjcad9E1e','1FIsuV1YFQDHf5twZIhEJ_58U5cUoeqE4','1tJ80zkZMmRHZ1wll8BueQVwCKPg0KE6L','15QY66hMkh8TpOtdRsJK3fMyxbw07z55r','1csB4REK3THq242vGMwbVVEOhBoSA-2yW','1gZhkDfaNbwLD3gAcm9f034uome7G50vf','15PBAw4rQZeyltv5TkZlCGG1F0m90_XqO','1YoxFSSsoP82rNpwUUIRetF7A_mhNrw5K']},
  {slug:'19train',title:'19Train',category:'Corporate',type:'Training Series · Corporate',images:['12AAw5pkTfjXYy_ZG4gYF1T7qdeXx3J6B','119z4BNaXdMDqEwGr22z_dRTdnqm9eElW','19VSHNwSl_iScgfZTNpLJQRx1r3ujRRBj','1xLOgUDFh5-rZ5nNL-nGCtDPkalEiGm-N','1JNzoUOoEbj1X-yHkmHu9sT94yzdRiV8F','15nnwMBn75zWl5IAzFa22R7jT_tCIB0NY','1mF7LDS6b757DCqnOUBngVlnaqFDD59bO','1L9mGxteLJrb2iT-IzoTOLdeBq3Gtkm4a','1gCHc10zeErAlyoScjvHGyZN0-LX-W90t','1bV1hj1pmf1XE43qfReDwFidjfc_xyAXU','1QNK_-HIeQGAv7gnVjG81-nCOHJ27YXFp','1voEZr6Qa0hApGU6a6KfWBfBxLT1TY6rs']},
  {slug:'vin-lang-van',title:'Vin Làng Vân',category:'Launch',type:'Launching Event · Large-scale',images:['1CmGSGSBRsz-06oAaS_Uqe1AAzOppHGk_','1EwvIWclOWjgjxRN954mJrlm9rzsBVIPY','1Sj2a0ccPQLjz849fD0slbHsZA-d_VYx2','1J9SzSO6Xu3xTHTGd60LXToFki2XRSRAd','1symiMapWyu6q_cjTDq9ZgXa9QUitXBK2','1I6k37Sxvtw9voJ02Ws3AE-Se7JPrxuTk','1AYJG50Iiwyzf_WuMo3y4mLb_IryTiZa_','18gvcZFv2EKnW58-H7PEacUshQX86NDw9']},
  {slug:'to-nghe-san-khau',title:'Tổ nghề sân khấu',category:'Culture',type:'Traditional Culture · Ceremony',images:['1R6ZEhU6xaCZNXI1zAgvFzUMhE8uqzrTD','1M47cmirHjEwqrB7xG0M07uzTQorVu9_9','10CdmMjV0wv5HaA2ZVHRo0ZPjuMZBfauu','1TA-L_YFPHBr7KraJpNGg4-LDOBL7nm5_','1RuGB9BjKBvZb3312EMWmv_qEErhYf1Wf','13r9NXQfdQ1dMQQOYyHpdomjVaTHu4XGA','1vpl0njyz-i1fObnVAKYzjeKGEo-bXruj','1IV26HTVn-NneN9cDtBlz85PG6HVJhUDo']},
  {slug:'jci-danang',title:'JCI Đà Nẵng',category:'Community',type:'Launching · Community Day',images:['1JYqdVBlEi2A3EUNGW8IzZ4CP9cf0y0y5','1xvsRTHQG1z3mCKwnLP1LmaWp0mRER7Ow','1LF6P45MveLW-VSXcciq2FfjRHKEgnpIP','1ujZcMO3Aw3sAVn2znHvN5iPljVCqtxIt','15ZW-SQWJIrxU2V84PwfeNVyWSGxDFlFH','1rSKB9bmLwsTHoxzHHDRYBIz1iYOOLvXw','14D4h5G43Bi7ogv00izKJq7hDXMHjbEuJ','1gNxQnWQD6ZTcnso8S3gRUpB4EA2QI8WO','1WWNLbWbpv0fmLZ712KWoHLigMbFZzYbU','1lcMFsjuTwU0QadFuonnTPc2vaoPaqgzN']},
  {slug:'xine-jazz',title:'Xi Nê Bistro & Jazz',category:'Hospitality',type:'Live Music · F&B Event',images:['17sGmJ-LZSNw0vshOC6jgK1SWtq5q4Kkn','1kX4GfaqbVJMUA3yhJlZrY9_-t8gxjOXk','1UrD7nfUe3QzGFWKrBLet1Rl6BjUQqXKB','1KucAz00Ijy5XsDNsyB4JB9izNSJuS7io','1vQvYvvJ5UxY_ITS9pwYPXu6kZkEThOt3','1I-cTePqN2ZZkJ5FJ828xmpPHH84-nbB1','1ha1bAQ0m6hwn6V-uH7_7LxeLgCT1xgt_','1iBPVWUV8vy6Ope6XlpSHTt256JLfezJl','1VXG-kVUc5eLGCtpM5sFmZj_8kPSJ3KuF','12B9PT4LEsK5mBlSzEADZBwrp7t2KRD7-']},
  {slug:'yep-mib',title:'YEP MIB — Brave To Shift',category:'Corporate',type:'Year End Party · Gala',images:['11eNKE4OTOZhNciSDkqH4Higny_a5amXl','1hTq-I8CC1gd7lAEVbwqUrHxc9jvrJcGP','1n3uIlSXmomrwwJwAnmBSBn7Zd050tm6t','1ulUsLei0_jzW7SQVyw1Zrl2fyE2zfF3J','1PgSSGLDgQSdLcdJA-U8YL4TuD_pBZ-8k','1cQaIRpdUMi4bFmGdMaTXyTqAyFAj-vRc','1817OfXKwlxQw7iwClgrOuxojWBtxUIEY','1C6JAkg__Y1rP4KgnXauDP8HXiY-4mbLm','1CQFMqAdKCLAWUVkd62OpEdFWZjMiW6qu','11u0YiANxCh36cFfrCaz8McSyzjbvHuv6']},
  {slug:'hoi-xuan-trung-vuong',title:'Hội Xuân Trưng Vương',category:'Culture',type:'Spring Festival · Community',images:['1pNM-qpBkOpUEQRgBpBaHe9081w2220U9','1SX5q3J7S6QEHjlTw4phUgBpDzhg2kHN0','1CI8mUX-lsYbAU3LmqMYfmXJIoxPMXbp5','1ksMnG9sZhf7bnfWzdbmWjHhborOJOrIp','1uUeYaznwnyG67gXsy3MULW0ki7exSPU9','1n2obm9-QTx2-jKQK31D0mPStwifk6rXN','1GnkqmJZJVtOdOHOHMxQ7NDXJflsdwCa-','1pZcLmDPRr2IGmzsDcQ7mNYScRe6bIMT2','1rTrkMdYAKiF1zuf6ma1dkElWn74I_YJj']},
  {slug:'workshop-doji',title:'Workshop DOJI',category:'Corporate',type:'Workshop · Luxury Retail',images:['1HZtO2fnTObvqckm6hgkIdcPN3o2OhJ57','1ArBd24KT5RwpLHniDGvR1GSI_xadtkoW','1Mji5tuf-BArOR89A6HqSLvJ6DfGIesW8','1QOsJYOzsp_NdhOFHv6Er4htiWXRjrY51','1UYgwFAzNpnzRILEfAuiLdtRvSCvofF6k','1jhYdLhAYizZbuVXGBaroP1IWTAlVgfAu','1Fo-rMtWf4BQ25QGO_r2Zz4RyM3ZVKeYq','1Hi3JmjG0TzXtK_dC6bU_YL4FhLEQiuqv','1YoFYqrN-b4fn7hgbB3BnPQ4hKjYCm96a','1NZGvkyrB1rl5FandRAvwupX4XbxqwEvw']},
  {slug:'vinfast-hai-vot',title:'VinFast × Hải Vót',category:'Activation',type:'Automotive · Brand Activation',images:['1XTb2wKvyUr-LsirdLmXRiEA8eM4A4sDH','1ilndGV698qJkFJA9LxhtlD4edgZu_KIt','11z47pgYrBBDsbj4DvrM8kLf7fGPxvhUX','1V_k_gUtWX2_-M-PlwQQKXd2-cvljWOsR','1fsmd9yriz0PTwt0AGPKIgiCO5IkbApKT','1V5S40LcIoE_RLv0FqKz6WkON_DEmu9Gc','14cpM_F4b7lVp2bfujKgJpm-5MKsm2Jfk']},
  {slug:'an-toan-giao-thong',title:'Chung kết Tìm hiểu An toàn Giao thông',category:'Community',type:'Competition · Education',images:['1H6QsyGqy-FkgABU7X1O90hWnsLxlDu-R','1DPGN6PwaYLluGciRzp_rCFFEKFy-7K7G','1XFhslu5175k_tn6dLu2Rke166y4DvDMP','1vWGI-m-iAMlpAxDb4BQeo6oYH5rVSkZp','147AO6qBPm6PBGaU_S-oBuwgbSiCupoO8','1sGoF-5n3WdZkDsZL32OrbGJyGfujkvnk','1Kp-frgx15V8arc_vk40iHpNisrg1eSs2','1OMO4laYQSX12KLIOc4E05bbMTpky2U58']},
  {slug:'hoa-hau-du-lich',title:'Hoa hậu Du lịch',category:'Culture',type:'Pageant · Tourism',images:['1dT9mXUGBiKZGZ_--U_D8pizB3xuCQTFO','1YPS3oKUyZqvM0yCp_e8_CDqMUBU_CmbA','1KjC5AqZztVRzuvk_9KdiLZ2Gw9Kv-uJr','1zO8wgEshYmPIjhD83vpHPKiSQGYg4-F0','1iSvZvqdW8TTkRupvNgprBjILKB_YM_TW','1UUqQZgS-eB22nrujHHeZJTQ7UPKonVAC','1YKAM-o0jciox48yeVDYAIvIE1TeqoHTx','1QNmCgq4pGVCjY7wNMD4l_Z7YxeKwRbpK']}
];

const featuredCopy={
  'vin-lang-van':'Coverage một sự kiện ra mắt quy mô lớn, ưu tiên cảm giác về không gian, đám đông, nghi thức và năng lượng thương hiệu.',
  'yep-mib':'Một đêm gala doanh nghiệp được kể lại bằng sân khấu, khoảnh khắc trao giải, tinh thần đội ngũ và cao trào chương trình.',
  'xine-jazz':'Không khí live music trong không gian F&B, tập trung vào ánh sáng, nghệ sĩ, khách hàng và trải nghiệm tại điểm đến.'
};
const featuredSlugs=['vin-lang-van','yep-mib','xine-jazz'];
const categoryOrder=['All','Corporate','Community','Culture','Hospitality','Activation','Launch'];

const featuredGrid=document.querySelector('#featuredGrid');
const grid=document.querySelector('#projectGrid');
const filters=document.querySelector('.filters');
const modal=document.querySelector('#projectModal');
const modalGallery=document.querySelector('#modalGallery');
const modalTitle=document.querySelector('#modalTitle');
const modalCategory=document.querySelector('#modalCategory');
const modalMeta=document.querySelector('#modalMeta');
const modalCover=document.querySelector('#modalCover');
const viewer=document.querySelector('#viewer');
const viewerImage=document.querySelector('#viewerImage');
const viewerCaption=document.querySelector('#viewerCaption');
const viewerCount=document.querySelector('#viewerCount');
let activeProject=null;
let activeIndex=0;

function attachFallback(img,id,w){
  img.dataset.driveId=id;
  img.dataset.width=w;
  img.addEventListener('error',()=>{
    if(img.dataset.failed)return;
    img.dataset.failed='1';
    img.src=FALLBACK(id,w);
  },{once:true});
}

function makeImage(id,w,alt,loading='lazy'){
  const img=document.createElement('img');
  img.src=DRIVE(id,w);
  img.alt=alt;
  img.loading=loading;
  img.decoding='async';
  attachFallback(img,id,w);
  return img;
}

function renderFeatured(){
  featuredGrid.innerHTML='';
  featuredSlugs.forEach((slug,index)=>{
    const p=projects.find(item=>item.slug===slug);
    if(!p)return;
    const article=document.createElement('article');
    article.className='featured-case';

    const copy=document.createElement('div');
    copy.className='featured-copy';
    copy.innerHTML=`<span class="featured-no">${String(index+1).padStart(2,'0')}</span><small>${p.category} · ${p.type}</small><h3>${p.title}</h3><p>${featuredCopy[p.slug]}</p>`;
    const action=document.createElement('button');
    action.className='case-link';
    action.type='button';
    action.textContent=`View full project · ${p.images.length} photographs ↗`;
    action.onclick=()=>openProject(p);
    copy.appendChild(action);

    const media=document.createElement('figure');
    media.className='featured-media';
    media.tabIndex=0;
    media.setAttribute('role','button');
    media.setAttribute('aria-label',`Xem dự án ${p.title}`);
    media.appendChild(makeImage(p.images[0],1600,p.title,index===0?'eager':'lazy'));
    const caption=document.createElement('figcaption');
    caption.innerHTML=`<span>${p.title}</span><span>${p.type}</span>`;
    media.appendChild(caption);
    media.onclick=()=>openProject(p);
    media.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProject(p)}};

    article.append(copy,media);
    featuredGrid.appendChild(article);
  });
}

function buildFilters(){
  filters.innerHTML='';
  categoryOrder.filter(name=>name==='All'||projects.some(p=>p.category===name)).forEach((name,index)=>{
    const button=document.createElement('button');
    button.className='filter'+(index===0?' active':'');
    button.type='button';
    button.textContent=name;
    button.onclick=()=>{
      document.querySelectorAll('.filter').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      renderIndex(name);
    };
    filters.appendChild(button);
  });
}

function renderIndex(filter='All'){
  grid.innerHTML='';
  const items=filter==='All'?projects:projects.filter(p=>p.category===filter);
  if(!items.length){grid.innerHTML='<div class="empty">Không có dự án phù hợp.</div>';return}

  items.forEach((p,index)=>{
    const row=document.createElement('button');
    row.className='project-row';
    row.type='button';
    row.setAttribute('aria-label',`Xem dự án ${p.title}`);

    const number=document.createElement('span');
    number.className='project-number';
    number.textContent=String(index+1).padStart(2,'0');

    const title=document.createElement('span');
    title.className='project-title';
    title.textContent=p.title;

    const type=document.createElement('span');
    type.className='project-type';
    type.textContent=p.type;

    const count=document.createElement('span');
    count.className='project-count';
    count.textContent=`${p.images.length} photos`;

    const thumb=document.createElement('span');
    thumb.className='project-thumb';
    thumb.appendChild(makeImage(p.images[0],500,p.title));

    row.append(number,title,type,count,thumb);
    row.onclick=()=>openProject(p);
    grid.appendChild(row);
  });
}

function setImage(img,id,w,alt){
  img.dataset.failed='';
  img.src=DRIVE(id,w);
  img.alt=alt;
  img.onerror=()=>{
    if(img.dataset.failed)return;
    img.dataset.failed='1';
    img.src=FALLBACK(id,w);
  };
}

function openProject(p){
  activeProject=p;
  modalTitle.textContent=p.title;
  modalCategory.textContent=`${p.category} · ${p.type}`;
  modalMeta.textContent=`${p.images.length} selected photographs`;
  setImage(modalCover,p.images[0],1800,`${p.title} — cover`);

  modalGallery.innerHTML='';
  p.images.forEach((id,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='gallery-item';
    button.setAttribute('aria-label',`Mở ảnh ${index+1} của ${p.title}`);
    button.appendChild(makeImage(id,1200,`${p.title} — ảnh ${index+1}`));
    button.onclick=()=>openViewer(index);
    modalGallery.appendChild(button);
  });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('lock');
  modal.scrollTop=0;
  history.replaceState(null,'',`#${p.slug}`);
}

function closeProject(){
  closeViewer();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('lock');
  activeProject=null;
  modalCover.src='';
  modalGallery.innerHTML='';
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
}

function openViewer(index){
  activeIndex=index;
  updateViewer();
  viewer.classList.add('open');
  viewer.setAttribute('aria-hidden','false');
}

function updateViewer(){
  if(!activeProject)return;
  const id=activeProject.images[activeIndex];
  setImage(viewerImage,id,2400,`${activeProject.title} — ảnh ${activeIndex+1}`);
  viewerCaption.textContent=activeProject.title;
  viewerCount.textContent=`${String(activeIndex+1).padStart(2,'0')} / ${String(activeProject.images.length).padStart(2,'0')}`;
}

function closeViewer(){
  viewer.classList.remove('open');
  viewer.setAttribute('aria-hidden','true');
  viewerImage.src='';
}

function moveViewer(step){
  if(!activeProject)return;
  activeIndex=(activeIndex+step+activeProject.images.length)%activeProject.images.length;
  updateViewer();
}

const closeModalButton=document.querySelector('.close-modal');
const closeBottomButton=document.querySelector('.close-project-bottom');
closeModalButton.onclick=closeProject;
closeBottomButton.onclick=()=>{modal.scrollTo({top:0,behavior:'smooth'});setTimeout(closeProject,280)};
document.querySelector('.viewer-close').onclick=closeViewer;
document.querySelector('.viewer-prev').onclick=()=>moveViewer(-1);
document.querySelector('.viewer-next').onclick=()=>moveViewer(1);
document.querySelector('.menu').onclick=()=>document.querySelector('.nav').classList.toggle('open');
document.querySelectorAll('.nav-links a').forEach(link=>link.onclick=()=>document.querySelector('.nav').classList.remove('open'));
modal.querySelector('.modal-brand').onclick=e=>{e.preventDefault();closeProject()};

viewer.addEventListener('click',event=>{if(event.target===viewer)closeViewer()});
document.addEventListener('keydown',event=>{
  if(viewer.classList.contains('open')){
    if(event.key==='Escape')closeViewer();
    if(event.key==='ArrowLeft')moveViewer(-1);
    if(event.key==='ArrowRight')moveViewer(1);
  }else if(modal.classList.contains('open')&&event.key==='Escape'){
    closeProject();
  }
});

let touchX=0;
viewer.addEventListener('touchstart',event=>touchX=event.changedTouches[0].clientX,{passive:true});
viewer.addEventListener('touchend',event=>{
  const distance=event.changedTouches[0].clientX-touchX;
  if(Math.abs(distance)>45)moveViewer(distance>0?-1:1);
},{passive:true});

renderFeatured();
buildFilters();
renderIndex();
const requested=projects.find(p=>`#${p.slug}`===location.hash);
if(requested)openProject(requested);
