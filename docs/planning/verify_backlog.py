"""Read GitHub state and verify the Spec v2 backlog: open issues, closures and blocker edges."""
import json
import re
import subprocess
from prepare_backlog import CLOSED_NOT_PLANNED, ROOT, TASKS, body, closed_tasks, open_tasks, validate_tasks

validate_tasks()
UNTICK = re.compile(r'^- \[[xX]\]', re.MULTILINE)
query = '''{repository(owner:"GeorgeDavidson2",name:"SankofaFresh_SmallAI"){
isPrivate url issues(first:100){totalCount nodes{id number title state stateReason assignees(first:10){totalCount}
labels(first:20){nodes{name}} body blockedBy(first:100){nodes{id number}}}}}}'''
result = json.loads(subprocess.check_output(['gh','api','graphql','-f',f'query={query}'], text=True))
assert not result.get('errors'), result
repo = result['data']['repository']
assert repo['issues']['totalCount'] <= len(repo['issues']['nodes']), 'more than 100 issues; add pagination'
published = json.loads((ROOT/'docs/planning/published.json').read_text())
actual = {i['number']:i for i in repo['issues']['nodes']}
edges = 0
for task in TASKS:
    assert task['key'] in published['issues'], (task['key'], 'not recorded in published.json')
    info = published['issues'][task['key']]
    assert task['number'] is None or info['number'] == task['number'], (task['key'], info['number'])
    issue = actual[info['number']]
    assert issue['id'] == info['id'], task['key']
    labels = {x['name'] for x in issue['labels']['nodes']}
    assert not any(label.startswith('role:') for label in labels), task['key']
    if task['status'] == CLOSED_NOT_PLANNED:
        assert issue['state'] == 'CLOSED', (task['key'], issue['state'])
        assert issue['stateReason'] == 'NOT_PLANNED', (task['key'], issue['stateReason'])
        assert not issue['blockedBy']['nodes'], (task['key'], 'closed issue still has blockers')
        continue
    assert issue['state'] == 'OPEN' or (issue['state'] == 'CLOSED' and issue['stateReason'] == 'COMPLETED'), \
        (task['key'], issue['state'], issue['stateReason'])
    assert issue['title'] == task['title'], task['key']
    assert issue['assignees']['totalCount'] == 0, task['key']
    assert {x for x in labels if x.startswith('priority:')} == {f'priority:{task["priority"]}'}, (task['key'], labels)
    # Ticking acceptance boxes is how evidence gets recorded, so checkbox state is not drift.
    assert UNTICK.sub('- [ ]', issue['body']) == body(task, published['issues']), task['key']
    expected = {published['issues'][d]['id'] for d in task['deps']}
    assert {x['id'] for x in issue['blockedBy']['nodes']} == expected, task['key']
    for heading in ['## Context','## Priority','## Dependencies','## Scope','## Acceptance criteria','## Required evidence']:
        assert heading in issue['body'], (task['key'], heading)
    for d in task['deps']:
        assert published['issues'][d]['url'] in issue['body']
    edges += len(expected)
visibility = 'private' if repo['isPrivate'] else 'public'
print(f'VERIFIED: {visibility} repository; {len(open_tasks())} open or completed issues with exact titles, bodies and one priority label each, '
      f'no assignees or role labels; {edges} exact native blocker links; '
      f'{len(closed_tasks())} issues closed as not planned with no blockers.')
