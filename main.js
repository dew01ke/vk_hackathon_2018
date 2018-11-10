$(document).ready(function() {
    "use strict";

    let options = {};
    let levelsLimit = 3;
    let u_max = new Int32Array([15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3, 0]);

    const match_t = (function () {
        function match_t(screen_idx, pattern_lev, pattern_idx, distance) {
            if (typeof screen_idx === "undefined") { screen_idx=0; }
            if (typeof pattern_lev === "undefined") { pattern_lev=0; }
            if (typeof pattern_idx === "undefined") { pattern_idx=0; }
            if (typeof distance === "undefined") { distance=0; }

            this.screen_idx = screen_idx;
            this.pattern_lev = pattern_lev;
            this.pattern_idx = pattern_idx;
            this.distance = distance;
        }
        return match_t;
    })();

    function loadImageToCanvas(url, elementId) {
        return new Promise(function(resolve, reject) {
            let canvas = document.getElementById(elementId);
            let ctx = canvas.getContext('2d');
            let img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.original_width = img.width;
                canvas.original_height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);

                return resolve(url);
            };
            img.src = url;
        });
    }

    function getDataFromCanvas(elementId) {
        const element = document.getElementById(elementId);
        const ctx = element.getContext('2d');

        const width = element.original_width;
        const height = element.original_height;

        console.log(width, height);

        return ctx.getImageData(0, 0, width, height);
    }

    function ic_angle(img, px, py) {
        var half_k = 15; // half patch size
        var m_01 = 0, m_10 = 0;
        var src=img.data, step=img.cols;
        var u=0, v=0, center_off=(py*step + px)|0;
        var v_sum=0,d=0,val_plus=0,val_minus=0;

        // Treat the center line differently, v=0
        for (u = -half_k; u <= half_k; ++u)
            m_10 += u * src[center_off+u];

        // Go line by line in the circular patch
        for (v = 1; v <= half_k; ++v) {
            // Proceed over the two lines
            v_sum = 0;
            d = u_max[v];
            for (u = -d; u <= d; ++u) {
                val_plus = src[center_off+u+v*step];
                val_minus = src[center_off+u-v*step];
                v_sum += (val_plus - val_minus);
                m_10 += u * (val_plus + val_minus);
            }
            m_01 += v * v_sum;
        }

        return Math.atan2(m_01, m_10);
    }

    function detectKeypoints(img, corners, max_allowed) {
        // detect features
        var count = jsfeat.yape06.detect(img, corners, 17);

        // sort by score and reduce the count if needed
        if(count > max_allowed) {
            jsfeat.math.qsort(corners, 0, count-1, function(a,b){return (b.score<a.score);});
            count = max_allowed;
        }

        // calculate dominant orientation for each keypoint
        for(var i = 0; i < count; ++i) {
            corners[i].angle = ic_angle(img, corners[i].x, corners[i].y);
        }

        return count;
    }

    function renderCorners(corners, count, img, step) {
        console.log('renderCorners', corners, count);

        var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
        for(var i=0; i < count; ++i)
        {
            var x = corners[i].x;
            var y = corners[i].y;
            var off = (x + y * step);
            img[off] = pix;
            img[off-1] = pix;
            img[off+1] = pix;
            img[off-step] = pix;
            img[off+step] = pix;
        }
    }

    function compute(elementId, maxLevels) {
        const output = {
            image: null,
            descriptors: [],
            corners: [],
            corners_num: 0
        };
        const levels = maxLevels | levelsLimit | 1;
        let imageData = getDataFromCanvas(elementId);
        let img_u8 = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, img_u8);

        var lev=0, i=0;
        var sc = 1.0;
        var max_pattern_size = 512;
        var max_per_level = 500;
        var sc_inc = Math.sqrt(2.0); // magic number ;)
        var lev0_img = new jsfeat.matrix_t(img_u8.cols, img_u8.rows, jsfeat.U8_t | jsfeat.C1_t);
        var lev_img = new jsfeat.matrix_t(img_u8.cols, img_u8.rows, jsfeat.U8_t | jsfeat.C1_t);
        var new_width=0, new_height=0;
        var lev_corners, lev_descr;
        var corners_num=0;

        var sc0 = Math.min(max_pattern_size/img_u8.cols, max_pattern_size/img_u8.rows);
        new_width = (img_u8.cols*sc0)|0;
        new_height = (img_u8.rows*sc0)|0;

        jsfeat.imgproc.resample(img_u8, lev0_img, new_width, new_height);

        // prepare preview
        output.image = new jsfeat.matrix_t(new_width>>1, new_height>>1, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.pyrdown(lev0_img, output.image);

        for(lev=0; lev < levels; ++lev) {
            output.corners[lev] = [];
            lev_corners = output.corners[lev];

            // preallocate corners array
            i = (new_width*new_height) >> lev;
            while(--i >= 0) {
                lev_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
            }

            output.descriptors[lev] = new jsfeat.matrix_t(32, max_per_level, jsfeat.U8_t | jsfeat.C1_t);
        }

        // do the first level
        lev_corners = output.corners[0];
        lev_descr = output.descriptors[0];

        jsfeat.imgproc.gaussian_blur(lev0_img, lev_img, options.blur_size|0); // this is more robust
        output.corners_num = detectKeypoints(lev_img, lev_corners, max_per_level);
        jsfeat.orb.describe(lev_img, lev_corners, output.corners_num, lev_descr);

        console.log("[1] train " + lev_img.cols + "x" + lev_img.rows + " points: " + output.corners_num);

        sc /= sc_inc;

        // lets do multiple scale levels
        // we can use Canvas context draw method for faster resize
        // but its nice to demonstrate that you can do everything with jsfeat
        for(lev = 1; lev < levels; ++lev) {
            lev_corners = output.corners[lev];
            lev_descr = output.descriptors[lev];

            new_width = (lev0_img.cols*sc)|0;
            new_height = (lev0_img.rows*sc)|0;

            jsfeat.imgproc.resample(lev0_img, lev_img, new_width, new_height);
            jsfeat.imgproc.gaussian_blur(lev_img, lev_img, options.blur_size|0);
            corners_num = detectKeypoints(lev_img, lev_corners, max_per_level);
            jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

            // fix the coordinates due to scale level
            for(i = 0; i < corners_num; ++i) {
                lev_corners[i].x *= 1./sc;
                lev_corners[i].y *= 1./sc;
            }

            console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

            sc /= sc_inc;
        }

        return output;
    }

    function loader() {
        return Promise.all([
            loadImageToCanvas('./assets/img1.png', 'img1'),
            loadImageToCanvas('./assets/img2.png', 'img2'),
            loadImageToCanvas('./assets/scene1_2.png', 'canvas')
        ]);
    }

    loader().then(function() {
        const frameData = getDataFromCanvas('canvas');
        const patternData = getDataFromCanvas('img1');

        console.log('patternData', patternData);
        console.log('frameData', frameData);

        const frameCalc = compute('canvas', 1);
        const patternCalc = compute('img1', 3);

        console.log('frameCalc', frameCalc);
        console.log('patternCalc', patternCalc);

        let frameBuffer = new Uint32Array(frameData.data.buffer);
        renderCorners(frameCalc.corners[0], frameCalc.corners_num, frameBuffer, frameData.width);
    });
});