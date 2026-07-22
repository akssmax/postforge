import { InlineScript } from "@/components/inline-script";

const THEME_BOOTSTRAP = `(function(){try{var k='postforge-theme';var t=localStorage.getItem(k)||'system';var d=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var r=document.documentElement;r.dataset.theme=d;r.classList.toggle('dark',d==='dark');r.classList.toggle('light',d==='light');}catch(e){}})();`;

export function ThemeScript() {
  return <InlineScript html={THEME_BOOTSTRAP} />;
}
