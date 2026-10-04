// Design tokens — single source of truth, gedeeld door App.jsx en RepsTab.jsx.
// Verplaatst uit App.jsx (regels 582-596), ongewijzigd.

export const C = {
  bg:"#F7F6F3", surface:"#FFFFFF", surfaceAlt:"#F0EEE9", surfaceHover:"#ECEAE4",
  border:"#E4E0D8", borderMid:"#D0CCBF",
  text:"#1A1814", textSub:"#6B6456", textMuted:"#A09585",
  purple:"#7C3AED", purpleLight:"#EDE9FD", purpleMid:"#DDD6FE",
  green:"#059669",  greenLight:"#D1FAE5",
  red:"#DC2626",    redLight:"#FEE2E2",
  amber:"#D97706",  amberLight:"#FEF3C7",
  cyan:"#0891B2",   cyanLight:"#CFFAFE",
  shadow:"0 1px 3px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)",
  shadowLg:"0 8px 24px rgba(0,0,0,0.12),0 2px 6px rgba(0,0,0,0.06)",
};

export const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
export const mono = "'SF Mono','Fira Mono',monospace";

export const inp = (extra={}) => ({ fontFamily:font, fontSize:15, color:C.text, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", outline:"none", width:"100%", boxSizing:"border-box", WebkitAppearance:"none", ...extra });
