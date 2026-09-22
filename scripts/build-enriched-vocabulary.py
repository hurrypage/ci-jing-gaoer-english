"""Build a traceable semantic enrichment layer for the curriculum vocabulary scope.
Wiktionary data is queried in batches and kept only as concise parsed senses with
source revision and attribution metadata. It is not treated as an exam source.
"""
import json,re,time,urllib.request,urllib.parse
from pathlib import Path

root=Path(__file__).resolve().parents[1]
cache_dir=root.parent/'work'/'wiktionary-vocabulary-cache'
cache_dir.mkdir(parents=True,exist_ok=True)
base=json.loads((root/'dist/data/course-vocab-index-2025.json').read_text(encoding='utf-8'))['records']
local=json.loads(Path(r'E:\DEL\豆包--英语高考数据\10_上海高考英语词汇库_v2.json').read_text(encoding='utf-8'))['words']
priority=json.loads((root/'dist/data/vocabulary-catalog-v1.json').read_text(encoding='utf-8'))['records']
priority_by_id={r['id']:r for r in priority}

def norm(s): return re.sub(r'[^a-z ]','',str(s).lower()).strip()
def query_title(raw):
    s=str(raw).strip()
    s=re.sub(r'\s*\([^)]*\)','',s)
    s=s.split('/')[0].split('=')[0].strip()
    # Entries such as "a/an" and "ad (=advertisement)" should query the headword.
    return s or raw

local_by_norm={}
for entry in local:
    key=norm(entry.get('word',''))
    if key and key not in local_by_norm: local_by_norm[key]=entry

def local_for(raw):
    key=norm(raw)
    if key in local_by_norm:return local_by_norm[key]
    key=norm(query_title(raw))
    return local_by_norm.get(key)

# Lightweight extraction from an English Wiktionary entry. The raw page is never
# distributed; each definition keeps source page and revision for audit.
def plain(text):
    text=re.sub(r'<!--.*?-->','',text,flags=re.S)
    text=re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>','',text,flags=re.S)
    text=re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]',r'\2',text)
    text=re.sub(r'\[\[([^\]]+)\]\]',r'\1',text)
    # Keep human-readable arguments of common templates; unknown templates are removed.
    text=re.sub(r'\{\{(?:l|m|mention|gloss|q|qualifier|lb|label|sense|uxi?)\|[^{}]*?\|([^|{}]+?)(?:\|[^{}]*)?\}\}',r'\1',text)
    text=re.sub(r'\{\{(?:non-gloss definition|w|wikipedia)\|([^{}|]+)(?:\|[^{}]*)?\}\}',r'\1',text)
    text=re.sub(r'\{\{[^{}]*\}\}','',text)
    text=re.sub(r"'{2,3}",'',text)
    text=re.sub(r'\s+',' ',text).strip(' ;,')
    return text

def parse_entry(wikitext):
    match=re.search(r'^==English==\s*$(.*?)(?=^==[^=].*?==\s*$|\Z)',wikitext,re.M|re.S)
    if not match:return [],[]
    section=match.group(1)
    phonetics=[]
    for m in re.finditer(r'\{\{IPA\|en\|([^|}]+)',section,re.I):
        value=plain(m.group(1))
        if value and value not in phonetics:phonetics.append(value)
    pos_names={'Noun','Verb','Adjective','Adverb','Pronoun','Determiner','Preposition','Conjunction','Interjection','Article','Proper noun','Numeral','Participle','Phrase','Abbreviation'}
    # Wiktionary nests parts of speech inside Etymology sections (====Verb====),
    # while simpler pages use ===Verb===.  Retain the heading depth so a POS
    # block ends at its next peer or parent heading, not at an inner example.
    headings=[]
    for h in re.finditer(r'^(={3,})\s*(.*?)\s*\1\s*$',section,re.M):
        headings.append({'start':h.start(),'end':h.end(),'level':len(h.group(1)),'title':h.group(2).strip()})
    groups=[]
    for i,h in enumerate(headings):
        pos=h['title']
        if pos not in pos_names:continue
        end=len(section)
        for later in headings[i+1:]:
            if later['level']<=h['level']:
                end=later['start']
                break
        block=section[h['end']:end]
        defs=[]
        for line in block.splitlines():
            if not line.startswith('#') or line.startswith('#:') or line.startswith('#*') or line.startswith('##'):continue
            val=plain(line.lstrip('# ').strip())
            if val and len(val)>1 and val not in defs:defs.append(val)
            if len(defs)>=4:break
        if defs:groups.append({'part_of_speech':pos.lower(),'definitions_en':defs})
    return phonetics[:2],groups

all_titles=sorted({query_title(r['headword_raw']) for r in base if query_title(r['headword_raw'])})
cache_file=cache_dir/'pages-v1.json'
try: cached=json.loads(cache_file.read_text(encoding='utf-8'))
except: cached={}
missing=[t for t in all_titles if t not in cached]
print(json.dumps({'titles':len(all_titles),'cached':len(cached),'to_fetch':len(missing)},ensure_ascii=False),flush=True)
for begin in range(0,len(missing),50):
    chunk=missing[begin:begin+50]
    params={'action':'query','prop':'revisions','rvprop':'ids|content','rvslots':'main','format':'json','formatversion':'2','titles':'|'.join(chunk)}
    url='https://en.wiktionary.org/w/api.php?'+urllib.parse.urlencode(params)
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'CiJingVocabularyResearch/1.0 (educational offline learning catalog)'})
            payload=json.load(urllib.request.urlopen(req,timeout=45));last=None;break
        except Exception as e:
            last=e;time.sleep(1.5*(attempt+1))
    if last:
        print(f'warning batch {begin//50+1}: {last}',flush=True);continue
    seen=set()
    for page in payload.get('query',{}).get('pages',[]):
        title=page.get('title','');seen.add(title)
        revision=(page.get('revisions') or [{}])[0]
        content=(revision.get('slots',{}).get('main',{}).get('content') or '')
        cached[title]={'revision_id':revision.get('revid'),'wikitext':content}
    # Map query aliases and missing pages so the task remains resumable and deterministic.
    for title in chunk:
        if title not in cached:
            cached[title]={'revision_id':None,'wikitext':''}
    cache_file.write_text(json.dumps(cached,ensure_ascii=False),encoding='utf-8')
    if begin%250==0:print(f'fetched {min(begin+50,len(missing))}/{len(missing)}',flush=True)
    time.sleep(.2)

records=[]
for item in base:
    word=item['headword_raw'];title=query_title(word);page=cached.get(title,{})
    phonetics,senses=parse_entry(page.get('wikitext',''))
    local_item=local_for(word) or {}
    old=priority_by_id.get(item['entry_id'],{})
    zh=local_item.get('cn','').strip()
    pos=local_item.get('pos','').strip()
    variant=local_item.get('variant','').strip()
    state='candidate_enriched' if senses else 'scope_only'
    records.append({
      'id':item['entry_id'],'headword':word,'lookup_headword':title,
      'scope':{'source':'国家课程标准词汇底表（2025修订）','level':'A','marker':item.get('curriculum_marker','none')},
      'lexical_form':{'part_of_speech_candidate':pos or None,'variant_candidate':variant or None,'ipa_en_candidate':phonetics},
      'senses_en_candidate':senses,
      'gloss_zh_candidate':zh or None,
      'gloss_source':local_item.get('source') or None,
      'priority':{'band':old.get('priority_band','baseline'),'candidate_exam_frequency':old.get('candidate_exam_frequency'),'source_boundary':old.get('priority_source')},
      'wiktionary':{'page':title,'revision_id':page.get('revision_id'),'url':'https://en.wiktionary.org/wiki/'+urllib.parse.quote(title.replace(' ','_')),'license':'CC BY-SA 4.0','status':'parsed_candidate' if senses else 'not_found_or_unparsed'},
      'learning_status':state,
      'editorial_fields':{'selected_senses':[],'collocations':[],'examples':[],'confusions':[],'review_status':'not_ready'},
      'content_boundary':'课标范围用于确定词表；中文释义、词性与变体来自本地 C 级候选资料；英文义项来自 Wiktionary 开放资料的机器解析候选，均须审核后才进入学生精学卡。'
    })
meta={'title':'词境全量词汇内容库 v1','record_count':len(records),'with_english_senses':sum(bool(r['senses_en_candidate']) for r in records),'with_chinese_gloss_candidate':sum(bool(r['gloss_zh_candidate']) for r in records),'with_pos_candidate':sum(bool(r['lexical_form']['part_of_speech_candidate']) for r in records),'source_attribution':'English definitions parsed from English Wiktionary, CC BY-SA 4.0; every record stores page URL and revision ID. Raw wikitext is retained only in the local build cache, not distributed.','scope_boundary':'国家课程标准范围并不等于上海官方词频或上海真题词表。','release_boundary':'本文件是全量内容候选库；任何词条在 selected_senses、collocations、examples 完成审核前，不能进入学生精学卡。','generated_at':'2026-09-22'}
out={'metadata':meta,'records':records}
(root/'dist/data/vocabulary-content-candidate-v1.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps(meta,ensure_ascii=False),flush=True)
