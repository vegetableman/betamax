# Copyright (c) 2012, Sublime HQ Pty Ltd
# All rights reserved.

# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright
#       notice, this list of conditions and the following disclaimer in the
#       documentation and/or other materials provided with the distribution.
#     * Neither the name of the <organization> nor the
#       names of its contributors may be used to endorse or promote products
#       derived from this software without specific prior written permission.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
# DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    
import io
import base64
import json
import cv2
import sys
import re
import os
import hashlib
import imageio.v3 as iio
from PIL import Image
from numpy import *
import scipy.ndimage as nd
from time import time

t = time()
t0 = time()

END_FRAME_PAUSE = 4000

SIMPLIFICATION_TOLERANCE = 512

MAX_PACKED_HEIGHT = 200000

def slice_size(a, b):
  return (a.stop - a.start) * (b.stop - b.start)

def combine_slices(a, b, c, d):
  return (slice(min(a.start, c.start), max(a.stop, c.stop)),
    slice(min(b.start, d.start), max(b.stop, d.stop)))

def slices_intersect(a, b, c, d):
  if (a.start >= c.stop): return False
  if (c.start >= a.stop): return False
  if (b.start >= d.stop): return False
  if (d.start >= b.stop): return False
  return True

# Combine a large set of rectangles into a smaller set of rectangles,
# minimising the number of additional pixels included in the smaller set of
# rectangles
def simplify(boxes, tol = 0):
  out = []
  for a,b in boxes:
    sz1 = slice_size(a, b)
    did_combine = False
    for i in range(len(out)):
      c,d = out[i]
      cu, cv = combine_slices(a, b, c, d)
      sz2 = slice_size(c, d)
      if slices_intersect(a, b, c, d) or (slice_size(cu, cv) <= sz1 + sz2 + tol):
        out[i] = (cu, cv)
        did_combine = True
        break
    if not did_combine:
      out.append((a,b))

  if tol != 0:
    return simplify(out, 0)
  else:
    return out

# Allocates space in the packed image. This does it in a slow, brute force
# manner.
class Allocator2D:
  def __init__(self, rows, cols):
    self.bitmap = zeros((rows, cols), dtype=uint8)
    self.available_space = zeros(rows, dtype=uint32)
    self.available_space[:] = cols
    self.num_used_rows = 0

  def allocate(self, w, h):
    bh, bw = shape(self.bitmap)

    for row in range(bh - h + 1):
        if self.available_space[row] < w:
            continue

        for col in range(bw - w + 1):
            if self.bitmap[row, col] == 0:
                if not self.bitmap[row:row+h,col:col+w].any():
                    self.bitmap[row:row+h,col:col+w] = 1
                    self.available_space[row:row+h] -= w
                    self.num_used_rows = max(self.num_used_rows, row + h)
                    return row, col
    raise RuntimeError("Allocation error")

def find_matching_rect(bitmap, num_used_rows, packed, src, sx, sy, w, h, packing_mode):
  # Check if the number of used rows is less than the height of the template
  if num_used_rows < h:
      return None

  # Extract the template and the relevant region from the packed image
  template = src[sy:sy+h, sx:sx+w]
  bh, bw = shape(bitmap)
  image_region = packed[0:num_used_rows, 0:bw]

  if packing_mode == 1.0:
    result = cv2.matchTemplate(image_region, template, cv2.TM_CCOEFF_NORMED)

    row,col = unravel_index(result.argmax(),result.shape)
    if ((packed[row:row+h,col:col+w] == src[sy:sy+h,sx:sx+w]).all()
        and (packed[row:row+1,col:col+w,0] == src[sy:sy+1,sx:sx+w,0]).all()):
        return row,col
    else:
        return None
  else:
    # Check if the template or image region is empty
    if template is None or template.shape[0] == 0 or template.shape[1] == 0:
        print("Error: Template is empty.")
        return None

    if image_region is None or image_region.shape[0] == 0 or image_region.shape[1] == 0:
        print("Error: Image region is empty.")
        return None

    # Use a single scale factor
    scale = packing_mode

    try:
      # Calculate the destination size (dsize) for the resized images
      dsize_template = (int(template.shape[1] * scale), int(template.shape[0] * scale))
      dsize_image = (int(image_region.shape[1] * scale), int(image_region.shape[0] * scale))

      if dsize_template[0] == 0 or dsize_template[1] == 0 or dsize_image[0] == 0 or dsize_image[1] == 0:
        return None

      # Resize the template and the image region
      scaled_template = cv2.resize(template, dsize_template)
      scaled_image = cv2.resize(image_region, dsize_image)
  
      # Perform template matching
      result = cv2.matchTemplate(scaled_image, scaled_template, cv2.TM_CCOEFF_NORMED)
  
      # Find the location of the maximum correlation
      row, col = unravel_index(result.argmax(), result.shape)
  
      # Rescale the coordinates to the original image size
      row, col = int(row / scale), int(col / scale)
  
      # Check if the template matches the corresponding region in the packed image
      if (
          array_equal(packed[row:row+h, col:col+w], src[sy:sy+h, sx:sx+w])
          and array_equal(packed[row:row+1, col:col+w, 0], src[sy:sy+1, sx:sx+w, 0])
      ):
          return row, col
    except Exception as e:
      # Handle any exceptions (e.g., division by zero, invalid resize)
      print(f"Error: {e}")

    return None

def slice_tuple_size(s):
  a, b = s
  return (a.stop - a.start) * (b.stop - b.start)

def to_native(d):
  if isinstance(d, dict):
      return {k: to_native(v) for k, v in d.items()}
  if isinstance(d, list):
      return [to_native(i) for i in d]
  if type(d).__module__ == 'numpy':
      return to_native(d.tolist())
  return d

def generate_animation(anim_name):
  frames = []
  set_printoptions(threshold=inf)
  rex = re.compile("([0-9]+).png")
  counter = 0
  for f in os.listdir(anim_name):
      m = re.search(rex, f)
      if m:
          frames.append((int(m.group(1)), anim_name + "/" + f))
  frames.sort()
  last_sha256 = None
  images = []
  times = []
  for t, f in frames:
    # Duplicate frames results in opencv terminating
    # the process with a SIGKILL during matchTemplate
    with open(f, 'rb') as h:
        sha256 = hashlib.sha256(h.read()).digest()
    if sha256 == last_sha256:
        continue
    last_sha256 = sha256

    im = iio.imread(f)
    height, width, _ = im.shape
    if im.shape[2] == 4:
        im = im[:,:,:3]
    images.append(im)
    times.append(t)

  zero = images[0] - images[0]
  pairs = zip([zero] + images[:-1], images)
  diffs = [sign((b - a).max(2)) for a, b in pairs]

  # Find different objects for each frame
  img_areas = [nd.find_objects(nd.label(d)[0]) for d in diffs]

  # The simplify function provided can be used to simplify a set of boxes (rectangles) by merging overlapping or adjacent boxes into larger composite boxes. The resulting simplified set of boxes aims to minimize the number of additional pixels included in the overall representation.
  img_areas = [simplify(x, SIMPLIFICATION_TOLERANCE) for x in img_areas]

  ih, iw, _ = shape(images[0])

  # Generate a packed image
  allocator = Allocator2D(MAX_PACKED_HEIGHT, iw)
  packed = zeros((MAX_PACKED_HEIGHT, iw, 3), dtype=uint8)

  # Sort the rects to be packed by largest size first, to improve the packing
  rects_by_size = []
  for i in range(len(images)):
    src_rects = img_areas[i]

    for j in range(len(src_rects)):
      rects_by_size.append((slice_tuple_size(src_rects[j]), i, j))

  rects_by_size.sort(reverse = True)

  total_rects = len(rects_by_size)

  allocs = [[None] * len(src_rects) for src_rects in img_areas]

  print("%s packing, num rects: %d num frames: %s" % (anim_name, len(rects_by_size),  len(images)))

  t0 = time()

  rc = 1
  for size,i,j in rects_by_size:
    print(f"{rc}/{total_rects}")
    src = images[i]
    src_rects = img_areas[i]

    a, b = src_rects[j]
    sx, sy = b.start, a.start
    w, h = b.stop - b.start, a.stop - a.start

    # See if the image data already exists in the packed image. This takes
    # a long time, but results in worthwhile space savings (20% in one
    # test)
    existing = find_matching_rect(allocator.bitmap, allocator.num_used_rows, packed, src, sx, sy, w, h, 1.0)
    if existing:
      dy, dx = existing
      allocs[i][j] = (dy, dx)
    else:
      result = allocator.allocate(w, h)
      if result != None:
        dy, dx = result
        allocs[i][j] = (dy, dx)
        
        packed[dy:dy+h, dx:dx+w] = src[sy:sy+h, sx:sx+w]
    rc = rc + 1

  print("%s packing finished, took: %fs" % (anim_name, time() - t0))

  packed = packed[0:allocator.num_used_rows]

  iio.imwrite(anim_name + "_packed_tmp.png", packed)

  # Don't completely fail if we don't have pngcrush
  if os.system("pngcrush -q " + anim_name + "_packed_tmp.png " + anim_name + "_packed.png") == 0:
    os.system("rm " + anim_name + "_packed_tmp.png")
  else:
    print("pngcrush not found, unable to reduce filesize")
    os.system("mv " + anim_name + "_packed_tmp.png " + anim_name + "_packed.png")

  # Try to use pngquant since it can significantly reduce filesize for screencasts
  # that don't include photos or other sources of many different colors
  if os.system("pngquant -o " + anim_name + "_quant.png " + anim_name + "_packed.png") == 0:
    os.system("mv " + anim_name + "_quant.png " + anim_name + "_packed.png")
  else:
    print("pngquant not found, unable to reduce filesize")

  print(f"{times}")

  # Generate JSON to represent the data
  delays = (array(times[1:] + [times[-1] + END_FRAME_PAUSE]) - array(times)).tolist()

  allocs = [[(0, 0) if item is None else item for item in sublist] for sublist in allocs]

  print(f"{allocs}")

  timeline = []
  for i in range(len(allocs)):
    src_rects = img_areas[i]
    dst_rects = allocs[i]
    blitlist = []

    for j in range(len(src_rects)):
      a, b = src_rects[j]
      sx, sy = b.start, a.start
      w, h = b.stop - b.start, a.stop - a.start
      dy, dx = dst_rects[j]

      blitlist.append([dx, dy, w, h, sx, sy])

    timeline.append({'delay': delays[i], 'blit': blitlist})

  print(f"{timeline}")

  f = open('%s_anim.js' % anim_name, 'wb')
  f.write(("%s_timeline = " % anim_name).encode('utf-8'))
  f.write(json.dumps(to_native(timeline)).encode('utf-8'))
  f.close()


if __name__ == '__main__':
    generate_animation(sys.argv[1])
