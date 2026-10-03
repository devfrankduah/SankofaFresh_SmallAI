"""Read GitHub state and verify planned issue metadata and dependency edges."""
import json
import subprocess
from prepare_backlog import ROOT, TASKS

query = '''{repository(owner:"GeorgeDavidson2",name:"SankofaFresh_SmallAI"){
isPrivate url issues(first:100){nodes{id number title state assignees(first:10){totalCount}
labels(first:20){nodes{name}} body blockedBy(first:100){nodes{id number}}}}}}'''
result = json.loads(subprocess.check_output(['gh','api','graphql','-f',f'query={query}'], text=True))
assert not result.get('errors'), result
repo = result['data']['repository']
assert repo['isPrivate']
published = json.loads((ROOT/'docs/planning/published.json').read_text())
actual = {i['number']:i for i in repo['issues']['nodes']}
edges = 0
for task in TASKS:
    issue = actual[published['issues'][task['key']]['number']]
    assert issue['title'] == task['title']
    assert issue['state'] == 'OPEN'
    assert issue['assignees']['totalCount'] == 0
    labels = {x['name'] for x in issue['labels']['nodes']}
    assert {f'priority:{task["priority"]}', f'role:{task["role"]}'} <= labels
    expected = {published['issues'][d]['id'] for d in task['deps']}
    assert {x['id'] for x in issue['blockedBy']['nodes']} == expected, task['key']
    for heading in ['## Context','## Ownership and priority','## Dependencies','## Scope','## Acceptance criteria','## Required evidence']:
        assert heading in issue['body'], (task['key'], heading)
    for d in task['deps']:
        assert published['issues'][d]['url'] in issue['body']
    edges += len(expected)
print(f'VERIFIED: private repository, {len(TASKS)} open issues, role/priority labels, required body sections and {edges} exact native blocker links.')
