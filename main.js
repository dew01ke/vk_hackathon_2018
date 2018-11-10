$(document).ready(function() {
    "use strict";

    let options = {};
    let levels = 3;
    let u_max = new Int32Array([15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3, 0]);

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

        // let img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
        // jsfeat.imgproc.grayscale(imageData.data, width, height, img_u8);

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

    function computePattern(elementId) {
        const output = {
            image: null,
            descriptors: [],
            corners: []
        };
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
        corners_num = detectKeypoints(lev_img, lev_corners, max_per_level);
        jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

        console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

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

    function computeFrame(elementId) {
        let output = {
            image: null,
            descriptor: [],
            corners: []
        };

        let imageData = getDataFromCanvas(elementId);
        let img_u8 = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
        let img_u8_smooth = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);

        jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, img_u8);
        jsfeat.imgproc.gaussian_blur(img_u8, img_u8_smooth, options.blur_size | 0);

        jsfeat.yape06.laplacian_threshold = options.lap_thres | 0;
        jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres | 0;

        let num_corners = detectKeypoints(img_u8_smooth, output.corners, 500);

        jsfeat.orb.describe(img_u8_smooth, output.corners, num_corners, output.descriptor);

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

        const frameCalc = computePattern('canvas');
        const patternCalc = computePattern('img1');

        console.log('frameCalc', frameCalc);
        console.log('patternCalc', patternCalc);
    });
});