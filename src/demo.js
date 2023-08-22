const DEMO_HTML = 
  `
    <!doctype html>
    <html>

    <head>
      <script type="text/javascript" src="timeline.js"></script>
      <script type="text/javascript">
      var delay_scale = 0.7
      var timer = null

      var animate = function(img, timeline, element)
      {
        var i = 0
        var run_time = 0
        for (var j = 0; j < timeline.length - 1; ++j)
          run_time += timeline[j].delay

        var f = function()
        {
          var frame = i++ % timeline.length
          var delay = timeline[frame].delay * delay_scale
          var blits = timeline[frame].blit

          var ctx = element.getContext('2d')

          for (j = 0; j < blits.length; ++j)
          {
            var blit = blits[j]
            var sx = blit[0]
            var sy = blit[1]
            var w = blit[2]
            var h = blit[3]
            var dx = blit[4]
            var dy = blit[5]
            ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h)
          }

          timer = window.setTimeout(f, delay)
        }

        if (timer) window.clearTimeout(timer)
        f()
      }

      function set_animation(img_url, timeline, canvas_id, fallback_id)
      {
        var img = new Image()
        img.onload = function()
        {
          var canvas = document.getElementById(canvas_id)
          if (canvas && canvas.getContext)
            animate(img, timeline, canvas)
        }
        img.src = img_url
      }
      </script>
    </head>

      <body>
      <div><canvas id="anim_target" class="anim_target" width="1920" height="1080"></canvas></div>
      <script>
        set_animation("packed_image.png", timeline, 'anim_target');
      </script>

      </body>
    </html>
  `;

export default DEMO_HTML;