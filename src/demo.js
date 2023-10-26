const DEMO_HTML = 
  `<!doctype html>
    <html>
    <head>
    </head>
      <body>
        <div>
          <canvas id="anim_target" class="anim_target"></canvas>
        </div>
        <script type="text/javascript">
          const delay_scale = 0.9;
          let timer = null;

          const animate = function(img, timeline, element)
          {
            let i = 0;
            let run_time = 0;
            for (let j = 0; j < timeline.length - 1; ++j) {
              run_time += timeline[j].delay;
            }

            const f = function()
            {
              const frame = i++ % timeline.length;
              const delay = timeline[frame].delay * delay_scale;
              const blits = timeline[frame].blit;
              const ctx = element.getContext('2d');
              for (j = 0; j < blits.length; ++j)
              {
                const blit = blits[j];
                const sx = blit[0];
                const sy = blit[1];
                const w = blit[2];
                const h = blit[3];
                const dx = blit[4];
                const dy = blit[5];
                ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h);
              }
              timer = window.setTimeout(f, delay);
            };

            if (timer) window.clearTimeout(timer);
            f();
          }

          function set_animation(img_url, timeline, canvas_id, fallback_id)
          {
            const img = new Image();
            img.onload = function()
            {
              const canvas = document.getElementById(canvas_id);
              if (canvas && canvas.getContext) {
                const blits = timeline[0].blit[0];
                canvas.width = blits[2];
                canvas.height = blits[3];
                animate(img, timeline, canvas);
              }
            };
            img.src = img_url;
          }
          
          const timeline = JSON.parse('__TIMELINE__PLACEHOLDER__');
          set_animation("packed_image.__EXTENSION__", timeline, 'anim_target');
        </script>
      </body>
    </html>
  `;

export default DEMO_HTML;