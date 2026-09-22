import csv,json,re
from pathlib import Path

root=Path(__file__).resolve().parents[1]
baseline=json.loads((root/'dist/data/course-vocab-index-2025.json').read_text(encoding='utf-8'))
priority_path=Path(r'E:\DEL\豆包--英语高考数据\16_闪卡数据\01_S类词汇表.csv')
priority_rows=list(csv.DictReader(priority_path.open(encoding='utf-8-sig')))

# These are the only words whose current learning-card content is ready to display.
# The content remains editor-created learning material, not a Shanghai official question.
course_words={
  'provide','reflect','evidence','support','affect','acquire',
  'compare','conclusion','measure','decline','available','approach',
  'claim','demonstrate','respond','maintain','likely','range',
  'indicate','factor','specific','vary','assume','benefit',
  'reliable','require','issue','relevant','contribute','identify'
}

def normalize(value):
    return re.sub(r'[^a-z ]','',value.lower().replace('(to)','').strip()).strip()

priority={}
for row in priority_rows:
    key=normalize(row.get('word',''))
    if key and key not in priority:
        priority[key]={
            'priority_band':'S_candidate',
            'candidate_exam_frequency':int(row.get('真题总频次') or 0),
            'candidate_source_file_count':int(row.get('出现文件数') or 0),
            'priority_source':'本地候选语料统计；C 级候选材料，仅用于排序，不作上海正式题频结论'
        }

records=[]
for r in baseline['records']:
    headword=r['headword_raw']
    normalized=normalize(headword)
    course_ready=normalized in course_words
    item={
        'id':r['entry_id'],
        'headword':headword,
        'curriculum_marker':r.get('curriculum_marker','none'),
        'scope_source':'国家课程标准词汇底表（2025修订）',
        'scope_level':'A',
        'shanghai_exam_verified':False,
        'definition_status':'editor_ready' if course_ready else 'scope_only',
        'card_status':'ready_editor' if course_ready else 'not_yet_enriched',
        'priority_band':'course_first' if course_ready else 'baseline',
        'learning_content_source':'第 1 周编辑学习卡（词义、搭配、例句已提供）' if course_ready else None,
        'content_boundary':'编辑学习内容，非上海高考正式真题。' if course_ready else None
    }
    match=priority.get(normalized)
    if match and not course_ready:
        item.update(match)
    elif match:
        item['candidate_exam_frequency']=match['candidate_exam_frequency']
        item['candidate_source_file_count']=match['candidate_source_file_count']
        item['priority_source']=match['priority_source']
    records.append(item)

records.sort(key=lambda r:(0 if r['priority_band']=='course_first' else 1 if r['priority_band']=='S_candidate' else 2,-r.get('candidate_exam_frequency',0),r['headword'].lower()))
out={
  'metadata':{
    'title':'词境词汇目录 v1',
    'record_count':len(records),
    'priority_candidate_count':sum('candidate_exam_frequency' in r for r in records),
    'ready_editor_card_count':sum(r['card_status']=='ready_editor' for r in records),
    'scope_source':'国家课程标准词汇底表（2025修订）',
    'scope_level':'A',
    'priority_source_boundary':'S 候选排序来自本地 C 级候选语料统计，未完成上海卷题文逐条核验；不得作为上海官方词频、正式真题或正式词表。',
    'scheduler_contract':'排程器只将 card_status=ready_editor 的词条直接投放精学卡；scope_only 词条只进入全年覆盖诊断和待制卡队列，不能伪装成完整词卡。',
    'generated_at':'2026-09-22'
  },
  'records':records
}
(root/'dist/data/vocabulary-catalog-v1.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'records':len(records),'priority':out['metadata']['priority_candidate_count'],'ready':out['metadata']['ready_editor_card_count']},ensure_ascii=False))

