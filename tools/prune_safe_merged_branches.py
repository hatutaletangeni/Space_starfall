#!/usr/bin/env python3
"""Safely prune ONLY GitHub branches proven to be fully ancestor-merged to main.

Does not delete: main, backups, releases, protected branches, active PR heads,
or any branch with even one unique commit not in main. Emits JSON audit first.
This script is run with a limited repo-scoped GITHUB_TOKEN by GitHub Actions.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = os.getenv("GITHUB_REPOSITORY", "hatutaletangeni/Space_starfall")
TOKEN = os.getenv("GITHUB_TOKEN")
API = "https://api.github.com"
PROTECTED_PREFIXES = ("backup/", "release/",)
ELIGIBLE_PREFIXES = ("feature/", "fix/", "hotfix/", "update-")
REPORT_PATH = Path("artifacts/update8-branch-prune.json")

def api(path, method="GET"):
    if not TOKEN:
        raise RuntimeError("GITHUB_TOKEN is required; cannot safely enumerate active PR heads")
    request=urllib.request.Request(
        API+path,
        headers={"Authorization": "Bearer "+TOKEN,
                 "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28",
                 "User-Agent": "starfall-verified-branch-pruner"},
        method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status == 204:
            return None
        return json.load(response)

def paginated(path):
    items=[]
    for page in range(1,20):
        sep="&" if "?" in path else "?"
        batch=api(path+sep+"per_page=100&page="+str(page))
        if not isinstance(batch,list):raise RuntimeError("Unexpected GitHub list response")
        items.extend(batch)
        if len(batch)<100:return items
    raise RuntimeError("Too many pages; abort rather than prune from incomplete listing")

def ancestor(sha):
    # Actions checkout fetch-depth=0 plus explicit remote branch fetch.
    outcome=subprocess.run(["git","merge-base","--is-ancestor",sha,"origin/main"],check=False)
    if outcome.returncode not in (0,1):raise RuntimeError("git ancestry check failed")
    return outcome.returncode==0

def select(branches,open_heads,ancestor_fn):
    candidate=[]
    preserved=[]
    for b in branches:
        name=b.get("name","")
        if not name or name=="main" or name.startswith(PROTECTED_PREFIXES):
            reason="default / rollback / release"
        elif b.get("protected"):
            reason="protected branch"
        elif name in open_heads:
            reason="active open PR"
        elif not name.startswith(ELIGIBLE_PREFIXES):
            reason="not an approved short-lived branch"
        elif not b.get("commit",{}).get("sha"):
            reason="missing immutable branch head"
        elif not ancestor_fn(b["commit"]["sha"]):
            reason="contains commits not reachable from current main"
        else:
            candidate.append({"name":name,"sha":b["commit"]["sha"]})
            continue
        preserved.append({"name":name,"reason":reason})
    return candidate,preserved

def main():
    if REPO!="hatutaletangeni/Space_starfall":
        raise RuntimeError("Unexpected repository; cleanup locked to STARFALL")
    apply="--apply" in sys.argv
    branches=paginated("/repos/"+REPO+"/branches")
    prs=paginated("/repos/"+REPO+"/pulls?state=open")
    open_heads={
        p["head"]["ref"] for p in prs
        if p.get("head",{}).get("repo",{}).get("full_name")==REPO
    }
    candidates,preserved=select(branches,open_heads,ancestor)
    report={"repo":REPO,"base":"main","before":len(branches),
        "mode":"apply" if apply else "dry_run","candidates":candidates,
        "preserved":preserved,"deleted":[],"failed":[]}
    REPORT_PATH.parent.mkdir(parents=True,exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report,indent=2)+"\n")
    print("Examined",len(branches),"branches; exactly ancestor-merged:",len(candidates),
          "retained:",len(preserved),"apply:",apply,flush=True)
    if apply:
        for item in candidates:
            name=item["name"]
            try:
                # Defensive lease recheck: if bot/author advanced the branch,
                # never delete their new work.
                ref=api("/repos/"+REPO+"/git/ref/heads/"+urllib.parse.quote(name,safe=""))
                if ref.get("object",{}).get("sha")!=item["sha"]:
                    report["failed"].append({"name":name,"why":"branch SHA changed since audit"})
                    continue
                api("/repos/"+REPO+"/git/refs/heads/"+urllib.parse.quote(name,safe=""),"DELETE")
                report["deleted"].append(item)
                print("Deleted fully integrated branch:",name,flush=True)
            except (urllib.error.HTTPError,urllib.error.URLError) as exc:
                report["failed"].append({"name":name,"why":str(exc)})
                print("KEPT branch due to permission or race:",name,str(exc),flush=True)
            finally:
                REPORT_PATH.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"total":len(branches),"deleted":len(report["deleted"]),
       "preserved":len(report["preserved"]),"failed":len(report["failed"])}))
    if apply and report["failed"]:
        raise RuntimeError("Some safe branch deletions failed; review JSON audit. No unmerged branch deleted.")

if __name__=="__main__":
    main()
