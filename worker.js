// 使用绑定的 R2 存储桶（根据 `wrangler.toml` 中配置的 `binding` 名称）
const MY_BUCKET = MY_BUCKET;  // R2_BUCKET 是在 wrangler.toml 中绑定的名称

// 列出 R2 存储桶中的所有对象
async function listObjects() {
  try {
    const objects = await MY_BUCKET.list();  // 列出存储桶中的对象
    return objects.objects || [];
  } catch (error) {
    console.error("Error fetching objects from R2:", error);
    throw new Error('Failed to fetch objects from R2');
  }
}

// 处理请求并返回响应
async function handleRequest(request) {
  const url = new URL(request.url);

  // 如果是 /list.json 请求，返回图片列表
  if (url.pathname === "/list.json") {
    try {
      const files = await listObjects();
      const fileNames = files.map(file => file.key);  // 只返回文件名

      return new Response(JSON.stringify(fileNames), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response("Error fetching objects from R2", { status: 500 });
    }
  } else {
    // 如果是其他请求，返回 HTML 页面（前端页面）
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
  <title>R2 图床画廊</title>
  <style>
    body {margin:0;background:#0d1117;color:#e6eef6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
    h1 {padding:16px;margin:0;font-size:20px;text-align:center;}
    .controls {text-align:center;margin:10px 0;}
    button {margin:0 5px;padding:6px 12px;border:none;border-radius:4px;background:#21262d;color:#e6eef6;font-size:14px;cursor:pointer;}
    button.active {background:#58a6ff;}
    .gallery {display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;padding:0 8px 20px;}
    .card {overflow:hidden;border-radius:8px;background:#161b22;cursor:pointer;}
    .card img {width:100%;height:auto;object-fit:cover;transition:transform 0.25s;}
    .card:hover img {transform:scale(1.05);}
    .lightbox {position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);z-index:999;padding:10px;}
    .lightbox img {max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 0 20px rgba(0,0,0,.6);touch-action:none;}
    @media (min-width:400px) {.gallery {grid-template-columns:repeat(auto-fill,minmax(150px,1fr));}}
    @media (min-width:768px) {.gallery {grid-template-columns:repeat(auto-fill,minmax(180px,1fr));}}
  </style>
</head>
<body>
<h1>R2 图床画廊</h1>
<div class="controls">
  <button id="sortTime" class="active">按上传时间</button>
  <button id="sortName">按文件名</button>
</div>
<main id="gallery" class="gallery"></main>
<div id="lightbox" class="lightbox"><img id="lightboxImg" src=""></div>

<script>
const PUBLIC_URL_PREFIX = "https://your-account-id.r2.cloudflarestorage.com/your-bucket-name/";  // 替换为你的 R2 存储 URL
const BATCH_SIZE = 50;
let allFiles = [];
let loadedCount = 0;
let currentSort = 'time';

// 懒加载
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
},{rootMargin:"200px"});

async function loadImages(){
  try{
    const res = await fetch("/list.json?sort="+currentSort+"&_="+Date.now());
    return await res.json();
  }catch(err){
    console.error("加载 list.json 失败:", err);
    return [];
  }
}

function renderBatch(){
  const gallery = document.getElementById("gallery");
  const batch = allFiles.slice(loadedCount, loadedCount+BATCH_SIZE);
  batch.forEach(file=>{
    const url = PUBLIC_URL_PREFIX+file;
    const card = document.createElement("div");
    card.className="card";
    const img = document.createElement("img");
    img.dataset.src=url;
    img.alt="";
    card.appendChild(img);
    card.onclick=()=>openLightbox(url);
    gallery.appendChild(card);
    observer.observe(img);
  });
  loadedCount += batch.length;
}

const lightbox=document.getElementById("lightbox");
const lightboxImg=document.getElementById("lightboxImg");
function openLightbox(src){
  lightboxImg.src = src;
  lightbox.style.display="flex";
}
lightbox.onclick=()=>{lightbox.style.display="none";lightboxImg.src="";};

window.addEventListener("scroll",()=>{ 
  if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 150){
    if(loadedCount < allFiles.length) renderBatch();
  }
});

async function initGallery(){
  allFiles = await loadImages();
  loadedCount = 0;
  document.getElementById("gallery").innerHTML = "";
  renderBatch();
}

setInterval(async()=>{
  const files = await loadImages();
  if(JSON.stringify(files) !== JSON.stringify(allFiles)){
    allFiles = files;
    loadedCount = 0;
    document.getElementById("gallery").innerHTML = "";
    renderBatch();
  }
}, 300000);

document.getElementById("sortTime").addEventListener("click",()=>{
  currentSort = 'time';
  document.getElementById("sortTime").classList.add("active");
  document.getElementById("sortName").classList.remove("active");
  initGallery();
});

document.getElementById("sortName").addEventListener("click",()=>{
  currentSort = 'name';
  document.getElementById("sortName").classList.add("active");
  document.getElementById("sortTime").classList.remove("active");
  initGallery();
});

initGallery();
</script>
</body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}

// 处理 fetch 事件
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
