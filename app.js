function CameraWorker() {
    'use strict';

    let photoMode = true;
    let cache = {};
    let patterns = [];
    let options = {
        blur_size: 2,
        lap_thres: 30,
        eigen_thres: 25,
        match_threshold: 48
    };
    let u_max = new Int32Array([15,15,15,15,14,14,14,13,13,12,11,10,9,8,6,3,0]);
    let onReady = false;

    const match_t = (function () {
        function match_t(screen_idx, pattern_lev, pattern_idx, distance) {
            this.screen_idx = (typeof screen_idx === "undefined") ? 0 : screen_idx;
            this.pattern_lev = (typeof pattern_lev === "undefined") ? 0 : pattern_lev;
            this.pattern_idx = (typeof pattern_idx === "undefined") ? 0 : pattern_idx;
            this.distance = (typeof distance === "undefined") ? 0 : distance;
        }
        return match_t;
    })();

    function cacheImageToCanvas(url, id, useCache) {
        return new Promise(function(resolve, reject) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                canvas.id = id;
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.original_width = img.width;
                canvas.original_height = img.height;

                ctx.drawImage(img, 0, 0, img.width, img.height);

                if (useCache) {
                    cache[id] = ctx;
                }

                return resolve(ctx);
            };
            img.src = url;
        });
    }

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

                return resolve(ctx);
            };
            img.src = url;
        });
    }

    function getDataFromContext(ctx, width, height) {
        return ctx.getImageData(0, 0, width, height);
    }

    function getDataFromCanvas(elementId) {
        const element = document.getElementById(elementId);
        const ctx = element.getContext('2d');

        const width = element.width;
        const height = element.height;

        return getDataFromContext(ctx, width, height);
    }

    function computePatternsFromCache() {
        return new Promise(function(resolve, reject) {
            for (let i in cache) {
                if (cache.hasOwnProperty(i)) {
                    patterns.push(train_pattern(cache[i]));
                }
            }

            console.log('cache', cache);
            console.log('patterns', patterns);

            return resolve();
        });
    }

    function loader() {
        return Promise.all([
            loadImageToCanvas('./assets/scene1.png', 'canvas'),
            cacheImageToCanvas('./assets/poster1_plain.png', 'img1', true),
            cacheImageToCanvas('./assets/poster2_plain.png', 'img2', true)
        ]);
    }

    loader()
        .then(function(loaded) {
            const ctx = loaded[0];
            demo_app(ctx);
            return computePatternsFromCache();
        })
        .then(function() {
            if (photoMode) {
                onReady = true;
                compatibility.requestAnimationFrame(tick);
            } else {
                playVideo().then(function() {
                    compatibility.requestAnimationFrame(tick);
                });
            }
        });

    function playVideo() {
        return new Promise(function(resolve, reject) {
            const canvas = document.getElementById('canvas');
            const video  = document.getElementById('video');
            const ctx = canvas.getContext("2d");

            video.addEventListener('play', () => {
                function step() {
                    onReady = true;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            });

            video.play();

            return resolve(true);
        });
    }

    // lets do some fun
    // var video = document.getElementById('webcam');
    // var canvas = document.getElementById('canvas');
    // try {
    //     var attempts = 0;
    //     var readyListener = function(event) {
    //         findVideoSize();
    //     };
    //     var findVideoSize = function() {
    //         if(video.videoWidth > 0 && video.videoHeight > 0) {
    //             video.removeEventListener('loadeddata', readyListener);
    //             onDimensionsReady(video.videoWidth, video.videoHeight);
    //         } else {
    //             if(attempts < 10) {
    //                 attempts++;
    //                 setTimeout(findVideoSize, 200);
    //             } else {
    //                 onDimensionsReady(640, 480);
    //             }
    //         }
    //     };
    //     var onDimensionsReady = function(width, height) {
    //         demo_app(width, height);
    //         compatibility.requestAnimationFrame(tick);
    //     };
    //
    //     video.addEventListener('loadeddata', readyListener);
    //
    //     compatibility.getUserMedia({video: true}, function(stream) {
    //         try {
    //             video.src = compatibility.URL.createObjectURL(stream);
    //         } catch (error) {
    //             video.src = stream;
    //         }
    //         setTimeout(function() {
    //             video.play();
    //         }, 500);
    //     }, function (error) {
    //         $('#canvas').hide();
    //         $('#log').hide();
    //         $('#no_rtc').html('<h4>WebRTC not available.</h4>');
    //         $('#no_rtc').show();
    //     });
    // } catch (error) {
    //     $('#canvas').hide();
    //     $('#log').hide();
    //     $('#no_rtc').html('<h4>Something goes wrong...</h4>');
    //     $('#no_rtc').show();
    // }

    let pattern_corners = [], pattern_descriptors = [], pattern_preview;
    let screen_corners, num_corners, screen_descriptors;

    let ctx, canvasWidth, canvasHeight;
    let matches, homo3x3, match_mask;
    let num_train_levels = 8;

    function train_pattern(ctx) {
        let output = {
            selector: ctx.canvas.id,
            pattern_preview: null,
            pattern_corners: [],
            pattern_descriptors: []
        };
        let imageData = getDataFromContext(ctx, ctx.canvas.width, ctx.canvas.height);
        let img_u8 = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, img_u8);

        var lev=0, i=0;
        var sc = 1.0;
        var max_pattern_size = 800;
        var max_per_level = 600;
        var sc_inc = Math.sqrt(2.0);
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
        pattern_preview = new jsfeat.matrix_t(new_width>>1, new_height>>1, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.pyrdown(lev0_img, pattern_preview);

        for(lev=0; lev < num_train_levels; ++lev) {
            output.pattern_corners[lev] = [];
            lev_corners = output.pattern_corners[lev];

            // preallocate corners array
            i = (new_width*new_height) >> lev;
            while(--i >= 0) {
                lev_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
            }

            output.pattern_descriptors[lev] = new jsfeat.matrix_t(32, max_per_level, jsfeat.U8_t | jsfeat.C1_t);
        }

        // do the first level
        lev_corners = output.pattern_corners[0];
        lev_descr = output.pattern_descriptors[0];

        jsfeat.imgproc.gaussian_blur(lev0_img, lev_img, options.blur_size | 0); // this is more robust
        corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
        jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

        console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

        sc /= sc_inc;

        // lets do multiple scale levels
        // we can use Canvas context draw method for faster resize
        // but its nice to demonstrate that you can do everything with jsfeat
        for(lev = 1; lev < num_train_levels; ++lev) {
            lev_corners = output.pattern_corners[lev];
            lev_descr = output.pattern_descriptors[lev];

            new_width = (lev0_img.cols*sc)|0;
            new_height = (lev0_img.rows*sc)|0;

            jsfeat.imgproc.resample(lev0_img, lev_img, new_width, new_height);
            jsfeat.imgproc.gaussian_blur(lev_img, lev_img, options.blur_size | 0);
            corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
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
    };

    function demo_app(frameCtx) {
        ctx = frameCtx;
        canvasWidth  = ctx.canvas.width;
        canvasHeight = ctx.canvas.height;

        ctx.fillStyle = "rgb(0,255,0)";
        ctx.strokeStyle = "rgb(0,255,0)";

        screen_descriptors = new jsfeat.matrix_t(32, 500, jsfeat.U8_t | jsfeat.C1_t);
        screen_corners = [];
        matches = [];

        console.log('canvasWidth', canvasWidth, canvasHeight);

        var i = canvasWidth * canvasHeight;
        while(--i >= 0) {
            screen_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
            matches[i] = new match_t();
        }

        // transform matrix
        homo3x3 = new jsfeat.matrix_t(3,3,jsfeat.F32C1_t);
        match_mask = new jsfeat.matrix_t(500,1,jsfeat.U8C1_t);
    }

    function tick() {
        if (!photoMode) compatibility.requestAnimationFrame(tick);
        if (!onReady) return false;

        let imageData = getDataFromCanvas('canvas');

        console.log('imageData', imageData);

        let w = imageData.width;
        let h = imageData.height;
        let img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
        let img_u8_smooth = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);

        jsfeat.imgproc.grayscale(imageData.data, w, h, img_u8);

        jsfeat.imgproc.gaussian_blur(img_u8, img_u8_smooth, options.blur_size | 0);

        jsfeat.yape06.laplacian_threshold = options.lap_thres | 0;
        jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres | 0;

        num_corners = detect_keypoints(img_u8_smooth, screen_corners, 500);

        jsfeat.orb.describe(img_u8_smooth, screen_corners, num_corners, screen_descriptors);

        // render result back to canvas
        // var data_u32 = new Uint32Array(imageData.data.buffer);
        // render_corners(screen_corners, num_corners, data_u32, w);

        if (patterns && patterns.length) {
            const markers = [];

            patterns.forEach(function(pattern) {
                var num_matches = 0;
                var good_matches = 0;
                if (pattern_preview) {
                    // render_mono_image(pattern_preview.data, data_u32, pattern_preview.cols, pattern_preview.rows, w);

                    console.log(pattern.pattern_descriptors);

                    num_matches = match_pattern(screen_descriptors, pattern.pattern_descriptors, matches);
                    good_matches = find_transform(matches, num_matches, screen_corners, pattern.pattern_corners);
                }

                // ctx.putImageData(imageData, 0, 0);
                // imageData = ctx.getImageData(0, 0, w, h);

                console.log('num_matches', num_matches);
                console.log('good_matches', good_matches);

                if (num_matches) {
                    // render_matches(ctx, matches, num_matches);

                    if (good_matches >= 4) {
                        markers.push(render_pattern_shape(ctx, pattern.selector));
                    }
                }
            });

            if (markers.length) {
                updateVisibleMarkers(markers);
            }
        }
    }

    function detect_keypoints(img, corners, max_allowed) {
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

    function find_transform(matches, count, screen_corners, pattern_corners) {
        // motion kernel
        var mm_kernel = new jsfeat.motion_model.homography2d();
        // ransac params
        var num_model_points = 4;
        var reproj_threshold = 3;
        var ransac_param = new jsfeat.ransac_params_t(num_model_points,
            reproj_threshold, 0.5, 0.99);

        var pattern_xy = [];
        var screen_xy = [];

        // construct correspondences
        for(var i = 0; i < count; ++i) {
            var m = matches[i];
            var s_kp = screen_corners[m.screen_idx];
            var p_kp = pattern_corners[m.pattern_lev][m.pattern_idx];
            pattern_xy[i] = {"x":p_kp.x, "y":p_kp.y};
            screen_xy[i] =  {"x":s_kp.x, "y":s_kp.y};
        }

        // estimate motion
        var ok = false;
        ok = jsfeat.motion_estimator.ransac(ransac_param, mm_kernel,
            pattern_xy, screen_xy, count, homo3x3, match_mask, 1000);

        // extract good matches and re-estimate
        var good_cnt = 0;
        if(ok) {
            for(var i=0; i < count; ++i) {
                if(match_mask.data[i]) {
                    pattern_xy[good_cnt].x = pattern_xy[i].x;
                    pattern_xy[good_cnt].y = pattern_xy[i].y;
                    screen_xy[good_cnt].x = screen_xy[i].x;
                    screen_xy[good_cnt].y = screen_xy[i].y;
                    good_cnt++;
                }
            }
            // run kernel directly with inliers only
            mm_kernel.run(pattern_xy, screen_xy, homo3x3, good_cnt);
        } else {
            jsfeat.matmath.identity_3x3(homo3x3, 1.0);
        }

        return good_cnt;
    }

    function popcnt32(n) {
        n -= ((n >> 1) & 0x55555555);
        n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
        return (((n + (n >> 4))& 0xF0F0F0F)* 0x1010101) >> 24;
    }

    function match_pattern(screen_descriptors, pattern_descriptors, matches) {
        var q_cnt = screen_descriptors.rows;
        var query_du8 = screen_descriptors.data;
        var query_u32 = screen_descriptors.buffer.i32; // cast to integer buffer
        var qd_off = 0;
        var qidx=0,lev=0,pidx=0,k=0;
        var num_matches = 0;

        for(qidx = 0; qidx < q_cnt; ++qidx) {
            var best_dist = 256;
            var best_dist2 = 256;
            var best_idx = -1;
            var best_lev = -1;

            for(lev = 0; lev < num_train_levels; ++lev) {
                var lev_descr = pattern_descriptors[lev];
                var ld_cnt = lev_descr.rows;
                var ld_i32 = lev_descr.buffer.i32; // cast to integer buffer
                var ld_off = 0;

                for(pidx = 0; pidx < ld_cnt; ++pidx) {

                    var curr_d = 0;
                    // our descriptor is 32 bytes so we have 8 Integers
                    for(k=0; k < 8; ++k) {
                        curr_d += popcnt32( query_u32[qd_off+k]^ld_i32[ld_off+k] );
                    }

                    if(curr_d < best_dist) {
                        best_dist2 = best_dist;
                        best_dist = curr_d;
                        best_lev = lev;
                        best_idx = pidx;
                    } else if(curr_d < best_dist2) {
                        best_dist2 = curr_d;
                    }

                    ld_off += 8; // next descriptor
                }
            }

            // filter out by some threshold
            if(best_dist < options.match_threshold) {
                matches[num_matches].screen_idx = qidx;
                matches[num_matches].pattern_lev = best_lev;
                matches[num_matches].pattern_idx = best_idx;
                num_matches++;
            }
            //

            /* filter using the ratio between 2 closest matches
            if(best_dist < 0.8*best_dist2) {
                matches[num_matches].screen_idx = qidx;
                matches[num_matches].pattern_lev = best_lev;
                matches[num_matches].pattern_idx = best_idx;
                num_matches++;
            }
            */

            qd_off += 8; // next query descriptor
        }

        return num_matches;
    }

    function tCorners(M, w, h) {
        var pt = [ {'x':0,'y':0}, {'x':w,'y':0}, {'x':w,'y':h}, {'x':0,'y':h} ];
        var z=0.0, i=0, px=0.0, py=0.0;

        for (; i < 4; ++i) {
            px = M[0]*pt[i].x + M[1]*pt[i].y + M[2];
            py = M[3]*pt[i].x + M[4]*pt[i].y + M[5];
            z = M[6]*pt[i].x + M[7]*pt[i].y + M[8];
            pt[i].x = px/z;
            pt[i].y = py/z;
        }

        return pt;
    }

    function render_matches(ctx, matches, count) {

        for(var i = 0; i < count; ++i) {
            var m = matches[i];
            var s_kp = screen_corners[m.screen_idx];
            var p_kp = pattern_corners[m.pattern_lev][m.pattern_idx];
            if(match_mask.data[i]) {
                ctx.strokeStyle = "rgb(0,255,0)";
            } else {
                ctx.strokeStyle = "rgb(255,0,0)";
            }
            ctx.beginPath();
            ctx.moveTo(s_kp.x,s_kp.y);
            ctx.lineTo(p_kp.x*0.5, p_kp.y*0.5); // our preview is downscaled
            ctx.lineWidth=1;
            ctx.stroke();
        }
    }

    function render_pattern_shape(ctx, id) {
        const shape_pts = tCorners(homo3x3.data, pattern_preview.cols*2, pattern_preview.rows*2);
        const region = new Region(shape_pts);
        const center = region.centroid();

        console.log('FOUND', center.x, center.y, id);

        const ratioX = ctx.canvas.clientWidth / ctx.canvas.width;
        const ratioY = ctx.canvas.clientHeight / ctx.canvas.height;

        // clearDirty();
        // addTestPoint(center.x * ratioX, center.y * ratioY, id);
        // addVisiblePoster(id, center.x * ratioX, center.y * ratioY);

        return { id: id, x: center.x * ratioX, y: center.y * ratioY };

        // ctx.strokeStyle = "rgb(0,255,0)";
        // ctx.beginPath();
        //
        // const region = new Region(shape_pts);
        // const center = region.centroid();
        //
        // ctx.arc(center.x, center.y, 15, 0, 2 * Math.PI, false);
        //
        // ctx.fillStyle = "rgb(0,255,0)";
        // ctx.fill();
    }

    function render_corners(corners, count, img, step) {
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

    function render_mono_image(src, dst, sw, sh, dw) {
        var alpha = (0xff << 24);
        for(var i = 0; i < sh; ++i) {
            for(var j = 0; j < sw; ++j) {
                var pix = src[i*sw+j];
                dst[i*dw+j] = alpha | (pix << 16) | (pix << 8) | pix;
            }
        }
    }
}

// $(document).ready(function() {
//     "use strict";
//
//     let photoMode = true;
//     let cache = {};
//     let patterns = [];
//     let options = {
//         blur_size: 2,
//         lap_thres: 30,
//         eigen_thres: 25,
//         match_threshold: 48
//     };
//     let u_max = new Int32Array([15,15,15,15,14,14,14,13,13,12,11,10,9,8,6,3,0]);
//     let onReady = false;
//
//     const match_t = (function () {
//         function match_t(screen_idx, pattern_lev, pattern_idx, distance) {
//             this.screen_idx = (typeof screen_idx === "undefined") ? 0 : screen_idx;
//             this.pattern_lev = (typeof pattern_lev === "undefined") ? 0 : pattern_lev;
//             this.pattern_idx = (typeof pattern_idx === "undefined") ? 0 : pattern_idx;
//             this.distance = (typeof distance === "undefined") ? 0 : distance;
//         }
//         return match_t;
//     })();
//
//     function cacheImageToCanvas(url, id, useCache) {
//         return new Promise(function(resolve, reject) {
//             const canvas = document.createElement('canvas');
//             const ctx = canvas.getContext('2d');
//
//             let img = new Image();
//             img.crossOrigin = 'anonymous';
//             img.onload = function() {
//                 canvas.id = id;
//                 canvas.width = img.width;
//                 canvas.height = img.height;
//                 canvas.original_width = img.width;
//                 canvas.original_height = img.height;
//
//                 ctx.drawImage(img, 0, 0, img.width, img.height);
//
//                 if (useCache) {
//                     cache[id] = ctx;
//                 }
//
//                 return resolve(ctx);
//             };
//             img.src = url;
//         });
//     }
//
//     function loadImageToCanvas(url, elementId) {
//         return new Promise(function(resolve, reject) {
//             let canvas = document.getElementById(elementId);
//             let ctx = canvas.getContext('2d');
//             let img = new Image();
//             img.crossOrigin = 'anonymous';
//             img.onload = function() {
//                 canvas.width = img.width;
//                 canvas.height = img.height;
//                 canvas.original_width = img.width;
//                 canvas.original_height = img.height;
//
//                 ctx.drawImage(img, 0, 0, img.width, img.height);
//
//                 return resolve(ctx);
//             };
//             img.src = url;
//         });
//     }
//
//     function getDataFromContext(ctx, width, height) {
//         return ctx.getImageData(0, 0, width, height);
//     }
//
//     function getDataFromCanvas(elementId) {
//         const element = document.getElementById(elementId);
//         const ctx = element.getContext('2d');
//
//         const width = element.width;
//         const height = element.height;
//
//         return getDataFromContext(ctx, width, height);
//     }
//
//     function computePatternsFromCache() {
//         return new Promise(function(resolve, reject) {
//             for (let i in cache) {
//                 if (cache.hasOwnProperty(i)) {
//                     patterns.push(train_pattern(cache[i]));
//                 }
//             }
//
//             console.log('cache', cache);
//             console.log('patterns', patterns);
//
//             return resolve();
//         });
//     }
//
//     function loader() {
//         return Promise.all([
//             loadImageToCanvas('./assets/scene1.png', 'canvas'),
//             cacheImageToCanvas('./assets/poster1_plain.png', 'img1', true),
//             cacheImageToCanvas('./assets/poster2_plain.png', 'img2', true)
//         ]);
//     }
//
//     loader().then(function(loaded) {
//         const ctx = loaded[0];
//         demo_app(ctx);
//         return computePatternsFromCache();
//     }).then(function() {
//         if (photoMode) {
//             onReady = true;
//             compatibility.requestAnimationFrame(tick);
//         } else {
//             playVideo().then(function() {
//                 compatibility.requestAnimationFrame(tick);
//             });
//         }
//     });
//
//     function playVideo() {
//         return new Promise(function(resolve, reject) {
//             const canvas = document.getElementById('canvas');
//             const video  = document.getElementById('video');
//             const ctx = canvas.getContext("2d");
//
//             video.addEventListener('play', () => {
//                 function step() {
//                     onReady = true;
//                     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//                     requestAnimationFrame(step);
//                 }
//                 requestAnimationFrame(step);
//             });
//
//             video.play();
//
//             return resolve(true);
//         });
//     }
//
//     // lets do some fun
//     // var video = document.getElementById('webcam');
//     // var canvas = document.getElementById('canvas');
//     // try {
//     //     var attempts = 0;
//     //     var readyListener = function(event) {
//     //         findVideoSize();
//     //     };
//     //     var findVideoSize = function() {
//     //         if(video.videoWidth > 0 && video.videoHeight > 0) {
//     //             video.removeEventListener('loadeddata', readyListener);
//     //             onDimensionsReady(video.videoWidth, video.videoHeight);
//     //         } else {
//     //             if(attempts < 10) {
//     //                 attempts++;
//     //                 setTimeout(findVideoSize, 200);
//     //             } else {
//     //                 onDimensionsReady(640, 480);
//     //             }
//     //         }
//     //     };
//     //     var onDimensionsReady = function(width, height) {
//     //         demo_app(width, height);
//     //         compatibility.requestAnimationFrame(tick);
//     //     };
//     //
//     //     video.addEventListener('loadeddata', readyListener);
//     //
//     //     compatibility.getUserMedia({video: true}, function(stream) {
//     //         try {
//     //             video.src = compatibility.URL.createObjectURL(stream);
//     //         } catch (error) {
//     //             video.src = stream;
//     //         }
//     //         setTimeout(function() {
//     //             video.play();
//     //         }, 500);
//     //     }, function (error) {
//     //         $('#canvas').hide();
//     //         $('#log').hide();
//     //         $('#no_rtc').html('<h4>WebRTC not available.</h4>');
//     //         $('#no_rtc').show();
//     //     });
//     // } catch (error) {
//     //     $('#canvas').hide();
//     //     $('#log').hide();
//     //     $('#no_rtc').html('<h4>Something goes wrong...</h4>');
//     //     $('#no_rtc').show();
//     // }
//
//     let pattern_corners = [], pattern_descriptors = [], pattern_preview;
//     let screen_corners, num_corners, screen_descriptors;
//
//     let ctx, canvasWidth, canvasHeight;
//     let matches, homo3x3, match_mask;
//     let num_train_levels = 8;
//
//     function train_pattern(ctx) {
//         let output = {
//             selector: ctx.canvas.id,
//             pattern_preview: null,
//             pattern_corners: [],
//             pattern_descriptors: []
//         };
//         let imageData = getDataFromContext(ctx, ctx.canvas.width, ctx.canvas.height);
//         let img_u8 = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
//         jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, img_u8);
//
//         var lev=0, i=0;
//         var sc = 1.0;
//         var max_pattern_size = 800;
//         var max_per_level = 600;
//         var sc_inc = Math.sqrt(2.0);
//         var lev0_img = new jsfeat.matrix_t(img_u8.cols, img_u8.rows, jsfeat.U8_t | jsfeat.C1_t);
//         var lev_img = new jsfeat.matrix_t(img_u8.cols, img_u8.rows, jsfeat.U8_t | jsfeat.C1_t);
//         var new_width=0, new_height=0;
//         var lev_corners, lev_descr;
//         var corners_num=0;
//
//         var sc0 = Math.min(max_pattern_size/img_u8.cols, max_pattern_size/img_u8.rows);
//         new_width = (img_u8.cols*sc0)|0;
//         new_height = (img_u8.rows*sc0)|0;
//
//         jsfeat.imgproc.resample(img_u8, lev0_img, new_width, new_height);
//
//         // prepare preview
//         pattern_preview = new jsfeat.matrix_t(new_width>>1, new_height>>1, jsfeat.U8_t | jsfeat.C1_t);
//         jsfeat.imgproc.pyrdown(lev0_img, pattern_preview);
//
//         for(lev=0; lev < num_train_levels; ++lev) {
//             output.pattern_corners[lev] = [];
//             lev_corners = output.pattern_corners[lev];
//
//             // preallocate corners array
//             i = (new_width*new_height) >> lev;
//             while(--i >= 0) {
//                 lev_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
//             }
//
//             output.pattern_descriptors[lev] = new jsfeat.matrix_t(32, max_per_level, jsfeat.U8_t | jsfeat.C1_t);
//         }
//
//         // do the first level
//         lev_corners = output.pattern_corners[0];
//         lev_descr = output.pattern_descriptors[0];
//
//         jsfeat.imgproc.gaussian_blur(lev0_img, lev_img, options.blur_size | 0); // this is more robust
//         corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
//         jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);
//
//         console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);
//
//         sc /= sc_inc;
//
//         // lets do multiple scale levels
//         // we can use Canvas context draw method for faster resize
//         // but its nice to demonstrate that you can do everything with jsfeat
//         for(lev = 1; lev < num_train_levels; ++lev) {
//             lev_corners = output.pattern_corners[lev];
//             lev_descr = output.pattern_descriptors[lev];
//
//             new_width = (lev0_img.cols*sc)|0;
//             new_height = (lev0_img.rows*sc)|0;
//
//             jsfeat.imgproc.resample(lev0_img, lev_img, new_width, new_height);
//             jsfeat.imgproc.gaussian_blur(lev_img, lev_img, options.blur_size | 0);
//             corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
//             jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);
//
//             // fix the coordinates due to scale level
//             for(i = 0; i < corners_num; ++i) {
//                 lev_corners[i].x *= 1./sc;
//                 lev_corners[i].y *= 1./sc;
//             }
//
//             console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);
//
//             sc /= sc_inc;
//         }
//
//         return output;
//     };
//
//     function demo_app(frameCtx) {
//         ctx = frameCtx;
//         canvasWidth  = ctx.canvas.width;
//         canvasHeight = ctx.canvas.height;
//
//         ctx.fillStyle = "rgb(0,255,0)";
//         ctx.strokeStyle = "rgb(0,255,0)";
//
//         screen_descriptors = new jsfeat.matrix_t(32, 500, jsfeat.U8_t | jsfeat.C1_t);
//         screen_corners = [];
//         matches = [];
//
//         console.log('canvasWidth', canvasWidth, canvasHeight);
//
//         var i = canvasWidth * canvasHeight;
//         while(--i >= 0) {
//             screen_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
//             matches[i] = new match_t();
//         }
//
//         // transform matrix
//         homo3x3 = new jsfeat.matrix_t(3,3,jsfeat.F32C1_t);
//         match_mask = new jsfeat.matrix_t(500,1,jsfeat.U8C1_t);
//     }
//
//     function tick() {
//         compatibility.requestAnimationFrame(tick);
//
//         if (!onReady) return false;
//
//         let imageData = getDataFromCanvas('canvas');
//
//         console.log('imageData', imageData);
//
//         let w = imageData.width;
//         let h = imageData.height;
//         let img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
//         let img_u8_smooth = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
//
//         jsfeat.imgproc.grayscale(imageData.data, w, h, img_u8);
//
//         jsfeat.imgproc.gaussian_blur(img_u8, img_u8_smooth, options.blur_size | 0);
//
//         jsfeat.yape06.laplacian_threshold = options.lap_thres | 0;
//         jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres | 0;
//
//         num_corners = detect_keypoints(img_u8_smooth, screen_corners, 500);
//
//         jsfeat.orb.describe(img_u8_smooth, screen_corners, num_corners, screen_descriptors);
//
//         // render result back to canvas
//         // var data_u32 = new Uint32Array(imageData.data.buffer);
//         // render_corners(screen_corners, num_corners, data_u32, w);
//
//         if (patterns && patterns.length) {
//             const markers = [];
//
//             patterns.forEach(function(pattern) {
//                 var num_matches = 0;
//                 var good_matches = 0;
//                 if (pattern_preview) {
//                     // render_mono_image(pattern_preview.data, data_u32, pattern_preview.cols, pattern_preview.rows, w);
//
//                     console.log(pattern.pattern_descriptors);
//
//                     num_matches = match_pattern(screen_descriptors, pattern.pattern_descriptors, matches);
//                     good_matches = find_transform(matches, num_matches, screen_corners, pattern.pattern_corners);
//                 }
//
//                 // ctx.putImageData(imageData, 0, 0);
//                 // imageData = ctx.getImageData(0, 0, w, h);
//
//                 console.log('num_matches', num_matches);
//                 console.log('good_matches', good_matches);
//
//                 if (num_matches) {
//                     // render_matches(ctx, matches, num_matches);
//
//                     if (good_matches >= 4) {
//                         markers.push(render_pattern_shape(ctx, pattern.selector));
//                     }
//                 }
//             });
//
//             if (markers.length) {
//                 updateVisibleMarkers(markers);
//             }
//         }
//     }
//
//     function detect_keypoints(img, corners, max_allowed) {
//         // detect features
//         var count = jsfeat.yape06.detect(img, corners, 17);
//
//         // sort by score and reduce the count if needed
//         if(count > max_allowed) {
//             jsfeat.math.qsort(corners, 0, count-1, function(a,b){return (b.score<a.score);});
//             count = max_allowed;
//         }
//
//         // calculate dominant orientation for each keypoint
//         for(var i = 0; i < count; ++i) {
//             corners[i].angle = ic_angle(img, corners[i].x, corners[i].y);
//         }
//
//         return count;
//     }
//
//     function ic_angle(img, px, py) {
//         var half_k = 15; // half patch size
//         var m_01 = 0, m_10 = 0;
//         var src=img.data, step=img.cols;
//         var u=0, v=0, center_off=(py*step + px)|0;
//         var v_sum=0,d=0,val_plus=0,val_minus=0;
//
//         // Treat the center line differently, v=0
//         for (u = -half_k; u <= half_k; ++u)
//             m_10 += u * src[center_off+u];
//
//         // Go line by line in the circular patch
//         for (v = 1; v <= half_k; ++v) {
//             // Proceed over the two lines
//             v_sum = 0;
//             d = u_max[v];
//             for (u = -d; u <= d; ++u) {
//                 val_plus = src[center_off+u+v*step];
//                 val_minus = src[center_off+u-v*step];
//                 v_sum += (val_plus - val_minus);
//                 m_10 += u * (val_plus + val_minus);
//             }
//             m_01 += v * v_sum;
//         }
//
//         return Math.atan2(m_01, m_10);
//     }
//
//     function find_transform(matches, count, screen_corners, pattern_corners) {
//         // motion kernel
//         var mm_kernel = new jsfeat.motion_model.homography2d();
//         // ransac params
//         var num_model_points = 4;
//         var reproj_threshold = 3;
//         var ransac_param = new jsfeat.ransac_params_t(num_model_points,
//             reproj_threshold, 0.5, 0.99);
//
//         var pattern_xy = [];
//         var screen_xy = [];
//
//         // construct correspondences
//         for(var i = 0; i < count; ++i) {
//             var m = matches[i];
//             var s_kp = screen_corners[m.screen_idx];
//             var p_kp = pattern_corners[m.pattern_lev][m.pattern_idx];
//             pattern_xy[i] = {"x":p_kp.x, "y":p_kp.y};
//             screen_xy[i] =  {"x":s_kp.x, "y":s_kp.y};
//         }
//
//         // estimate motion
//         var ok = false;
//         ok = jsfeat.motion_estimator.ransac(ransac_param, mm_kernel,
//             pattern_xy, screen_xy, count, homo3x3, match_mask, 1000);
//
//         // extract good matches and re-estimate
//         var good_cnt = 0;
//         if(ok) {
//             for(var i=0; i < count; ++i) {
//                 if(match_mask.data[i]) {
//                     pattern_xy[good_cnt].x = pattern_xy[i].x;
//                     pattern_xy[good_cnt].y = pattern_xy[i].y;
//                     screen_xy[good_cnt].x = screen_xy[i].x;
//                     screen_xy[good_cnt].y = screen_xy[i].y;
//                     good_cnt++;
//                 }
//             }
//             // run kernel directly with inliers only
//             mm_kernel.run(pattern_xy, screen_xy, homo3x3, good_cnt);
//         } else {
//             jsfeat.matmath.identity_3x3(homo3x3, 1.0);
//         }
//
//         return good_cnt;
//     }
//
//     function popcnt32(n) {
//         n -= ((n >> 1) & 0x55555555);
//         n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
//         return (((n + (n >> 4))& 0xF0F0F0F)* 0x1010101) >> 24;
//     }
//
//     function match_pattern(screen_descriptors, pattern_descriptors, matches) {
//         var q_cnt = screen_descriptors.rows;
//         var query_du8 = screen_descriptors.data;
//         var query_u32 = screen_descriptors.buffer.i32; // cast to integer buffer
//         var qd_off = 0;
//         var qidx=0,lev=0,pidx=0,k=0;
//         var num_matches = 0;
//
//         for(qidx = 0; qidx < q_cnt; ++qidx) {
//             var best_dist = 256;
//             var best_dist2 = 256;
//             var best_idx = -1;
//             var best_lev = -1;
//
//             for(lev = 0; lev < num_train_levels; ++lev) {
//                 var lev_descr = pattern_descriptors[lev];
//                 var ld_cnt = lev_descr.rows;
//                 var ld_i32 = lev_descr.buffer.i32; // cast to integer buffer
//                 var ld_off = 0;
//
//                 for(pidx = 0; pidx < ld_cnt; ++pidx) {
//
//                     var curr_d = 0;
//                     // our descriptor is 32 bytes so we have 8 Integers
//                     for(k=0; k < 8; ++k) {
//                         curr_d += popcnt32( query_u32[qd_off+k]^ld_i32[ld_off+k] );
//                     }
//
//                     if(curr_d < best_dist) {
//                         best_dist2 = best_dist;
//                         best_dist = curr_d;
//                         best_lev = lev;
//                         best_idx = pidx;
//                     } else if(curr_d < best_dist2) {
//                         best_dist2 = curr_d;
//                     }
//
//                     ld_off += 8; // next descriptor
//                 }
//             }
//
//             // filter out by some threshold
//             if(best_dist < options.match_threshold) {
//                 matches[num_matches].screen_idx = qidx;
//                 matches[num_matches].pattern_lev = best_lev;
//                 matches[num_matches].pattern_idx = best_idx;
//                 num_matches++;
//             }
//             //
//
//             /* filter using the ratio between 2 closest matches
//             if(best_dist < 0.8*best_dist2) {
//                 matches[num_matches].screen_idx = qidx;
//                 matches[num_matches].pattern_lev = best_lev;
//                 matches[num_matches].pattern_idx = best_idx;
//                 num_matches++;
//             }
//             */
//
//             qd_off += 8; // next query descriptor
//         }
//
//         return num_matches;
//     }
//
//     function tCorners(M, w, h) {
//         var pt = [ {'x':0,'y':0}, {'x':w,'y':0}, {'x':w,'y':h}, {'x':0,'y':h} ];
//         var z=0.0, i=0, px=0.0, py=0.0;
//
//         for (; i < 4; ++i) {
//             px = M[0]*pt[i].x + M[1]*pt[i].y + M[2];
//             py = M[3]*pt[i].x + M[4]*pt[i].y + M[5];
//             z = M[6]*pt[i].x + M[7]*pt[i].y + M[8];
//             pt[i].x = px/z;
//             pt[i].y = py/z;
//         }
//
//         return pt;
//     }
//
//     function render_matches(ctx, matches, count) {
//
//         for(var i = 0; i < count; ++i) {
//             var m = matches[i];
//             var s_kp = screen_corners[m.screen_idx];
//             var p_kp = pattern_corners[m.pattern_lev][m.pattern_idx];
//             if(match_mask.data[i]) {
//                 ctx.strokeStyle = "rgb(0,255,0)";
//             } else {
//                 ctx.strokeStyle = "rgb(255,0,0)";
//             }
//             ctx.beginPath();
//             ctx.moveTo(s_kp.x,s_kp.y);
//             ctx.lineTo(p_kp.x*0.5, p_kp.y*0.5); // our preview is downscaled
//             ctx.lineWidth=1;
//             ctx.stroke();
//         }
//     }
//
//     function render_pattern_shape(ctx, id) {
//         const shape_pts = tCorners(homo3x3.data, pattern_preview.cols*2, pattern_preview.rows*2);
//         const region = new Region(shape_pts);
//         const center = region.centroid();
//
//         console.log('FOUND', center.x, center.y, id);
//
//         const ratioX = ctx.canvas.clientWidth / ctx.canvas.width;
//         const ratioY = ctx.canvas.clientHeight / ctx.canvas.height;
//
//         // clearDirty();
//         // addTestPoint(center.x * ratioX, center.y * ratioY, id);
//         // addVisiblePoster(id, center.x * ratioX, center.y * ratioY);
//
//         return { id: id, x: center.x * ratioX, y: center.y * ratioY };
//
//         // ctx.strokeStyle = "rgb(0,255,0)";
//         // ctx.beginPath();
//         //
//         // const region = new Region(shape_pts);
//         // const center = region.centroid();
//         //
//         // ctx.arc(center.x, center.y, 15, 0, 2 * Math.PI, false);
//         //
//         // ctx.fillStyle = "rgb(0,255,0)";
//         // ctx.fill();
//     }
//
//     function render_corners(corners, count, img, step) {
//         var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
//         for(var i=0; i < count; ++i)
//         {
//             var x = corners[i].x;
//             var y = corners[i].y;
//             var off = (x + y * step);
//             img[off] = pix;
//             img[off-1] = pix;
//             img[off+1] = pix;
//             img[off-step] = pix;
//             img[off+step] = pix;
//         }
//     }
//
//     function render_mono_image(src, dst, sw, sh, dw) {
//         var alpha = (0xff << 24);
//         for(var i = 0; i < sh; ++i) {
//             for(var j = 0; j < sw; ++j) {
//                 var pix = src[i*sw+j];
//                 dst[i*dw+j] = alpha | (pix << 16) | (pix << 8) | pix;
//             }
//         }
//     }
// });