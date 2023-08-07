async function processImages(data) {
  const {screenshots: images, times, format, dimension} = data.payload;
  let width = null;
  let height = null;
  if (dimension) {
    width = dimension.width;
    height = dimension.height;
  }
  await pyodide.runPythonAsync(`
    import io
    import base64
    import json
    import cv2
    import imageio.v3 as iio
    from PIL import Image
    from numpy import *
    import scipy.ndimage as nd
    from time import time

    t = time()
    t0 = time()

    END_FRAME_PAUSE = 4000

    SIMPLIFICATION_TOLERANCE = 512

    MAX_PACKED_HEIGHT = 20000

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
        raise RuntimeError()

    def find_matching_rect(bitmap, num_used_rows, packed, src, sx, sy, w, h):
      template = src[sy:sy+h, sx:sx+w]
      bh, bw = shape(bitmap)
      image = packed[0:num_used_rows, 0:bw]
  
      if num_used_rows < h:
          return None
  
      result = cv2.matchTemplate(image,template,cv2.TM_CCOEFF_NORMED)
  
      row,col = unravel_index(result.argmax(),result.shape)
      if ((packed[row:row+h,col:col+w] == src[sy:sy+h,sx:sx+w]).all()
          and (packed[row:row+1,col:col+w,0] == src[sy:sy+1,sx:sx+w,0]).all()):
          return row,col
      else:
          return None

    def slice_tuple_size(s):
      a, b = s
      return (a.stop - a.start) * (b.stop - b.start)

    images = []
    str_urls = '${JSON.stringify(images)}'
    urls = json.loads(str_urls)
    times_ = json.loads('${JSON.stringify(times)}')
    times = []
    last_url = ''
    i = 0
    print(f"Reading Images")

    for u in urls:
      if u == last_url:
        i = i + 1
        continue
      last_url = u;
      # Remove the "data:image/<image_format>;base64," prefix
      base64_data = u.split(",")[1]

      # Decode the Base64 data into binary form
      image_data = base64.b64decode(base64_data)
      im = iio.imread(io.BytesIO(image_data))
      #crop_x = 0
      #crop_y = 0
      #crop_width = 400
      #crop_height = 400
      #im = im[crop_y:crop_y+crop_height, crop_x:crop_x+crop_width]

      #height, width, _ = im.shape
      w = '${width}'
      h = '${height}'
      if w != 'null' and h != 'null':
        img_obj = Image.fromarray(im).resize((int(width), int(height)))
        im = array(img_obj)
      if im.shape[2] == 4:
        im = im[:,:,:3]
      images.append(im)
      times.append(times_[i])
      i = i + 1
      
    t0 = time() - t0
    print(f"Reading Images: {t0}")

    t1 = time()

    print(f"Diffing Images")

    zero = images[0] - images[0]
    pairs = zip([zero] + images[:-1], images)
    diffs = [sign((b - a).max(2)) for a, b in pairs]

    img_areas = [nd.find_objects(nd.label(d)[0]) for d in diffs]

    img_areas = [simplify(x, SIMPLIFICATION_TOLERANCE) for x in img_areas]

    t1 = time() - t1
    print(f"Diffing Images: {t1}")
    
    ih, iw, _ = shape(images[0])

    allocator = Allocator2D(MAX_PACKED_HEIGHT, iw)
    packed = zeros((MAX_PACKED_HEIGHT, iw, 3), dtype=uint8)

    t2 = time()
    print(f"Packing the differences")

    rects_by_size = []
    for i in range(len(images)):
      src_rects = img_areas[i]

      for j in range(len(src_rects)):
          rects_by_size.append((slice_tuple_size(src_rects[j]), i, j))

    rects_by_size.sort(reverse = True)

    allocs = [[None] * len(src_rects) for src_rects in img_areas]

    for size,i,j in rects_by_size:
      src = images[i]
      src_rects = img_areas[i]

      a, b = src_rects[j]
      sx, sy = b.start, a.start
      w, h = b.stop - b.start, a.stop - a.start

      existing = find_matching_rect(allocator.bitmap, allocator.num_used_rows, packed, src, sx, sy, w, h)
      if existing:
        dy, dx = existing
        allocs[i][j] = (dy, dx)
      else:
        dy, dx = allocator.allocate(w, h)
        allocs[i][j] = (dy, dx)

      packed[dy:dy+h, dx:dx+w] = src[sy:sy+h, sx:sx+w]

    packed = packed[0:allocator.num_used_rows]

    t2 = time() - t2
    print(f"Packing the differences: {t2}")

    t3 = time()
    print(f"Writing the image: {t3}")

    buffer = io.BytesIO()
    iio.imwrite(buffer, packed, extension='.${format}')
    
    t3 = time() - t3
    print(f"Writing the image: {t3}")

    buffer.seek(0)
    buffer_content = buffer.getvalue()

    print(f"Creating the timeline")
    delays = (array(times[1:] + [times[-1] + END_FRAME_PAUSE]) - array(times)).tolist()
    
    timeline = []
    for i in range(len(images)):
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
  `)

  const buffer = pyodide.globals.get('buffer_content').toJs();
  const timeline = JSON.parse(pyodide.globals.get('timeline').toString().replaceAll("'", '"'));
  const image = new Blob([buffer], { type: `image/${format}` });

  self.postMessage({ done: true, payload: {image, timeline} });
  pyodide.runPython('import sys; sys.modules.clear()');
}

onmessage = async function (e) {
  switch (e.data.msg) {
    case 'load': {
      // Import Webassembly script
      self.importScripts(e.data.payload.pyodide);
      if (!loadPyodide.inProgress) {
        self.pyodide = await loadPyodide();
      }
      await pyodide.loadPackage(e.data.payload.packages)
      self.postMessage({ done: true });
      break
    }
    case 'processImages':
      console.log = function (message) {
        self.postMessage({ done: false, payload: {message} });
      };
      return processImages(e.data)
    default:
      break
  }
}