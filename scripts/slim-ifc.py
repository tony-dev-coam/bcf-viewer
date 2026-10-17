"""Drop whole property sets from an IFC (STEP) file to shrink it, streaming line by line (stdlib only).

Usage: python3 scripts/slim-ifc.py in.ifc out.ifc PsetName [PsetName ...]

Removes each matching IfcPropertySet, its IfcRelDefinesByProperties and the properties only it uses.
ponytail: assumes one entity per line (true for Revit/ArchiCAD/MagiCAD exports); wrap-aware parsing if a file breaks that.
"""
import re
import sys

src, dst, *names = sys.argv[1:]
drop_names = set(names)
ENTITY = re.compile(rb"#(\d+)\s*=\s*(IFC\w+)\((.*)\);\s*$")
REF = re.compile(rb"#(\d+)")
PSET_NAME = re.compile(rb"^'[^']*',[^,]*,'((?:[^']|'')*)'")

# Pass 1: which psets to drop, and which properties are still used by a kept pset.
drop_psets, drop_props, kept_props = set(), set(), set()
with open(src, "rb") as f:
    for line in f:
        m = ENTITY.match(line)
        if not m or m.group(2) != b"IFCPROPERTYSET":
            continue
        name = PSET_NAME.match(m.group(3))
        props = {int(r) for r in REF.findall(m.group(3).rsplit(b"(", 1)[-1])}
        if name and name.group(1).decode("latin1") in drop_names:
            drop_psets.add(int(m.group(1)))
            drop_props |= props
        else:
            kept_props |= props
drop_props -= kept_props

# Pass 2: copy everything except the dropped psets, their relations and their properties.
removed = 0
with open(src, "rb") as f, open(dst, "wb") as out:
    for line in f:
        m = ENTITY.match(line)
        if m:
            eid, kind = int(m.group(1)), m.group(2)
            last_ref = REF.findall(m.group(3))[-1:] if kind == b"IFCRELDEFINESBYPROPERTIES" else []
            if eid in drop_psets or eid in drop_props or (last_ref and int(last_ref[0]) in drop_psets):
                removed += 1
                continue
        out.write(line)
print(f"{src}: dropped {len(drop_psets)} psets, {len(drop_props)} properties, {removed} lines")
