import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Path(r'E:\DEL\豆包--英语高考数据\10_上海高考英语词汇库_v2.json')
words=json.loads(source.read_text(encoding='utf-8'))['words']
# Every entry below is an editor-authored learning card. It is deliberately separate
# from the word card and has its own recall prompt and review state.
ready=[
 ('provide sb with sth','向某人提供某物','The school provides every student with a study guide.','with'),
 ('support a conclusion','支持一个结论','The data do not support the conclusion.','conclusion'),
 ('be based on','以……为基础','The decision is based on clear evidence.','based'),
 ('have an effect on','对……有影响','Sleep has an effect on concentration.','on'),
 ('compare A with B','把 A 与 B 比较','The study compared users with non-users.','with'),
 ('draw a conclusion','得出结论','It is too early to draw a conclusion.','conclusion'),
 ('a decline in','在……方面的下降','There was a decline in library visits.','in'),
 ('be available to','可供……使用','The report is available to all students.','available'),
 ('make a claim','提出主张','The article makes a strong claim.','claim'),
 ('be likely to','可能会……','The change is likely to affect habits.','likely'),
 ('respond to','回应……','Students responded to the survey.','to'),
 ('a range of','一系列……','The library offers a range of books.','range'),
 ('indicate that','表明……','The figures indicate that visits increased.','that'),
 ('a factor in','……的一个因素','Practice is one factor in progress.','factor'),
 ('vary from A to B','因 A 与 B 而不同','Results vary from student to student.','from'),
 ('benefit from','从……中受益','Students benefit from clear feedback.','from'),
 ('reliable information','可靠信息','Use reliable information when judging.','reliable'),
 ('be relevant to','与……相关','The detail is relevant to the question.','to'),
 ('contribute to','有助于；促成','Practice contributes to progress.','to'),
 ('identify the reason','找出原因','Identify the reason for the change.','reason'),
]
records=[]
for n,(phrase,meaning,example,answer) in enumerate(ready,1):
 records.append({'id':f'COL-COURSE-{n:03d}','phrase':phrase,'meaning':meaning,'example':example,'recall_answer':answer,'status':'ready_editor','priority_band':'course_first','source':'第 1 周编辑搭配学习卡','source_level':'editor','content_boundary':'编辑学习内容，非上海高考正式真题。'})
ready_lower={r['phrase'].lower() for r in records}
for entry in words:
 if entry.get('tier')!='扩展层·短语': continue
 phrase=entry.get('word','').strip()
 if not phrase or phrase.lower() in ready_lower: continue
 records.append({'id':f"COL-C-{len(records)+1:03d}",'phrase':phrase,'meaning':entry.get('cn',''),'example':None,'recall_answer':None,'status':'not_yet_enriched','priority_band':'candidate_c','source':entry.get('source','xiaoce(C级)'),'source_level':'C','content_boundary':'候选短语来源；尚未配齐语境、答案和审核，不进入精学卡。'})
out={'metadata':{'title':'词境固定搭配目录 v1','record_count':len(records),'ready_editor_count':sum(r['status']=='ready_editor' for r in records),'candidate_count':sum(r['status']!='ready_editor' for r in records),'source_boundary':'候选短语来自本地词汇库扩展层，来源为 C 级；只可作待审核候选，不能称为上海高考正式搭配或真题。','scheduler_contract':'只有 ready_editor 搭配可进入每日独立学习和复习；候选条目仅进入待制卡队列。','generated_at':'2026-09-22'},'records':records}
(root/'dist/data/collocation-catalog-v1.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps(out['metadata'],ensure_ascii=False))
