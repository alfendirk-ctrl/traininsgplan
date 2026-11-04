// Design tokens — single source of truth, gedeeld door App.jsx en RepsTab.jsx.
//
// Donker palet, afgestemd op de Reps- en Mobiliteit-app zodat de drie schermen
// bij elkaar horen. Alle kleuren van het Plan-tabblad, Routines, Geschiedenis
// en Database komen hier vandaan, dus dit bestand kantelt ze in één keer mee.
// De accentkleuren zijn opgehelderd: op een donkere achtergrond hebben de
// oorspronkelijke tinten te weinig contrast om leesbaar te zijn.

export const C = {
  bg:"#0A0A0A", surface:"#171717", surfaceAlt:"#1F1F1F", surfaceHover:"#262626",
  border:"#282828", borderMid:"#3D3D3D",
  text:"#FAFAFA", textSub:"#D4D4D4", textMuted:"#8A8A8A",
  purple:"#A78BFA", purpleLight:"#1E1B2E", purpleMid:"#312A4A",
  green:"#4ADE80",  greenLight:"#13241A",
  red:"#F87171",    redLight:"#2A1515",
  amber:"#FBBF24",  amberLight:"#2A2112",
  cyan:"#5AA9E6",   cyanLight:"#0C1824",
  shadow:"0 1px 3px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.3)",
  shadowLg:"0 8px 24px rgba(0,0,0,0.6),0 2px 6px rgba(0,0,0,0.4)",
};

export const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
export const mono = "'SF Mono','Fira Mono',monospace";

export const inp = (extra={}) => ({ fontFamily:font, fontSize:15, color:C.text, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", outline:"none", width:"100%", boxSizing:"border-box", WebkitAppearance:"none", ...extra });
