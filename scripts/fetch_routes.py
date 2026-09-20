"""Fetch city-to-city road geometry once; do not query OSRM for each visitor."""
import json,time
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/trips.json').read_text(encoding='utf-8'))
out=ROOT/'data/routes.json'
cache=json.loads(out.read_text(encoding='utf-8')) if out.exists() else {'source':'OSRM / OpenStreetMap','note':'WGS84 city-area anchors; routing is illustrative, not live traffic or verified scenic-area access.','segments':{}}
pairs=set()
for trip in data['trips']:
 for days in trip['variants'].values():
  for day in days:
   pairs.update(zip(day['path'],day['path'][1:]))
for a,b in sorted(pairs):
 key=f'{a}--{b}'
 if key in cache['segments']: continue
 p,q=data['anchors'][a],data['anchors'][b]
 url=f'https://router.project-osrm.org/route/v1/driving/{p[2]},{p[1]};{q[2]},{q[1]}?overview=full&geometries=geojson&steps=false'
 try:
  req=Request(url,headers={'User-Agent':'NationalDayRoadbook/1.0 (one-time route geometry build)'})
  with urlopen(req,timeout=20) as r: result=json.load(r)
  route=result['routes'][0]
  cache['segments'][key]={'geometry':route['geometry'],'distance_m':round(route['distance']),'duration_s':round(route['duration'])}
  print(f'{key}: {route["distance"]/1000:.1f} km',flush=True)
 except Exception as ex: print(f'{key}: unavailable ({type(ex).__name__}); map will use labelled dashed direction line',flush=True)
 out.write_text(json.dumps(cache,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 time.sleep(.8)
print(f'{len(cache["segments"])} / {len(pairs)} segments cached')
