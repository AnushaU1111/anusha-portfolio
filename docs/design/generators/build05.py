import json, math, random, html
random.seed(31)
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

# ---- noise wall ----
NC,NR=168,58
noise=[]
for r in range(NR):
    line=""
    for c in range(NC):
        env=(math.sin(math.pi*min(1,c/NC))**0.35)*(0.62+0.38*math.sin(r*0.37+c*0.09))
        v=max(0.0,min(1.0,random.random()*0.62+env*0.88-0.22))
        line+=ramp[int(v*(len(ramp)-1))] if v>0.04 else " "
    noise.append(line)

# ---- bar figures ----
BARW=46
def bars(items):
    h=""
    for name,frac in items:
        w=int(round(frac*BARW)); bar="8"*w+"·"*(BARW-w)
        h+=(f'<div class="srow"><span class="sl mono">{name}</span>'
            f'<pre class="sp">{paint([bar],0.16,0.88)}</pre>'
            f'<span class="sv mono">{frac*100:.0f}%</span></div>')
    return h
SENT=[("negative",0.41),("neutral",0.36),("positive",0.23)]
EMO=sorted([("neutral",0.28),("anger",0.19),("sadness",0.17),("fear",0.13),
            ("joy",0.11),("disgust",0.06),("surprise",0.06)],key=lambda x:-x[1])

# ---- topic clusters ----
CC,CR=130,34
clusters=[(30,10,10,0.95,"topic 04"),(70,7,8,0.72,"topic 11"),(96,17,9,0.82,"topic 02"),
          (44,22,12,1.00,"topic 07"),(84,28,7,0.58,"topic 19"),(16,27,7,0.50,"topic 23"),
          (60,15,5,0.42,None),(110,27,5,0.38,None),(14,16,5,0.34,None),(56,30,5,0.32,None),
          (114,9,5,0.30,None),(78,21,4,0.28,None),(24,32,4,0.26,None),(104,5,4,0.24,None)]
cv=[[0.0]*CC for _ in range(CR)]
for (cx,cy,rad,amp,_l) in clusters:
    for r in range(CR):
        for c in range(CC):
            d=math.hypot((c-cx)*0.6,(r-cy))/rad
            if d>1.4: continue
            v=amp*math.exp(-d*d*1.4)*(0.84+0.30*math.sin(c*0.9)*math.cos(r*1.1))
            if v>cv[r][c]: cv[r][c]=v
cg=["".join(ramp[max(1,int(min(cv[r][c],1.0)*(len(ramp)-1)))] if cv[r][c]>0.06 else " "
    for c in range(CC)) for r in range(CR)]

CFS=9.2; CCW=CFS*0.6; CLH=CFS*1.05
lab="".join(f'<span class="clab mono" style="left:{cx*CCW}px;top:{cy*CLH-6}px">{l}</span>'
            for (cx,cy,r,a,l) in clusters if l)
NFS=8.6; NLH=900/58

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
pre.noise{{position:absolute;left:-6px;top:0;font-family:"JetBrains Mono",monospace;font-size:{NFS}px;line-height:{NLH:.2f}px;white-space:pre;letter-spacing:.9px}}
pre.noise i{{font-style:normal}}
.veil{{position:absolute;inset:0;z-index:2;background:linear-gradient(100deg, rgba(11,7,8,.985) 0%, rgba(11,7,8,.95) 34%, rgba(11,7,8,.55) 52%, rgba(11,7,8,.10) 72%, rgba(11,7,8,.50) 100%)}}
.hero{{position:absolute;left:48px;top:250px;width:640px;z-index:4}}
.idx{{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--rose)}}
h2{{font-size:60px;font-weight:300;line-height:1.04;margin:22px 0 26px;letter-spacing:-.01em}}
h2 em{{font-style:italic}}
.hero p{{font-size:18px;font-weight:300;line-height:1.55;color:#a2958f;max-width:470px}}
.ncap{{position:absolute;right:48px;bottom:34px;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#6a5c5e;z-index:4;text-align:right;line-height:2.1}}
.left{{position:absolute;left:48px;top:104px;width:398px;z-index:4}}
.left h3{{font-size:38px;font-weight:300;line-height:1.08;margin:18px 0 20px}}
.left h3 em{{font-style:italic}}
.body p{{font-size:15px;font-weight:300;line-height:1.6;color:#a2958f;margin-bottom:12px}}
.body p.hi{{color:#ded5ce;border-left:1px solid var(--rose);padding-left:18px;margin-top:18px}}
.nums{{margin-top:26px;display:flex;gap:22px;border-top:1px solid var(--line);padding-top:18px}}
.nums .n{{font-size:27px;font-weight:300;line-height:1;white-space:nowrap}}
.nums .n.rose{{color:var(--rose)}}
.nums .l{{font-size:7.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-top:8px}}
.stack{{margin-top:22px;display:flex;flex-wrap:wrap;gap:5px}}
.stack span{{border:1px solid var(--line);padding:4px 8px;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#8d817c}}
.withheld{{margin-top:20px;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#4a4042;border-top:1px solid var(--line);padding-top:13px;line-height:1.9}}
.figs{{position:absolute;left:486px;top:104px;right:48px}}
.fhead{{font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#4a4042;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:13px;display:flex;justify-content:space-between}}
.fhead b{{color:#a2958f;font-weight:400}}
.srow{{display:flex;align-items:center;gap:11px;height:15px}}
.sl{{width:70px;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#8d817c;text-align:right}}
.sv{{font-size:8.5px;color:#6f6366;width:30px}}
.sp{{font-family:"JetBrains Mono",monospace;font-size:10px;line-height:15px;white-space:pre}}
.sp i{{font-style:normal}}
.cwrap{{position:relative;margin-top:3px}}
pre.clus{{font-family:"JetBrains Mono",monospace;font-size:{CFS}px;line-height:{CLH:.2f}px;white-space:pre}}
pre.clus i{{font-style:normal}}
.clab{{position:absolute;font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#f2e0e0;background:rgba(11,7,8,.55);padding:1px 4px;transform:translateX(-50%)}}
.tag{{position:absolute;bottom:20px;left:48px;font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;color:#4a4042}}
.tag2{{position:absolute;bottom:20px;right:48px;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#3b3335}}
</style></head><body>

<section class="frame">
  <div class="stamp mono">Frame 09 · Page five on entry · the corpus as it arrives</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Method</span><span>Contact</span></nav>
  <pre class="noise">{paint(noise,0.12,0.62)}</pre>
  <div class="veil"></div>
  <div class="hero">
    <div class="idx mono">04 &nbsp;/&nbsp; 06 &nbsp;·&nbsp; NC State &nbsp;·&nbsp; Research Assistant</div>
    <h2>1.1 million posts,<br>three model heads,<br><em>one pass.</em></h2>
    <p>Nobody had read this corpus and nobody was going to. My job was to build the thing that made it analysable.</p>
  </div>
  <div class="ncap mono">Fig. 04a &nbsp;·&nbsp; raw corpus<br>one glyph &asymp; 3,000 posts</div>
</section>

<section class="frame">
  <div class="stamp mono">Frame 10 · Scrolled · the corpus resolves into distributions and clusters</div>
  <nav class="mono"><span>About</span><span class="on">Work</span><span>Method</span><span>Contact</span></nav>
  <div class="left">
    <div class="idx mono">04 &nbsp;/&nbsp; 06 &nbsp;·&nbsp; NC State</div>
    <h3>1.1 million posts,<br>three model heads,<br><em>one pass.</em></h3>
    <div class="body">
      <p>A full preprocessing pipeline over 1.1 million social media posts, then three transformer heads in a single pass: a RoBERTa sentiment classifier, a DistilRoBERTa emotion classifier, and BERTopic for unsupervised topic recovery.</p>
      <p class="hi">The hard part was never the models. It was making 1.1 million rows survive cleaning, deduplication and language filtering without quietly dropping the population the study was about.</p>
    </div>
    <div class="nums">
      <div><div class="n">1.1M</div><div class="l mono">ingested</div></div>
      <div><div class="n">912K</div><div class="l mono">after filtering</div></div>
      <div><div class="n rose">3</div><div class="l mono">model heads</div></div>
      <div><div class="n">41</div><div class="l mono">topics</div></div>
    </div>
    <div class="stack mono"><span>Python</span><span>Pandas</span><span>RoBERTa</span><span>DistilRoBERTa</span><span>BERTopic</span><span>HDBSCAN</span></div>
    <div class="withheld mono">Topic labels and findings withheld<br>pending publication</div>
  </div>
  <div class="figs">
    <div class="fhead mono"><span>Fig. 04b &nbsp;·&nbsp; <b>sentiment</b> &nbsp;/&nbsp; cardiffnlp twitter-roberta</span><span>n = 912,441</span></div>
    {bars(SENT)}
    <div class="fhead mono" style="margin-top:28px"><span>Fig. 04c &nbsp;·&nbsp; <b>emotion</b> &nbsp;/&nbsp; distilroberta, seven classes</span><span>share of corpus</span></div>
    {bars(EMO)}
    <div class="fhead mono" style="margin-top:28px"><span>Fig. 04d &nbsp;·&nbsp; <b>topic clusters</b> &nbsp;/&nbsp; BERTopic over UMAP</span><span>41 topics &nbsp;·&nbsp; 14 shown &nbsp;·&nbsp; labels withheld</span></div>
    <div class="cwrap"><pre class="clus">{paint(cg,0.18,0.82)}</pre>{lab}</div>
  </div>
  <div class="tag mono">Next · the method</div>
  <div class="tag2 mono">Cluster area &asymp; share of corpus &nbsp;·&nbsp; position from UMAP, not meaning</div>
</section>
</body></html>'''
open("page05.html","w").write(page)
print("built")
