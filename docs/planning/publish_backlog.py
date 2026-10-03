"""Publish the user-authorized issue backlog; checkpoints make retries resumable."""
import json
import subprocess
from pathlib import Path
from prepare_backlog import TASKS, ROOT, body

REPO = 'GeorgeDavidson2/SankofaFresh_SmallAI'
STATE = ROOT / 'docs/planning/published.json'

def gh(*args):
    return subprocess.check_output(['gh', *args], text=True).strip()

state = json.loads(STATE.read_text()) if STATE.exists() else {'issues': {}, 'edges': []}
def save():
    STATE.write_text(json.dumps(state, indent=2)+'\n')

colors = {'priority:P0':'B60205', 'priority:P1':'FBCA04', 'priority:P2':'D4C5F9'}
for name, color in colors.items():
    gh('label','create',name,'--repo',REPO,'--color',color,'--description',
       'Required release work' if name == 'priority:P0' else 'Optional work' if name == 'priority:P1' else 'Deferred work', '--force')

for task in TASKS:
    key = task['key']
    if key in state['issues']:
        continue
    path = ROOT / f'docs/planning/issues/{TASKS.index(task)+1:02d}-{key}.md'
    path.write_text(body(task, state['issues']))
    url = gh('issue','create','--repo',REPO,'--title',task['title'],'--body-file',str(path),
             '--label',f'priority:{task["priority"]}')
    number = int(url.rsplit('/',1)[1])
    info = json.loads(gh('issue','view',str(number),'--repo',REPO,'--json','id,number,url'))
    state['issues'][key] = info
    save()
    print(f'Created #{number}: {key}', flush=True)

query = 'mutation($issue:ID!,$blocker:ID!){addBlockedBy(input:{issueId:$issue,blockingIssueId:$blocker}){__typename}}'
for task in TASKS:
    for dep in task['deps']:
        edge = [task['key'], dep]
        if edge in state['edges']:
            continue
        result = json.loads(gh('api','graphql','-f',f'query={query}',
             '-f',f'issue={state["issues"][task["key"]]["id"]}',
             '-f',f'blocker={state["issues"][dep]["id"]}'))
        if result.get('errors'):
            raise RuntimeError(result['errors'])
        state['edges'].append(edge)
        save()
    print(f'Linked blockers: {task["key"]}', flush=True)

index = ['# Published issue index', '', 'Either teammate can pick any unblocked issue. Estimates are planning estimates only.', '',
         '| Issue | Priority | Blocked by |', '|---|---|---|']
for task in TASKS:
    info = state['issues'][task['key']]
    deps = ', '.join(f'[#{state["issues"][d]["number"]}]({state["issues"][d]["url"]})' for d in task['deps']) or 'None'
    index.append(f'| [#{info["number"]} {task["title"]}]({info["url"]}) | {task["priority"]} | {deps} |')
(ROOT/'docs/planning/ISSUE_INDEX.md').write_text('\n'.join(index)+'\n')
print(f'Published {len(state["issues"])} issues and {len(state["edges"])} dependency links.', flush=True)
