import math, random, html
random.seed(5)
ramp=" .·:-=+o8O@"
def tone(ch): return ramp.index(ch)/(len(ramp)-1) if ch in ramp else 0
def col(t): return f"{int(146+94*t)},{int(68+70*t)},{int(78+68*t)}"
def paint(rows,a0,a1):
    out=[]
    for line in rows:
        s=""
        for ch in line:
            if ch==" ": s+=" "; continue
            t=tone(ch); a=a0+(a1-a0)*t
            s+=f'<i style="color:rgba({col(t)},{a:.2f})">{html.escape(ch)}</i>'
        out.append(s)
    return "\n".join(out)

# ---------- log-mel spectrogram ----------
import numpy as np
np.random.seed(5)
SC,SR=232,56
E=np.full((SR,SC),0.17)+np.random.rand(SR,SC)*0.08
f=np.linspace(1,0,SR)[:,None]            # 1 = low freq at bottom row index SR-1
freq=np.linspace(0,1,SR)[::-1][:,None]   # freq axis per row, 0 low .. 1 high
events=[]; t=0
while t<SC:
    k=np.random.rand()
    if k<0.30: dur=np.random.randint(14,34); kind="speech"
    elif k<0.42: dur=np.random.randint(3,7);  kind="cough"
    elif k<0.54: dur=np.random.randint(5,12); kind="nonverbal"
    else:        dur=np.random.randint(12,28); kind="other"
    events.append((t,min(SC,t+dur),kind)); t+=dur
for (a,b,kind) in events:
    w=b-a
    if w<=0: continue
    env=np.sin(np.linspace(0,np.pi,w))[None,:]**0.5
    if kind=="speech":
        prof=np.zeros((SR,1))
        for h in range(1,9):
            prof+=np.exp(-((freq-0.06*h)**2)/0.0009)/ (h**0.6)
        prof/=prof.max()
        E[:,a:b]+= prof*env*0.85
        E[:,a:b]+= np.exp(-((freq-0.20)**2)/0.05)*env*0.30
    elif kind=="cough":
        prof=np.exp(-((freq-0.34)**2)/0.10)+0.45
        E[:,a:b]+= prof*(env**2)*1.05
    elif kind=="nonverbal":
        prof=np.exp(-((freq-0.10)**2)/0.006)
        E[:,a:b]+= prof*env*0.48
    else:
        prof=np.exp(-((freq-0.05)**2)/0.012)+0.22*np.exp(-((freq-0.22)**2)/0.10)
        E[:,a:b]+= prof*env*0.34
k=np.array([0.15,0.25,0.30,0.20,0.10])
E=np.apply_along_axis(lambda m: np.convolve(m,k,mode="same"),1,E)
E=np.apply_along_axis(lambda m: np.convolve(m,np.array([0.25,0.5,0.25]),mode="same"),0,E)
E=E/np.percentile(E,99.3)
E=np.clip(E,0,1)**0.78
specrows=["".join(ramp[max(0,int(E[r,c]*(len(ramp)-1)))] if E[r,c]>0.05 else " "
          for c in range(SC)) for r in range(SR)]

# ---------- per-class report (real) ----------
CLS=[("speech",0.90,0.96,0.93,116416,"="),
     ("cough",0.76,0.82,0.79,45231,"8"),
     ("non-verbal",0.65,0.35,0.46,26331,"+"),
     ("other",0.96,0.96,0.96,484225,"·")]
BW=15
def minibar(v):
    w=int(round(v*BW)); return "8"*w+"·"*(BW-w)
rep=""
for name,p,r,f1,sup,g in CLS:
    weak=''
    rep+=(f'<div class="crow{weak}"><span class="cn mono">{name}</span>'
          f'<span class="cg mono">{g}</span>'
          f'<span class="cb"><pre class="sp">{paint([minibar(p)],0.16,0.86)}</pre><b class="cv mono">{p:.2f}</b></span>'
          f'<span class="cb"><pre class="sp">{paint([minibar(r)],0.16,0.86)}</pre><b class="cv mono">{r:.2f}</b></span>'
          f'<span class="cb"><pre class="sp">{paint([minibar(f1)],0.16,0.86)}</pre><b class="cv mono">{f1:.2f}</b></span>'
          f'<span class="cs mono">{sup:,}</span></div>')

# ---------- class balance (real supports) ----------
TOT=sum(c[4] for c in CLS)
SBW=118
segs=[]; used=0
for i,(name,p,r,f1,sup,g) in enumerate(CLS):
    w=SBW-used if i==len(CLS)-1 else max(1,round(sup/TOT*SBW))
    used+=w
    a=0.95 if name=="other" else 0.60
    c="120,86,92" if name=="other" else ("238,208,210" if name=="speech" else
        ("214,150,158" if name=="cough" else "232,96,96"))
    segs.append(f'<i style="color:rgba({c},{a})">{g*w}</i>')
bal="".join(segs)
balkey="".join(
  f'<span><b style="color:rgba({"120,86,92" if n=="other" else ("238,208,210" if n=="speech" else ("214,150,158" if n=="cough" else "232,96,96"))},.95)">{g}</b> {n} <em>{sup/TOT*100:.1f}%</em></span>'
  for (n,p,r,f1,sup,g) in CLS)

# ---------- macro vs weighted ----------
AGG=[("macro f1",0.78,True),("weighted f1",0.92,False),("accuracy",0.93,False)]
BW2=40
agg=""
for name,v,hi in AGG:
    w=int(round(v*BW2)); bar="8"*w+"·"*(BW2-w)
    cls=" hi" if hi else ""
    agg+=(f'<div class="arow{cls}"><span class="an mono">{name}</span>'
          f'<pre class="sp">{paint([bar],0.16,0.90)}</pre>'
          f'<span class="av mono">{v:.2f}</span></div>')

# ---------- frame timeline: true vs predicted ----------
TL=124
SEQ=[("·",14),("=",18),("·",8),("+",6),("·",6),("8",3),("·",10),("=",14),
     ("+",7),("·",9),("8",2),("·",7),("+",5),("·",8),("=",7)]
true=[]
for ch,n in SEQ: true+=[ch]*n
true=true[:TL]
pred=[]
for ch in true:
    if ch=="+": pred.append("+" if random.random()<0.35 else "·")      # recall 0.35
    elif ch=="8": pred.append("8" if random.random()<0.82 else "·")
    elif ch=="=": pred.append("=" if random.random()<0.96 else "·")
    else: pred.append("·" if random.random()<0.96 else "=")
GC={"=":("238,208,210",0.95),"8":("214,150,158",0.95),"+":("224,150,156",0.95),"·":("120,86,92",0.45)}
def tlrow(seq):
    return "".join(f'<i style="color:rgba({GC[c][0]},{GC[c][1]})">{c}</i>' for c in seq)
miss="".join(('<i style="color:rgba(232,96,96,.85)">^</i>' if t_!=p_ and t_=="+" else
              '<i style="color:rgba(120,86,92,.30)"> </i>') for t_,p_ in zip(true,pred))

page=f'''<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0b0708;--ink:#e6dfd8;--mute:#6f6366;--rose:#c46e78;--line:#1f1417;--warn:#e86060}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:var(--bg);color:var(--ink);font-family:Cormorant,serif;width:1440px}}
.mono{{font-family:"JetBrains Mono",monospace}}
.frame{{position:relative;height:900px;border-bottom:1px solid var(--line);overflow:hidden}}
.stamp{{position:absolute;top:22px;left:48px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#4a4042;z-index:9}}
nav{{position:absolute;top:22px;right:48px;display:flex;gap:38px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--mute);z-index:9}}
nav .on{{color:var(--rose)}}
pre.spec{{position:absolute;left:-4px;top:122px;font-family:"JetBrains Mono",monospace;font-size:10.2px;line-height:12.6px;white-space:pre;letter-spacing:.24px}}
pre.spec i{{font-style:normal}}
.veil{{position:absolute;inset:0;z-index:2;background:linear-gradient(104deg, rgba(11,7,8,.985) 0%, rgba(11,7,8,.94) 30%, rgba(11,7,8,.42) 50%, rgba(11,7,8,.06) 70%, rgba(11,7,8,.45) 100%)}}
.hero{{position:absolute;left:48px;top:250px;width:660px;z-index:4}}
.idx{{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--rose)}}
h2{{font-size:56px;font-weight:300;line-height:1.06;margin:22px 0 26px;letter-spacing:-.01em}}
h2 em{{font-style:italic}}
.hero p{{font-size:18px;font-weight:300;line-height:1.55;color:#a2958f;max-width:470px}}
.ncap{{position:absolute;right:48px;bottom:34px;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#6a5c5e;z-index:4;text-align:right;line-height:2.1}}
.faxis{{position:absolute;left:12px;top:300px;font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;color:#4a4042;transform:rotate(-90deg);transform-origin:left top;z-index:4}}
.left{{position:absolute;left:48px;top:104px;width:404px;z-index:4}}
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
.figs{{position:absolute;left:492px;top:104px;right:48px}}
.fhead{{font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#4a4042;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between}}
.fhead b{{color:#a2958f;font-weight:400}}
.chead{{display:flex;align-items:center;font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:#3f3638;margin-bottom:6px}}
.crow{{display:flex;align-items:center;height:24px}}

.cn{{width:78px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#a2958f;text-align:right}}
.cg{{width:22px;text-align:center;font-size:10px;color:#6f6366}}
.cb{{display:flex;align-items:center;gap:7px;width:150px}}
.cv{{font-size:8.5px;color:#8d817c;font-weight:400}}
.cs{{font-size:8.5px;color:#5b5052;width:78px;text-align:right}}
.sp{{font-family:"JetBrains Mono",monospace;font-size:10px;line-height:24px;white-space:pre}}
.sp i{{font-style:normal}}
.arow{{display:flex;align-items:center;gap:12px;height:24px}}
.an{{width:82px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8d817c;text-align:right}}
.av{{font-size:9px;color:#8d817c}}
.arow.hi .an,.arow.hi .av{{color:var(--rose)}}
.bal{{font-family:"JetBrains Mono",monospace;font-size:12px;line-height:26px;white-space:pre}}
.bal i{{font-style:normal}}
.balkey{{margin-top:9px;display:flex;gap:22px;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#6f6366}}
.balkey b{{font-weight:400}}
.balkey em{{font-style:normal;color:#a2958f}}
.tl{{font-family:"JetBrains Mono",monospace;font-size:10.5px;line-height:22px;white-space:pre}}
.tl i{{font-style:normal}}
.tlrow{{display:flex;align-items:center;gap:12px}}
.tlk{{width:66px;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#6f6366;text-align:right}}
.glegend{{margin-top:12px;display:flex;gap:20px;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#6f6366}}
.glegend b{{font-weight:400}}
.note{{margin-top:18px;border-left:1px solid rgba(196,110,120,.4);padding-left:16px;font-size:9px;letter-spacing:.1em;line-height:2;color:#8d817c;text-transform:none}}
.tag{{position:absolute;bottom:20px;left:48px;font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;color:#4a4042}}
.tag2{{position:absolute;bottom:20px;right:48px;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#3b3335}}
</style></head><body>

<section class="frame">
  <div class="stamp mono">Frame 11 · Page six on entry · log-mel spectrogram, what the model actually sees</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Method</span><span>Contact</span></nav>
  <pre class="spec">{paint(specrows,0.10,0.66)}</pre>
  <div class="veil"></div>
  <div class="faxis mono">mel frequency &rarr;</div>
  <div class="hero">
    <div class="idx mono">05 &nbsp;/&nbsp; 06 &nbsp;·&nbsp; NC State &nbsp;·&nbsp; Spring 2026</div>
    <h2>Trained on ten people.<br>Tested on three it had<br><em>never heard.</em></h2>
    <p>Four-class acoustic event classification from chest-microphone recordings. Subject-independent, which is the part of wearable audio that actually breaks.</p>
  </div>
  <div class="ncap mono">Fig. 05a &nbsp;·&nbsp; log-mel spectrogram<br>672,203 frames &nbsp;·&nbsp; 13 subjects</div>
</section>

<section class="frame">
  <div class="stamp mono">Frame 12 · Scrolled · the per-class report on held-out subjects</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Method</span><span>Contact</span></nav>
  <div class="left">
    <div class="idx mono">05 &nbsp;/&nbsp; 06 &nbsp;·&nbsp; NC State</div>
    <h3>Trained on ten people.<br>Tested on three it<br><em>had never heard.</em></h3>
    <div class="body">
      <p>A five-fold log-mel CNN ensembled with LightGBM over PANNs CNN14 embeddings, Viterbi decoding with per-class offset tuning, trained on ten subjects and tested on three the model had never heard.</p>
      <p class="hi">0.93 accuracy and 0.78 macro F1 on held-out subjects, with speech at 0.93 F1 and background at 0.96. Non-verbal is under four percent of frames and is the class that needs more data before its numbers mean much.</p>
    </div>
    <div class="nums">
      <div><div class="n">672K</div><div class="l mono">frames</div></div>
      <div><div class="n">0.78</div><div class="l mono">macro f1</div></div>
      <div><div class="n rose">0.93</div><div class="l mono">accuracy</div></div>
      <div><div class="n">Top 5</div><div class="l mono">in class</div></div>
    </div>
    <div class="stack mono"><span>PyTorch</span><span>PANNs CNN14</span><span>LightGBM</span><span>log-mel</span><span>Viterbi</span><span>5-fold</span></div>
  </div>
  <div class="figs">
    <div class="fhead mono"><span>Fig. 05b &nbsp;·&nbsp; <b>per-class report</b> &nbsp;/&nbsp; held-out subjects</span><span>n = 672,203 frames</span></div>
    <div class="chead"><span style="width:78px"></span><span style="width:22px"></span>
      <span style="width:150px">precision</span><span style="width:150px">recall</span><span style="width:150px">f1</span>
      <span style="width:78px;text-align:right">support</span></div>
    {rep}
    <div class="fhead mono" style="margin-top:44px"><span>Fig. 05c &nbsp;·&nbsp; <b>class balance</b> &nbsp;/&nbsp; frames per class</span><span>3.9% minority class</span></div>
    <pre class="bal">{bal}</pre>
    <div class="balkey mono">{balkey}</div>
    <div class="fhead mono" style="margin-top:44px"><span>Fig. 05d &nbsp;·&nbsp; <b>aggregate</b> &nbsp;/&nbsp; the same model, three ways</span><span>held-out subjects</span></div>
    {agg}
    <div class="fhead mono" style="margin-top:44px"><span>Fig. 05e &nbsp;·&nbsp; <b>frame timeline</b> &nbsp;/&nbsp; truth against prediction</span><span>illustrative window</span></div>
    <div class="tlrow"><span class="tlk mono">truth</span><pre class="tl">{tlrow(true)}</pre></div>
    <div class="tlrow"><span class="tlk mono">predicted</span><pre class="tl">{tlrow(pred)}</pre></div>
    <div class="note mono">Viterbi decoding with per-class offset tuning smooths frame-level predictions into contiguous events.</div>
    <div class="glegend mono">
      <span><b style="color:#eed0d2">=</b> speech</span><span><b style="color:#d6969e">8</b> cough</span>
      <span><b style="color:#e0969c">+</b> non-verbal</span><span><b style="color:#78565c">·</b> other</span>
      
    </div>
  </div>
  <div class="tag mono">Next · the method</div>
  <div class="tag2 mono">Glyph encodes class &nbsp;·&nbsp; brightness encodes nothing here</div>
</section>
</body></html>'''
open("page06.html","w").write(page)
print("built")
