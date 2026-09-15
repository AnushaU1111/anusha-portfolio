import json
COLS, ROWS = 100, 40
CELL_AR = 0.60

P = {
 "S-01":(14,10), "S-02":(18,24), "S-03":(28,37),
 "R-01":(32, 6), "R-02":(30,16), "R-03":(38,22), "R-04":(40,32),
 "R-05":(54,30), "R-06":(14,32), "R-07":(56,23),
 "F-01":(50, 4), "F-02":(48,13), "F-03":(62,33), "F-04":(70,26), "F-05":(76,17),
 "T-01":(68, 3), "T-02":(66,10), "T-03":(86,29), "T-04":(92,14),
}
edges=[
 ("S-01","R-01","owns"),("S-01","R-02","owns"),
 ("S-02","R-03","owns"),("S-02","R-04","owns"),
 ("S-03","R-05","owns"),("S-03","R-06","owns"),("S-03","R-07","owns"),
 ("R-01","R-03","depends"),("R-02","R-04","depends"),("R-03","R-05","depends"),
 ("R-04","R-07","depends"),("R-05","R-07","depends"),("R-06","R-02","depends"),
 ("F-01","R-01","depends"),("F-02","R-02","depends"),("F-02","R-03","depends"),
 ("F-03","R-04","depends"),("F-04","R-05","depends"),("F-05","R-07","depends"),
 ("T-01","F-01","validates"),("T-02","F-02","validates"),("T-03","F-04","validates"),
 ("T-04","F-05","validates"),("T-02","R-03","validates"),
]
TYPE={k:k[0] for k in P}
BRA={"S":("(",")"),"R":("[","]"),"F":("<",">"),"T":("{","}")}
grid=[[" "]*COLS for _ in range(ROWS)]; val=[[0.0]*COLS for _ in range(ROWS)]
own={}
def put(c,r,ch,v,tag=None,over=False):
    if 0<=r<ROWS and 0<=c<COLS and (over or grid[r][c]==" "):
        grid[r][c]=ch; val[r][c]=v
        if tag: own[(r,c)]=tag
def dirchar(c0,r0,c1,r1):
    dc=(c1-c0)*CELL_AR; dr=r1-r0
    if abs(dc)<1e-9: return "|"
    s=dr/dc
    if abs(s)<0.42: return "-"
    if abs(s)>2.4:  return "|"
    return "\\" if (dr>0)==(dc>0) else "/"
EV={"owns":-11,"depends":-12,"validates":-13}
for (a,b,k) in edges:
    (c0,r0),(c1,r1)=P[a],P[b]
    ch=dirchar(c0,r0,c1,r1); v=EV[k]
    n=max(abs(c1-c0),abs(r1-r0))*4
    for s in range(1,n):
        t=s/n
        c=int(round(c0+(c1-c0)*t)); r=int(round(r0+(r1-r0)*t))
        if (r==r0 and abs(c-c0)<=3) or (r==r1 and abs(c-c1)<=3): continue
        tag=(a,b)
        if   k=="depends":   put(c,r,ch,v,tag)
        elif k=="validates": put(c,r,":",v,tag) if s%3==0 else None
        else:                put(c,r,"·",v,tag) if s%2==0 else None
for name,(c,r) in P.items():
    o,cl=BRA[TYPE[name]]; lab=o+name+cl
    v={"S":-2,"R":-3,"F":-4,"T":-5}[TYPE[name]]
    for j,ch in enumerate(lab): put(c-3+j,r,ch,v,(name,name),over=True)
adj={}
for a,b,k in edges:
    adj.setdefault(a,set()).add(b); adj.setdefault(b,set()).add(a)
json.dump({"grid":["".join(x) for x in grid],"val":val,"pos":P,"cols":COLS,"rows":ROWS,
           "own":{f"{r},{c}":list(t) for (r,c),t in own.items()},
           "adj":{k:sorted(v) for k,v in adj.items()}}, open("graph.json","w"))
print("ok")
