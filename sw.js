/* 하코다테 가이드 오프라인 캐시
   앱 껍데기(HTML/아이콘/폰트)는 캐시에서, 일정 데이터(구글 시트)는 항상 네트워크에서 가져옵니다.
   내용을 수정한 뒤에는 아래 CACHE 버전을 v2, v3... 으로 올려야 갱신됩니다. */
const CACHE = "hakodate-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // 구글 스프레드시트 데이터는 캐시하지 않음 (앱에서 localStorage로 따로 보관)
  if (req.url.includes("docs.google.com")) return;

  // 같은 도메인의 앱 파일: 캐시 우선 + 백그라운드 갱신
  if (new URL(req.url).origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // 폰트 등 외부 자원: 네트워크 우선, 실패하면 캐시
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
