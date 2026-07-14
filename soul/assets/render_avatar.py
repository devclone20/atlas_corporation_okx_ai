import bpy, math, sys, mathutils

argv = sys.argv[sys.argv.index("--")+1:]
OBJ, OUTDIR = argv[0], argv[1]
RES = int(argv[2]) if len(argv) > 2 else 512
ANGLES = [int(x) for x in argv[3].split(",")] if len(argv) > 3 else list(range(0, 360, 45))
FINAL = (len(argv) > 4 and argv[4] == "final")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=OBJ)

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.context.view_layer.objects.active = meshes[0]
for o in meshes: o.select_set(True)
if len(meshes) > 1:
    bpy.ops.object.join()
model = bpy.context.view_layer.objects.active

# world-space bounding box
coords = [model.matrix_world @ mathutils.Vector(c) for c in model.bound_box]
mn = mathutils.Vector((min(c.x for c in coords), min(c.y for c in coords), min(c.z for c in coords)))
mx = mathutils.Vector((max(c.x for c in coords), max(c.y for c in coords), max(c.z for c in coords)))
size = mx - mn
center = (mn + mx) / 2
vax = max(range(3), key=lambda i: size[i])          # vertical axis = tallest
hax = [i for i in range(3) if i != vax]             # two horizontal axes
vlen = size[vax]
rad = max(size[hax[0]], size[hax[1]]) * 2.4 + vlen * 0.6

# head target: near the top along the vertical axis
target = center.copy()
target[vax] = mx[vax] - vlen * 0.16
span = vlen * 0.34                                   # head + shoulders (bust)

up = [0, 0, 0]; up[vax] = 1; UP = mathutils.Vector(up)

def aim(obj, at):
    d = at - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# camera
cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd)
bpy.context.scene.collection.objects.link(cam)
cd.type = 'ORTHO'; cd.ortho_scale = span * 1.5
bpy.context.scene.camera = cam

# lights
def light(name, offset, energy, sz):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = sz
    o = bpy.data.objects.new(name, l); o.location = target + mathutils.Vector(offset)
    bpy.context.scene.collection.objects.link(o); aim(o, target)

R = rad
light("key",  (R*0.7, -R*0.7,  vlen*0.35), 220, R*0.9)
light("fill", (-R*0.8, -R*0.4, 0),          70, R*1.2)
light("rim",  (0,      R*0.9,  vlen*0.25), 160, R*0.8)

# dark world
w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.015, 0.016, 0.02, 1); bg.inputs[1].default_value = 1.0

sc = bpy.context.scene
try: sc.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception:
    try: sc.render.engine = 'BLENDER_EEVEE'
    except Exception: sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = RES; sc.render.resolution_y = RES
sc.render.film_transparent = True
try: sc.view_settings.view_transform = 'Standard'
except Exception: pass
try: sc.eevee.taa_render_samples = 64 if FINAL else 16
except Exception: pass

def place(angle_deg):
    a = math.radians(angle_deg)
    off = [0, 0, 0]
    off[hax[0]] = R * math.sin(a)
    off[hax[1]] = -R * math.cos(a)
    off[vax] = (target[vax] - center[vax]) * 0 + vlen * 0.02
    cam.location = target + mathutils.Vector(off)
    aim(cam, target)

for ang in ANGLES:
    place(ang)
    sc.render.filepath = f"{OUTDIR}/head_{ang:03d}.png"
    bpy.ops.render.render(write_still=True)

print("BBOX size:", tuple(round(v,3) for v in size), "vertical_axis:", vax)
