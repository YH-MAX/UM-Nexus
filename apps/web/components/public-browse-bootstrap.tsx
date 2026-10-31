// Start only the anonymous default feed while HTML is parsed, before hydration.
// Never bootstrap account data, sessions or seller contact destinations.
export function PublicBrowseBootstrap() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1")
    .replace(/^NEXT_PUBLIC_API_BASE_URL=/, "").replace(/\/+$/, "");
  const url = JSON.stringify(`${base}/listings?limit=24&sort=latest`).replace(/</g, "\\u003c");
  const code = `if(location.pathname==='/trade'||location.pathname==='/trade/explore'){(function(){var c=new AbortController(),t=setTimeout(function(){c.abort()},20000);window.__umNexusPublicBrowse={startedAt:Date.now(),promise:fetch(${url},{credentials:'omit',cache:'no-store',signal:c.signal}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).finally(function(){clearTimeout(t)})}})()}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} id="public-browse-bootstrap" />;
}
