# -*- coding: utf-8 -*-
import sys

BASE = "/c/Users/LARBI OUDAVA/pixel-perfect-replica"
path = BASE + "/src/routes/_authenticated/projects/$projectId.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []
replaced = 0
BT = chr(96)  # backtick
for line in lines:
    if "Authorization: ***" in line and "Bearer" not in line:
        line = line.replace("Authorization: *** ", "Authorization: " + BT + "Bearer ")
        replaced += 1
        print("FIXED :", repr(line[:60]))
    out.append(line)

if replaced == 1:
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(out)
    print("OK : 1 ligne remplacee")
else:
    print("ERREUR : remplace", replaced, "lignes")
    sys.exit(1)
