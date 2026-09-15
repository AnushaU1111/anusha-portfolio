import html
COLS,ROWS=158,29
CELL_AR=0.60
N={
 "text":(9,5),"image":(9,12),"pdf":(9,19),"voice":(9,26),
 "detect":(31,15),"translate":(50,15),
 "guidelines":(76,7),"textbook":(76,15),"q&a":(76,23),
 "hybrid":(99,15),"granite":(117,15),"guardian":(134,15),
 "reply":(150,11),"audio":(150,20),
}
LBL={"text":"text","image":"image + ocr","pdf":"pdf","voice":"voice",
 "detect":"detect lang","translate":"translate","guidelines":"guidelines",
 "textbook":"textbook","q&a":"q and a","hybrid":"hybrid score","granite":"granite 3.3",
 "guardian":"guardian","reply":"reply","audio":"audio"}
E=[("text","detect"),("image","detect"),("pdf","detect"),("voice","detect"),
   ("detect","translate"),
   ("translate","guidelines"),("translate","textbook"),("translate","q&a"),
   ("guidelines","hybrid"),("textbook","hybrid"),("q&a","hybrid"),
   ("hybrid","granite"),("granite","guardian"),("guardian","reply"),("guardian","audio")]
KIND={"text":1,"image":1,"pdf":1,"voice":1,"detect":2,"translate":2,
 "guidelines":3,"textbook":3,"q&a":3,"hybrid":2,"granite":4,"guardian":5,
 "reply":6,"audio":6}
grid=[[" "]*COLS for _ in range(ROWS)]; val=[[0]*COLS for _ in range(ROWS)]
def put(c,r,ch,v,over=False):
    if 0<=r<ROWS and 0<=c<COLS and (over or grid[r][c]==" "):
        grid[r][c]=ch; val[r][c]=v
def dirchar(c0,r0,c1,r1):
    dc=(c1-c0)*CELL_AR; dr=r1-r0
    if abs(dc)<1e-9: return "|"
    s=dr/dc
    if abs(s)<0.42: return "-"
    if abs(s)>2.4: return "|"
    return "\\" if (dr>0)==(dc>0) else "/"
def halfw(k): return len(LBL[k])//2+2
for a,b in E:
    (c0,r0),(c1,r1)=N[a],N[b]
    ch=dirchar(c0,r0,c1,r1)
    n=max(abs(c1-c0),abs(r1-r0))*4
    for s in range(1,n):
        t=s/n; c=int(round(c0+(c1-c0)*t)); r=int(round(r0+(r1-r0)*t))
        if (r==r0 and abs(c-c0)<=halfw(a)) or (r==r1 and abs(c-c1)<=halfw(b)): continue
        put(c,r,ch,-10)
for k,(c,r) in N.items():
    lab="["+LBL[k]+"]"
    start=c-len(lab)//2
    for j,ch in enumerate(lab): put(start+j,r,ch,-KIND[k],over=True)
COL={-1:("238,212,214",.92),-2:("206,168,174",.86),-3:("246,226,226",1.0),
     -4:("224,150,158",.95),-5:("232,120,126",1.0),-6:("238,212,214",.92),
     -10:("150,104,110",.42)}
def paint():
    out=[]
    for r in range(ROWS):
        s=""
        for c in range(COLS):
            ch=grid[r][c]
            if ch==" ": s+=" "; continue
            col,a=COL.get(val[r][c],("150,104,110",.4))
            s+=f'<i style="color:rgba({col},{a})">{html.escape(ch)}</i>'
        out.append(s)
    return "\n".join(out)
pipe=paint()

MODES=[("text","typed query","any language"),
       ("image","photo of a leaflet or report","tesseract ocr"),
       ("pdf","uploaded document","pdfplumber, pypdf2"),
       ("voice","spoken question, live mic","openai whisper")]
modes="".join(f'<div class="mrow"><span class="mk mono">{a}</span>'
              f'<span class="mv">{b}</span><span class="mt mono">{c}</span></div>' for a,b,c in MODES)
SRC=[("clinical guidelines","uspstf, acg",0.45),("textbook content","colorectal chapters",0.30),
     ("structured q and a","colonoscopy literature",0.25)]
BW=34
src=""
for name,note,w in SRC:
    n=int(round(w*BW)); bar="8"*n+"·"*(BW-n)
    src+=(f'<div class="srow"><span class="sn mono">{name}</span>'
          f'<pre class="sp">{"".join(chr(0)) if False else html.escape(bar)}</pre>'
          f'<span class="sv mono">{w:.2f}</span><span class="st mono">{note}</span></div>')
KEEPS=[("chat memory","carried into the prompt so follow-up questions work"),
       ("session history","resumable, and clearable in one click"),
       ("audit log","separate and permanent, kept whatever the user clears")]
keeps="".join(f'<div class="krow"><span class="kk mono">{a}</span><span class="kv">{b}</span></div>' for a,b in KEEPS)

AX=["medical accuracy","hallucination rate","response coherence"]
ax="".join(f'<span class="ax mono">{a}</span>' for a in AX)

page=f'''<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0b0708;--ink:#e6dfd8;--mute:#6f6366;--rose:#c46e78;--line:#1f1417}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:var(--bg);color:var(--ink);font-family:Cormorant,serif;width:1440px}}
.mono{{font-family:"JetBrains Mono",monospace}}
.frame{{position:relative;height:900px;border-bottom:1px solid var(--line);overflow:hidden}}
.stamp{{position:absolute;top:22px;left:48px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#4a4042;z-index:9}}
nav{{position:absolute;top:22px;right:48px;display:flex;gap:38px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--mute);z-index:9}}
nav .on{{color:var(--rose)}}
pre.pipe{{position:absolute;left:58px;top:368px;font-family:"JetBrains Mono",monospace;
  font-size:12px;line-height:15.4px;white-space:pre;z-index:1}}
pre.pipe i{{font-style:normal}}
.veil{{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg, rgba(11,7,8,.99) 0%, rgba(11,7,8,.97) 26%, rgba(11,7,8,.35) 40%, rgba(11,7,8,.05) 62%, rgba(11,7,8,.55) 100%)}}
.hero{{position:absolute;left:48px;top:112px;width:760px;z-index:4}}
.idx{{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--rose)}}
h2{{font-size:56px;font-weight:300;line-height:1.05;margin:22px 0 24px;letter-spacing:-.01em}}
h2 em{{font-style:italic}}
.hero p{{font-size:17.5px;font-weight:300;line-height:1.55;color:#a2958f;max-width:540px}}
.ncap{{position:absolute;right:48px;bottom:30px;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#6a5c5e;z-index:4;text-align:right;line-height:2}}
.left{{position:absolute;left:48px;top:104px;width:410px;z-index:4}}
.left h3{{font-size:37px;font-weight:300;line-height:1.08;margin:18px 0 20px}}
.left h3 em{{font-style:italic;color:var(--rose)}}
.body p{{font-size:15px;font-weight:300;line-height:1.6;color:#a2958f;margin-bottom:12px}}
.body p.hi{{color:#ded5ce;border-left:1px solid var(--rose);padding-left:18px;margin-top:18px}}
.nums{{margin-top:26px;display:flex;gap:20px;border-top:1px solid var(--line);padding-top:18px}}
.nums .n{{font-size:26px;font-weight:300;line-height:1;white-space:nowrap}}
.nums .n.rose{{color:var(--rose)}}
.nums .l{{font-size:7.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-top:8px}}
.stack{{margin-top:22px;display:flex;flex-wrap:wrap;gap:5px}}
.stack span{{border:1px solid var(--line);padding:4px 8px;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#8d817c}}
.credit{{margin-top:18px;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#4a4042;line-height:2}}
.figs{{position:absolute;left:498px;top:104px;right:48px}}
.fhead{{font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#4a4042;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:13px;display:flex;justify-content:space-between}}
.fhead b{{color:#a2958f;font-weight:400}}
.mrow{{display:flex;align-items:baseline;height:26px}}
.mk{{width:78px;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--rose)}}
.mv{{flex:1;font-size:15px;font-weight:300;color:#c8bcb6}}
.mt{{font-size:8.5px;letter-spacing:.12em;color:#5b5052}}
.srow{{display:flex;align-items:center;gap:12px;height:24px}}
.sn{{width:136px;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#a2958f;text-align:right}}
.sp{{font-family:"JetBrains Mono",monospace;font-size:10px;line-height:24px;white-space:pre;color:rgba(214,164,170,.8)}}
.sv{{font-size:9px;color:#ded5ce;width:34px}}
.st{{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#4a4042}}
.alpha{{margin-top:10px;display:flex;align-items:center;gap:14px;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#4a4042}}
.alpha pre{{font-family:"JetBrains Mono",monospace;font-size:10px;color:rgba(214,164,170,.7)}}
.axrow{{display:flex;gap:10px;margin-top:4px;flex-wrap:wrap}}
.ax{{border:1px solid var(--line);padding:6px 11px;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#a2958f}}
.krow{{display:flex;align-items:baseline;height:26px}}
.kk{{width:120px;font-size:8.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--rose)}}
.kv{{flex:1;font-size:14.5px;font-weight:300;color:#9a8e8a}}
.note{{margin-top:16px;border-left:1px solid rgba(196,110,120,.4);padding-left:16px;font-size:9px;letter-spacing:.1em;line-height:2;color:#8d817c}}
.tag{{position:absolute;bottom:20px;left:48px;font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;color:#4a4042}}
.tag2{{position:absolute;bottom:20px;right:48px;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#3b3335}}
</style></head><body>

<section class="frame">
  <div class="stamp mono">Frame 18 · Page eight on entry · every input path, one retrieval</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Contact</span></nav>
  <pre class="pipe">{pipe}</pre>
  <div class="veil"></div>
  <div class="hero">
    <div class="idx mono">07 &nbsp;/&nbsp; 07 &nbsp;·&nbsp; Temple University &nbsp;·&nbsp; Spring 2025</div>
    <h2>A patient who cannot read<br>still needs <em>the answer.</em></h2>
    <p>A retrieval system for colorectal cancer screening, built so that language and literacy are not conditions of getting an answer.</p>
  </div>
  <div class="ncap mono">Fig. 07a &nbsp;·&nbsp; request path<br>four ways in &nbsp;·&nbsp; two ways out</div>
</section>

<section class="frame">
  <div class="stamp mono">Frame 19 · Scrolled · how the system was configured and what was measured</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Contact</span></nav>
  <div class="left">
    <div class="idx mono">07 &nbsp;/&nbsp; 07 &nbsp;·&nbsp; Temple University</div>
    <h3>A patient who cannot<br>read still needs<br><em>the answer.</em></h3>
    <div class="body">
      <p>A RAG chatbot grounded in more than a thousand curated medical documents: USPSTF and ACG clinical guidelines, textbook chapters and structured Q and A from colonoscopy literature. Ingestion, embedding, retrieval and serving, deployed as a working application.</p>
      <p class="hi">A question can arrive typed, spoken, photographed or uploaded, in any language, and the answer comes back written and read aloud. Every one of those paths exists because a barrier to reading should not be a barrier to screening information.</p>
    </div>
    <div class="nums">
      <div><div class="n rose">1,000+</div><div class="l mono">documents</div></div>
      <div><div class="n">3</div><div class="l mono">faiss indexes</div></div>
      <div><div class="n">5</div><div class="l mono">llm configs</div></div>
      <div><div class="n">4</div><div class="l mono">input modes</div></div>
    </div>
    <div class="stack mono"><span>Python</span><span>Streamlit</span><span>LangChain</span><span>FAISS</span><span>Ollama</span><span>Granite 3.3</span><span>LLaVA</span><span>Whisper</span><span>Tesseract</span><span>gTTS</span></div>
    <div class="credit mono">Advised by Dr Vikas Khurana, gastroenterologist,<br>and Prof. Subodha Kumar, Temple University</div>
  </div>
  <div class="figs">
    <div class="fhead mono"><span>Fig. 07b &nbsp;·&nbsp; <b>ways in</b> &nbsp;/&nbsp; each path normalises to one english query</span><span>4 modes</span></div>
    {modes}
    <div class="fhead mono" style="margin-top:32px"><span>Fig. 07c &nbsp;·&nbsp; <b>retrieval</b> &nbsp;/&nbsp; three indexes, weighted at runtime</span><span>weights adjustable in the ui</span></div>
    {src}
    <div class="alpha"><span>hybrid alpha</span><pre>keyword ·············8888888888888888·············· semantic</pre></div>
    <div class="fhead mono" style="margin-top:32px"><span>Fig. 07d &nbsp;·&nbsp; <b>what was assessed</b> &nbsp;/&nbsp; 5 configurations, 3 source databases</span><span>local via Ollama</span></div>
    <div class="axrow">{ax}</div>
    <div class="note mono">A Granite Guardian pass sits between generation and delivery, flagging and suppressing unsafe responses. Per-configuration scores are not published here.</div>
    <div class="fhead mono" style="margin-top:32px"><span>Fig. 07e &nbsp;·&nbsp; <b>what it keeps</b> &nbsp;/&nbsp; memory, and the ability to discard it</span><span>session scoped</span></div>
    {keeps}
  </div>
  <div class="tag mono">Next · contact</div>
  <div class="tag2 mono">Weights and alpha shown at their defaults</div>
</section>
</body></html>'''
open("page10.html","w").write(page)
print("built")
