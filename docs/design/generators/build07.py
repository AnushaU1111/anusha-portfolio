import random, html
random.seed(12)
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

# ---------- contact sheet: one glyph per image ----------
COLS,ROWS=172,59
TOTAL=10015; MAL=1954
cells=["M"]*MAL+["B"]*(TOTAL-MAL)
random.shuffle(cells)
sheet=""
i=0
for r in range(ROWS):
    line=""
    for c in range(COLS):
        if i>=TOTAL: line+=" "; i+=1; continue
        k=cells[i]; i+=1
        if k=="M":
            g=random.choice("8O8o"); line+=f'<i style="color:rgba(232,150,158,{random.uniform(.62,.95):.2f})">{g}</i>'
        else:
            g=random.choice("·:·.-"); line+=f'<i style="color:rgba(126,92,98,{random.uniform(.22,.44):.2f})">{g}</i>'
    sheet+=line+"\n"

# ---------- AUC progression ----------
AUC=[("logistic regression",0.756,False),("efficientnet-b3",0.931,False),
     ("efficientnet-b5",0.933,False),("b5 + multiclass pretrain",0.936,False),
     ("eva02 vit",0.962,False),("weighted ensemble",0.964,True)]
LO,HI,AW=0.70,0.98,72
auc=""
for name,v,star in AUC:
    w=max(1,int(round((v-LO)/(HI-LO)*AW)))
    bar="8"*w+"·"*(AW-w)
    cls=" hi" if star else ""
    auc+=(f'<div class="arow{cls}"><span class="an mono">{name}</span>'
          f'<pre class="sp">{paint([bar],0.16,0.90)}</pre>'
          f'<span class="av mono">{v:.3f}</span></div>')

# ---------- confusion matrix ----------
def pad(t,w,right=True): return t.rjust(w) if right else t.ljust(w)
L1=pad("",12,False)+pad("pred. benign",18)+pad("pred. malignant",20)+pad("",16)
L2=pad("benign",12,False)+pad("1,025",18)+pad("185",20)+pad("1,210 actual",16)
L3a=pad("malignant",12,False)
L3b=pad("18",18); L3c=pad("275",20)+pad("293 actual",16)
cm=(f'<pre class="cmpre">'
    f'<span class="h">{html.escape(L1)}</span>\n'
    f'{html.escape(L2)}\n'
    f'{html.escape(L3a)}<span class="cmhit">{html.escape(L3b)}</span>{html.escape(L3c)}'
    f'</pre>')

# ---------- baseline comparison ----------
BASE=[("roc-auc","0.756","0.964","+0.208",True),
      ("recall","89.1%","93.9%","+4.8",True),
      ("precision","61.1%","60.0%","&minus;1.1",False),
      ("f1","72.5%","73.0%","+0.5",True),
      ("accuracy","70.3%","86.5%","+16.2",True)]
base=""
for name,a,b,d,up in BASE:
    base+=(f'<div class="brow"><span class="bn mono">{name}</span>'
           f'<span class="bv1 mono">{a}</span><span class="barrow mono">&rarr;</span>'
           f'<span class="bv2 mono">{b}</span>'
           f'<span class="bd mono{" up" if up else " down"}">{d}</span></div>')

# ---------- threshold choice ----------
TH=[("0.40 &nbsp;chosen","recall <b>0.94</b>","f1 <b>0.73</b>","clinical screening",True),
    ("0.50 &nbsp;best f1","recall <b>lower</b>","f1 <b>0.81</b>","trades off recall",False)]
th=""
for t,a,b,c,sel in TH:
    th+=(f'<div class="throw{" sel" if sel else ""}"><span class="tht mono">{t}</span>'
         f'<span class="thm mono">{a}</span><span class="thm mono">{b}</span>'
         f'<span class="thn mono">{c}</span></div>')

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
pre.sheet{{position:absolute;left:-2px;top:96px;font-family:"JetBrains Mono",monospace;font-size:9.4px;line-height:12.2px;white-space:pre;letter-spacing:.42px}}
pre.sheet i{{font-style:normal}}
.veil{{position:absolute;inset:0;z-index:2;background:linear-gradient(102deg, rgba(11,7,8,.99) 0%, rgba(11,7,8,.96) 32%, rgba(11,7,8,.52) 51%, rgba(11,7,8,.08) 72%, rgba(11,7,8,.46) 100%)}}
.hero{{position:absolute;left:48px;top:262px;width:660px;z-index:4}}
.idx{{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--rose)}}
h2{{font-size:57px;font-weight:300;line-height:1.05;margin:22px 0 26px;letter-spacing:-.01em}}
h2 em{{font-style:italic}}
.hero p{{font-size:18px;font-weight:300;line-height:1.55;color:#a2958f;max-width:480px}}
.ncap{{position:absolute;right:48px;bottom:34px;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#6a5c5e;z-index:4;text-align:right;line-height:2.1}}
.ncap b{{color:#e8969e;font-weight:400}}
.left{{position:absolute;left:48px;top:104px;width:400px;z-index:4}}
.left h3{{font-size:36px;font-weight:300;line-height:1.1;margin:18px 0 20px}}
.left h3 em{{font-style:italic;color:var(--rose)}}
.body p{{font-size:15px;font-weight:300;line-height:1.6;color:#a2958f;margin-bottom:12px}}
.body p.hi{{color:#ded5ce;border-left:1px solid var(--rose);padding-left:18px;margin-top:18px}}
.nums{{margin-top:26px;display:flex;gap:20px;border-top:1px solid var(--line);padding-top:18px}}
.nums .n{{font-size:26px;font-weight:300;line-height:1;white-space:nowrap}}
.nums .n.rose{{color:var(--rose)}}
.nums .l{{font-size:7.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-top:8px}}
.stack{{margin-top:22px;display:flex;flex-wrap:wrap;gap:5px}}
.stack span{{border:1px solid var(--line);padding:4px 8px;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#8d817c}}
.credit{{margin-top:18px;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#4a4042;line-height:1.9}}
.figs{{position:absolute;left:488px;top:104px;right:48px}}
.fhead{{font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#4a4042;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:13px;display:flex;justify-content:space-between}}
.fhead b{{color:#a2958f;font-weight:400}}
.arow{{display:flex;align-items:center;gap:12px;height:23px}}
.an{{width:172px;font-size:8.5px;letter-spacing:.13em;text-transform:uppercase;color:#8d817c;text-align:right}}
.av{{font-size:9px;color:#8d817c}}
.arow.hi .an,.arow.hi .av{{color:var(--rose)}}
.sp{{font-family:"JetBrains Mono",monospace;font-size:10px;line-height:23px;white-space:pre}}
.sp i{{font-style:normal}}
.cmpre{{font-family:"JetBrains Mono",monospace;font-size:13px;line-height:34px;white-space:pre;color:#9a8e8a;margin-top:4px}}
.cmpre .h{{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#3f3638}}
.cmpre .cmhit{{color:var(--rose)}}
.throw{{display:flex;align-items:center;height:26px;font-size:9px;letter-spacing:.12em;color:#6f6366}}
.throw .tht{{width:132px;text-transform:uppercase;letter-spacing:.18em}}
.throw .thm{{width:118px}}
.throw .thm b,.throw .tht b{{color:#c8bcb6;font-weight:400}}
.throw .thn{{color:#4a4042;text-transform:uppercase;letter-spacing:.16em;font-size:8px}}
.throw.sel{{color:#ded5ce}}
.throw.sel .tht{{color:var(--rose)}}
.throw.sel .thm b{{color:#f6dde0}}
.brow{{display:flex;align-items:center;height:22px;font-size:9px;letter-spacing:.1em}}
.bn{{width:100px;text-transform:uppercase;letter-spacing:.16em;color:#8d817c;font-size:8.5px;text-align:right;padding-right:18px}}
.bv1{{width:70px;color:#5b5052}}
.barrow{{width:26px;color:#3f3638}}
.bv2{{width:70px;color:#ded5ce}}
.bd{{font-size:8.5px;letter-spacing:.14em}}
.bd.up{{color:#c46e78}}
.bd.down{{color:#5b5052}}
.note{{margin-top:20px;border-left:1px solid rgba(196,110,120,.4);padding-left:16px;font-size:9px;letter-spacing:.1em;line-height:2;color:#8d817c}}
.tag{{position:absolute;bottom:20px;left:48px;font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;color:#4a4042}}
.tag2{{position:absolute;bottom:20px;right:48px;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#3b3335}}
</style></head><body>

<section class="frame">
  <div class="stamp mono">Frame 13 · Page seven on entry · one glyph per image in the dataset</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Method</span><span>Contact</span></nav>
  <pre class="sheet">{sheet}</pre>
  <div class="veil"></div>
  <div class="hero">
    <div class="idx mono">06 &nbsp;/&nbsp; 06 &nbsp;·&nbsp; NC State &nbsp;·&nbsp; CSC 542 &nbsp;·&nbsp; Spring 2026</div>
    <h2>Missing a cancer costs<br>more than a <em>false alarm.</em></h2>
    <p>Binary screening over 10,015 dermatoscopic images. Where we set the threshold was a clinical decision, not an optimisation.</p>
  </div>
  <div class="ncap mono">Fig. 06a &nbsp;·&nbsp; HAM10000<br>one glyph = one image &nbsp;·&nbsp; <b>1,954 malignant</b> of 10,015</div>
</section>

<section class="frame">
  <div class="stamp mono">Frame 14 · Scrolled · what each stage bought, and what the threshold cost</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Method</span><span>Contact</span></nav>
  <div class="left">
    <div class="idx mono">06 &nbsp;/&nbsp; 06 &nbsp;·&nbsp; NC State</div>
    <h3>Missing a cancer costs<br>more than a <em>false alarm.</em></h3>
    <div class="body">
      <p>Four models over HAM10000: EfficientNet-B3, B5, a multiclass-pretrained B5 and an EVA02 vision transformer, combined by five-pass test-time augmentation and weighted by validation AUC. Focal loss, MixUp and CutMix, and a weighted sampler to handle the 4:1 imbalance.</p>
      <p class="hi">We set the operating threshold at 0.40 rather than the 0.50 that maximises F1. That trade costs precision and buys recall, and it caught 275 of 293 malignant cases in the held-out test set.</p>
    </div>
    <div class="nums">
      <div><div class="n rose">0.964</div><div class="l mono">roc-auc</div></div>
      <div><div class="n">93.9%</div><div class="l mono">recall</div></div>
      <div><div class="n">18</div><div class="l mono">missed of 293</div></div>
      <div><div class="n">10,015</div><div class="l mono">images</div></div>
    </div>
    <div class="stack mono"><span>PyTorch</span><span>EfficientNet</span><span>EVA02 ViT</span><span>Focal loss</span><span>MixUp / CutMix</span><span>TTA</span></div>
    <div class="credit mono">Team of three &nbsp;·&nbsp; NC State AI Student Symposium 2026</div>
  </div>
  <div class="figs">
    <div class="fhead mono"><span>Fig. 06b &nbsp;·&nbsp; <b>what each stage bought</b> &nbsp;/&nbsp; validation ROC-AUC</span><span>scale 0.70 &rarr; 0.98</span></div>
    {auc}
    <div class="fhead mono" style="margin-top:38px"><span>Fig. 06c &nbsp;·&nbsp; <b>confusion matrix</b> &nbsp;/&nbsp; ensemble at threshold 0.40</span><span>n = 1,503 test images</span></div>
    {cm}
    <div class="fhead mono" style="margin-top:38px"><span>Fig. 06d &nbsp;·&nbsp; <b>the threshold</b> &nbsp;/&nbsp; two options, one chosen</span><span>screening beats scoring</span></div>
    {th}
    <div class="note mono">Eighteen malignant cases missed out of 293. The 0.50 threshold would have scored better and caught fewer.</div>
    <div class="fhead mono" style="margin-top:34px"><span>Fig. 06e &nbsp;·&nbsp; <b>against a classical baseline</b> &nbsp;/&nbsp; logistic regression</span><span>same test set</span></div>
    {base}
  </div>
  <div class="tag mono">Next · the method</div>
  <div class="tag2 mono">Glyph density encodes count &nbsp;·&nbsp; HAM10000, Tschandl et al. 2018</div>
</section>
</body></html>'''
open("page07.html","w").write(page)
print("built")
