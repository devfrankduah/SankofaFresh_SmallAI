"""Migrate the published v1 issues to Spec v2. Dry run by default; --apply changes GitHub.

Each step re-reads GitHub and skips work that is already done, and published.json is saved
after every change it records, so an interrupted --apply run can be resumed by rerunning it.
"""
import argparse
import json
import shlex
import subprocess
import sys
from prepare_backlog import (CLOSED_NOT_PLANNED, NOT_PLANNED_COMMENT, OPEN, ROOT, TASKS, body,
                             closed_tasks, open_tasks, validate_tasks, write_issue_files)

OWNER, NAME = 'GeorgeDavidson2', 'SankofaFresh_SmallAI'
REPO = f'{OWNER}/{NAME}'
STATE = ROOT / 'docs/planning/published.json'
INDEX = ROOT / 'docs/planning/ISSUE_INDEX.md'
PRIORITY_PREFIX = 'priority:'
ISSUES_QUERY = '''query($owner:String!,$name:String!){repository(owner:$owner,name:$name){
issues(first:100){totalCount nodes{id number url title body state stateReason
labels(first:50){nodes{name}} blockedBy(first:100){nodes{id number}}}}}}'''
EDGE_MUTATION = '''mutation($issue:ID!,$blocker:ID!){%s(input:{issueId:$issue,blockingIssueId:$blocker}){
issue{number} blockingIssue{number}}}'''

def gh_read(*args):
    result = subprocess.run(['gh', *args], capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f'gh {args[0]} failed with status {result.returncode}:\n{result.stderr.strip()}')
    return result.stdout

def gh_change(args, stdin=None, display=None):
    """Run a gh command that changes GitHub, print all of its output, and stop on failure."""
    print(f'  $ gh {display or shlex.join(args)}', flush=True)
    result = subprocess.run(['gh', *args], capture_output=True, text=True, input=stdin)
    for line in (result.stdout + result.stderr).splitlines():
        print(f'    {line}', flush=True)
    if result.returncode != 0:
        sys.exit(f'gh exited with status {result.returncode}. Later steps did not run; rerun to resume.')
    return result.stdout

def fetch_live():
    data = json.loads(gh_read('api', 'graphql', '-f', f'query={ISSUES_QUERY}', '-f', f'owner={OWNER}', '-f', f'name={NAME}'))
    if data.get('errors'):
        sys.exit(f'GitHub query failed: {data["errors"]}')
    issues = data['data']['repository']['issues']
    if issues['totalCount'] > len(issues['nodes']):
        sys.exit(f'The repository has {issues["totalCount"]} issues; add pagination before running this script.')
    return {i['number']: i for i in issues['nodes']}

def save(state):
    STATE.write_text(json.dumps(state, indent=2)+'\n')

def load_state():
    state = json.loads(STATE.read_text())
    stale = sorted(set(state['issues']) - {t['key'] for t in TASKS})
    if stale:
        sys.exit(f'published.json has keys that are not v2 tasks: {stale}. Migrate it to the v2 keys first.')
    for task in TASKS:
        info = state['issues'].get(task['key'])
        if task['number'] is not None and (info is None or info['number'] != task['number']):
            sys.exit(f'published.json maps {task["key"]} to {info and info["number"]}; TASKS expects #{task["number"]}.')
    return state

def check_ids(state, live):
    for key, info in state['issues'].items():
        issue = live.get(info['number'])
        if issue is None or issue['id'] != info['id']:
            sys.exit(f'published.json records {key} as #{info["number"]} ({info["id"]}), which does not match GitHub.')

def issue_of(task, state, live):
    info = state['issues'].get(task['key'])
    return live[info['number']] if info else None

def priority_labels(issue):
    return {x['name'] for x in issue['labels']['nodes'] if x['name'].startswith(PRIORITY_PREFIX)}

def blocker_changes(task, state, issue):
    """Return (blockers to remove as GitHub nodes, blocker task keys to add)."""
    wanted = {k: state['issues'][k]['id'] for k in task['deps'] if k in state['issues']}
    current = issue['blockedBy']['nodes'] if issue else []
    current_ids = {b['id'] for b in current}
    remove = [b for b in current if b['id'] not in wanted.values()]
    add = [k for k in task['deps'] if k not in wanted or wanted[k] not in current_ids]
    return remove, add

def print_plan(state, live):
    key_by_number = {info['number']: key for key, info in state['issues'].items()}
    def by_number(number):
        return f'#{number} {key_by_number.get(number, "(not in backlog)")}'
    def by_key(key):
        info = state['issues'].get(key)
        return f'#{info["number"]} {key}' if info else f'{key} (created in step 1)'
    totals = dict(create=0, title=0, body=0, label=0, remove=0, add=0, close=0)
    for task in TASKS:
        issue = issue_of(task, state, live)
        name = f'#{issue["number"]} {task["key"]}' if issue else f'new {task["key"]}'
        if task['status'] == CLOSED_NOT_PLANNED:
            print(f'\n{name}: close as not planned')
        elif issue is None:
            print(f'\n{name}: create')
        else:
            print(f'\n{name}: edit')
        if task['status'] == OPEN and issue is None:
            totals['create'] += 1
            print(f'  title: {task["title"]}')
            print(f'  labels: add priority:{task["priority"]}')
        elif task['status'] == OPEN:
            if issue['state'] != 'OPEN':
                print(f'  WARNING: the issue is {issue["state"]}; this script does not reopen issues')
            if issue['title'] != task['title']:
                totals['title'] += 1
                print(f'  title: {issue["title"]}\n      -> {task["title"]}')
            else:
                print(f'  title: unchanged ({task["title"]})')
            if issue['body'] != body(task, state['issues']):
                totals['body'] += 1
                print('  body: replace with the v2 body')
            else:
                print('  body: unchanged')
            want = f'{PRIORITY_PREFIX}{task["priority"]}'
            have = priority_labels(issue)
            extra = sorted(have - {want})
            if want in have and not extra:
                print(f'  labels: {want} (unchanged)')
            else:
                totals['label'] += 1
                changes = ([f'add {want}'] if want not in have else []) + [f'remove {x}' for x in extra]
                print(f'  labels: {"; ".join(changes)}')
        remove, add = blocker_changes(task, state, issue)
        totals['remove'] += len(remove)
        totals['add'] += len(add)
        print(f'  blockers: remove {", ".join(by_number(b["number"]) for b in remove) or "none"}; '
              f'add {", ".join(by_key(k) for k in add) or "none"}')
        if task['status'] == CLOSED_NOT_PLANNED:
            if issue['state'] == 'CLOSED':
                print(f'  close: already closed ({issue["stateReason"]}), skipped')
            else:
                totals['close'] += 1
                print(f'  close: gh issue close {issue["number"]} --reason "not planned" --comment "{NOT_PLANNED_COMMENT}"')
    print(f'\nSummary: create {totals["create"]} issue(s); retitle {totals["title"]}, rewrite {totals["body"]} bodies, '
          f'change labels on {totals["label"]}; remove {totals["remove"]} and add {totals["add"]} blocker links; '
          f'close {totals["close"]} as not planned.')

def create_missing(state):
    print('\nStep 1 of 5: create new issues', flush=True)
    live = fetch_live()
    for task in open_tasks():
        if task['key'] in state['issues']:
            print(f'  {task["key"]}: already recorded as #{state["issues"][task["key"]]["number"]}, skipped')
            continue
        # Adopting an exact-title open issue keeps a rerun after a crash from creating a duplicate.
        same_title = [i for i in live.values() if i['title'] == task['title'] and i['state'] == 'OPEN']
        if len(same_title) > 1:
            sys.exit(f'{len(same_title)} open issues are titled "{task["title"]}"; resolve that by hand first.')
        if same_title:
            number = same_title[0]['number']
            print(f'  {task["key"]}: recording existing open issue #{number} instead of creating a duplicate')
        else:
            url = gh_change(['issue', 'create', '--repo', REPO, '--title', task['title'], '--body-file', '-',
                             '--label', f'{PRIORITY_PREFIX}{task["priority"]}'], stdin=body(task, state['issues']))
            number = int(url.strip().splitlines()[-1].rsplit('/', 1)[1])
        state['issues'][task['key']] = json.loads(gh_read('issue', 'view', str(number), '--repo', REPO, '--json', 'id,number,url'))
        save(state)

def edit_open(state):
    print('\nStep 2 of 5: update titles, bodies and priority labels', flush=True)
    live = fetch_live()
    for task in open_tasks():
        issue = issue_of(task, state, live)
        new_body = body(task, state['issues'])
        want = f'{PRIORITY_PREFIX}{task["priority"]}'
        have = priority_labels(issue)
        args = []
        if issue['title'] != task['title']:
            args += ['--title', task['title']]
        if issue['body'] != new_body:
            args += ['--body-file', '-']
        if want not in have:
            args += ['--add-label', want]
        for extra in sorted(have - {want}):
            args += ['--remove-label', extra]
        if not args:
            print(f'  #{issue["number"]} {task["key"]}: already up to date, skipped')
            continue
        gh_change(['issue', 'edit', str(issue['number']), '--repo', REPO, *args],
                  stdin=new_body if '--body-file' in args else None)

def set_edge(mutation, issue, blocker):
    display = (f"api graphql -f query=<{mutation} mutation> -f issue={issue['id']} -f blocker={blocker['id']}"
               f'  (#{issue["number"]} blocked by #{blocker["number"]})')
    out = gh_change(['api', 'graphql', '-f', f'query={EDGE_MUTATION % mutation}',
                     '-f', f'issue={issue["id"]}', '-f', f'blocker={blocker["id"]}'], display=display)
    if json.loads(out).get('errors'):
        sys.exit(f'{mutation} returned errors; stopping before any further change.')

def sync_blockers(state):
    print('\nStep 3 of 5: blocker links', flush=True)
    live = fetch_live()
    key_by_id = {info['id']: key for key, info in state['issues'].items()}
    state['edges'] = [[t['key'], key_by_id[b['id']]] for t in TASKS
                      for b in issue_of(t, state, live)['blockedBy']['nodes'] if b['id'] in key_by_id]
    save(state)
    # All removals run before any addition: adding #13 <- #19 while v1's #19 <- #13 still exists would form a cycle.
    changes = [(t, issue_of(t, state, live), *blocker_changes(t, state, issue_of(t, state, live))) for t in TASKS]
    for task, issue, remove, _ in changes:
        for blocker in remove:
            set_edge('removeBlockedBy', issue, blocker)
            if blocker['id'] in key_by_id:
                state['edges'].remove([task['key'], key_by_id[blocker['id']]])
                save(state)
    for task, issue, _, add in changes:
        for dep in add:
            set_edge('addBlockedBy', issue, state['issues'][dep])
            state['edges'].append([task['key'], dep])
            save(state)
    if not any(remove or add for _, _, remove, add in changes):
        print('  all blocker links already match v2, nothing to change')
    live = fetch_live()
    actual = {(t['key'], key_by_id.get(b['id'], f'#{b["number"]}')) for t in TASKS
              for b in issue_of(t, state, live)['blockedBy']['nodes']}
    planned = [[t['key'], d] for t in open_tasks() for d in t['deps']]
    if actual != {tuple(e) for e in planned}:
        sys.exit(f'Blocker links on GitHub still differ from v2 after syncing: {sorted(actual ^ {tuple(e) for e in planned})}')
    state['edges'] = planned
    save(state)

def close_removed(state):
    print('\nStep 4 of 5: close removed work as not planned', flush=True)
    live = fetch_live()
    for task in closed_tasks():
        issue = issue_of(task, state, live)
        if issue['state'] == 'CLOSED':
            note = '' if issue['stateReason'] == 'NOT_PLANNED' else ' WARNING: not as NOT_PLANNED, left as is'
            print(f'  #{issue["number"]} {task["key"]}: already closed ({issue["stateReason"]}), skipped.{note}')
            continue
        gh_change(['issue', 'close', str(issue['number']), '--repo', REPO, '--reason', 'not planned',
                   '--comment', NOT_PLANNED_COMMENT])

def write_index(state):
    issues = state['issues']
    def link(key):
        return f'[#{issues[key]["number"]}]({issues[key]["url"]})'
    lines = ['# Published issue index', '',
             'Spec v2 backlog. Either teammate can pick any unblocked issue. Estimates are planning estimates only.', '',
             '## Open', '', '| Issue | Priority | Blocked by |', '|---|---|---|']
    for task in open_tasks():
        info = issues[task['key']]
        deps = ', '.join(link(d) for d in task['deps']) or 'None'
        lines.append(f'| [#{info["number"]} {task["title"]}]({info["url"]}) | {task["priority"]} | {deps} |')
    lines += ['', '## Closed as not planned', '', 'Spec v2 removes this work. Each issue carries a closing comment and keeps its v1 title and body.', '',
              '| Issue | Task key |', '|---|---|']
    for task in closed_tasks():
        info = issues[task['key']]
        lines.append(f'| [#{info["number"]} {task["title"]}]({info["url"]}) | `{task["key"]}` |')
    INDEX.write_text('\n'.join(lines)+'\n')

def regenerate_files(state):
    print('\nStep 5 of 5: regenerate docs/planning/issues and ISSUE_INDEX.md', flush=True)
    write_issue_files(state['issues'])
    write_index(state)
    print(f'  wrote {len(open_tasks())} issue files and the index')

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--apply', action='store_true', help='make the changes on GitHub (default: dry run)')
    args = parser.parse_args()
    validate_tasks()
    state = load_state()
    live = fetch_live()
    check_ids(state, live)
    print(f'{"APPLY" if args.apply else "DRY RUN"}: Spec v2 backlog migration for {REPO}')
    print_plan(state, live)
    if not args.apply:
        print('\nDRY RUN: nothing was changed. Rerun with --apply to make these changes.')
        return
    create_missing(state)
    edit_open(state)
    sync_blockers(state)
    close_removed(state)
    regenerate_files(state)
    print('\nDone. Run python docs/planning/verify_backlog.py to check the result.')

if __name__ == '__main__':
    main()
