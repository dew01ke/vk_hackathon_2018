function CameraWorker() {
    'use strict';

    let mode = {
        photo: true,
        video: false,
        webcam: false
    };
    let isPlaying = false;

    let cache = {};
    let patterns = [];
    let options = {
        blur_size: 4,
        lap_thres: 30,
        eigen_thres: 25,
        match_threshold: 48
    };
    let u_max = new Int32Array([15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3, 0]);
    let pattern_preview;
    let screen_corners, num_corners, screen_descriptors;

    let ctx;
    let matches, homo3x3, match_mask;
    let num_train_levels = 6;
    let canvas = document.getElementById('canvas');
    let stream = document.getElementById('stream');
    let seq = 0;

    const match_t = (function () {
        function match_t(screen_idx, pattern_lev, pattern_idx, distance) {
            this.screen_idx = (typeof screen_idx === "undefined") ? 0 : screen_idx;
            this.pattern_lev = (typeof pattern_lev === "undefined") ? 0 : pattern_lev;
            this.pattern_idx = (typeof pattern_idx === "undefined") ? 0 : pattern_idx;
            this.distance = (typeof distance === "undefined") ? 0 : distance;
        }
        return match_t;
    })();

    function initModeFromURL() {
        const url = location.href;

        if (/video/.test(url)) {
            setMode('video');
        } else if (/photo/.test(url)) {
            setMode('photo');
        } else if (/webcam/.test(url)) {
            setMode('webcam');
        }
    }

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
                    patterns.push(computePattern(cache[i]));
                }
            }

            console.log('cache', cache);
            console.log('patterns', patterns);

            return resolve();
        });
    }

    function setMode(type) {
        for (let key in mode) {
            mode[key] = (type === key);
        }
    }

    function loader(resources, options) {
        const toLoad = [];

        if (options) {
            if (options.mode) {
                setMode(options.mode);
            }
        }

        initModeFromURL();

        if (mode.photo) {
            toLoad.push(loadImageToCanvas('./assets/scene1.png', 'canvas'));
        }

        if (resources && resources.length) {
            resources.forEach(function(resource) {
                toLoad.push(cacheImageToCanvas(resource.url, resource.id, true));
            });
        }

        return Promise.all(toLoad);
    }

    this.load = function(resources, options) {
        return loader(resources, options)
            .then(function(loaded) {
                console.log('mode', mode);

                if (mode.photo) {
                    init(loaded[0].canvas.width, loaded[0].canvas.height, loaded[0]);
                }

                return computePatternsFromCache();
            })
            .then(function() {
                if (mode.photo) {
                    compatibility.requestAnimationFrame(process);
                } else if (mode.video) {
                    startVideoSource();
                } else if (mode.webcam) {
                    startVideoSource();
                }

                return Promise.resolve(true);
            });
    };

    function startVideoSource() {
        return new Promise(function() {
            try {
                var attempts = 0;
                var readyListener = function(event) {
                    findVideoSize();
                };
                var findVideoSize = function() {
                    if(stream.videoWidth > 0 && stream.videoHeight > 0) {
                        stream.removeEventListener('loadeddata', readyListener);
                        onDimensionsReady(stream.videoWidth, stream.videoHeight);
                    } else {
                        if(attempts < 10) {
                            attempts++;
                            setTimeout(findVideoSize, 200);
                        } else {
                            console.log('error att > 10');
                        }
                    }
                };
                var onDimensionsReady = function(w, h) {
                    init(w, h);
                    compatibility.requestAnimationFrame(process);
                };

                stream.addEventListener('loadeddata', readyListener);

                stream.addEventListener('play', function() {
                    isPlaying = true;
                });

                stream.addEventListener('pause', function() {
                    isPlaying = false;
                });

                stream.addEventListener('stop', function() {
                    isPlaying = false;
                });

                if (mode.webcam) {
                    compatibility.getUserMedia({ video: true, audio: false, facingMode: 'environment' }, function(videoStream) {
                        stream.srcObject = videoStream;

                        setTimeout(function() {
                            stream.play();
                        }, 500);
                    }, function(err) {
                        console.log(err);
                    });
                } else if (mode.video) {
                    stream.src = './assets/video3.mp4';

                    setTimeout(function() {
                        stream.play();
                    }, 500);
                }
            } catch(err) {
                console.log(err);
            }
        });
    }

    function computePattern(ctx) {
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
        var sc_inc = Math.sqrt(2);
        var lev0_img = new jsfeat.matrix_t(img_u8.cols, img_u8.rows, jsfeat.U8_t | jsfeat.C1_t);
        var lev_img = new jsfeat.matrix_t(img_u8.cols, img_u8.rows, jsfeat.U8_t | jsfeat.C1_t);
        var new_width=0, new_height=0;
        var lev_corners, lev_descr;
        var corners_num=0;

        var sc0 = Math.min(max_pattern_size/img_u8.cols, max_pattern_size/img_u8.rows);
        new_width = (img_u8.cols*sc0)|0;
        new_height = (img_u8.rows*sc0)|0;

        jsfeat.imgproc.resample(img_u8, lev0_img, new_width, new_height);

        pattern_preview = new jsfeat.matrix_t(new_width>>1, new_height>>1, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.pyrdown(lev0_img, pattern_preview);

        for(lev=0; lev < num_train_levels; ++lev) {
            output.pattern_corners[lev] = [];
            lev_corners = output.pattern_corners[lev];

            i = (new_width*new_height) >> lev;
            while(--i >= 0) {
                lev_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
            }

            output.pattern_descriptors[lev] = new jsfeat.matrix_t(32, max_per_level, jsfeat.U8_t | jsfeat.C1_t);
        }

        lev_corners = output.pattern_corners[0];
        lev_descr = output.pattern_descriptors[0];

        jsfeat.imgproc.gaussian_blur(lev0_img, lev_img, options.blur_size | 0);
        corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
        jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

        console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

        sc /= sc_inc;

        for(lev = 1; lev < num_train_levels; ++lev) {
            lev_corners = output.pattern_corners[lev];
            lev_descr = output.pattern_descriptors[lev];

            new_width = (lev0_img.cols*sc)|0;
            new_height = (lev0_img.rows*sc)|0;

            jsfeat.imgproc.resample(lev0_img, lev_img, new_width, new_height);
            jsfeat.imgproc.gaussian_blur(lev_img, lev_img, options.blur_size | 0);
            corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
            jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

            for(i = 0; i < corners_num; ++i) {
                lev_corners[i].x *= 1./sc;
                lev_corners[i].y *= 1./sc;
            }

            console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

            sc /= sc_inc;
        }

        return output;
    }

    function init(w, h, context) {
        canvas.w = w;
        canvas.h = h;

        if (context) {
            ctx = context;
        } else {
            canvas.width = w;
            canvas.height = h;

            ctx = canvas.getContext('2d');
        }

        // ugly mod: on
        $('#video').css({
            width: w + 'px',
            height: h + 'px',
        });
        // ugly mod: off

        ctx.fillStyle = "rgb(0,255,0)";
        ctx.strokeStyle = "rgb(0,255,0)";

        screen_descriptors = new jsfeat.matrix_t(32, 500, jsfeat.U8_t | jsfeat.C1_t);
        screen_corners = [];
        matches = [];

        console.log('w,h =', w, h);

        var i = w * h;
        while(--i >= 0) {
            screen_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
            matches[i] = new match_t();
        }

        homo3x3 = new jsfeat.matrix_t(3,3,jsfeat.F32C1_t);
        match_mask = new jsfeat.matrix_t(500,1,jsfeat.U8C1_t);
    }

    function process() {
        let imageData;

        if (mode.photo) {
            imageData = getDataFromCanvas('canvas');
        } else if (mode.webcam || mode.video) {
            compatibility.requestAnimationFrame(process);
            ctx.drawImage(stream, 0, 0, canvas.w, canvas.h);
        }

        if (mode.video || mode.webcam) {
            seq++;
            if (seq === 10) {
                seq = 0;
            } else {
                return;
            }

            if (!isPlaying) {
                return false;
            }
        }

        if (mode.webcam || mode.video) {
            imageData = ctx.getImageData(0, 0, canvas.w, canvas.h);
        }

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

        if (patterns && patterns.length) {
            const markers = [];

            patterns.forEach(function(pattern) {
                var num_matches = 0;
                var good_matches = 0;
                if (pattern_preview) {
                    num_matches = getMatches(screen_descriptors, pattern.pattern_descriptors, matches);
                    good_matches = findHomography(matches, num_matches, screen_corners, pattern.pattern_corners);
                }

                console.log('num_matches', num_matches);
                console.log('good_matches', good_matches);

                if (num_matches) {
                    if (good_matches >= 8) {
                        const markerObject = findCenter(ctx, pattern.selector);

                        if (markerObject.x > 0 && markerObject.y > 0) {
                            console.log('FOUND', markerObject.x, markerObject.y, markerObject.id);
                            markers.push(markerObject);
                        }
                    }
                }
            });

            if (markers.length) {
                updateVisibleMarkers(markers);
            } else {
                updateVisibleMarkers([]);
            }
        }
    }

    function detect_keypoints(img, corners, max_allowed) {
        var count = jsfeat.yape06.detect(img, corners, 17);

        if (count > max_allowed) {
            jsfeat.math.qsort(corners, 0, count-1, function(a,b){return (b.score<a.score);});
            count = max_allowed;
        }

        for (var i = 0; i < count; ++i) {
            corners[i].angle = getAngle(img, corners[i].x, corners[i].y);
        }

        return count;
    }

    function getAngle(img, px, py) {
        var half_k = 15;
        var m_01 = 0, m_10 = 0;
        var src=img.data, step=img.cols;
        var u=0, v=0, center_off=(py*step + px)|0;
        var v_sum=0,d=0,val_plus=0,val_minus=0;

        for (u = -half_k; u <= half_k; ++u)
            m_10 += u * src[center_off+u];

        for (v = 1; v <= half_k; ++v) {
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

    function findHomography(matches, count, screen_corners, pattern_corners) {
        var mm_kernel = new jsfeat.motion_model.homography2d();
        var num_model_points = 4;
        var reproj_threshold = 3;
        var ransac_param = new jsfeat.ransac_params_t(num_model_points, reproj_threshold, 0.5, 0.99);

        var pattern_xy = [];
        var screen_xy = [];

        for (var i = 0; i < count; ++i) {
            var m = matches[i];
            var s_kp = screen_corners[m.screen_idx];
            var p_kp = pattern_corners[m.pattern_lev][m.pattern_idx];
            pattern_xy[i] = {"x":p_kp.x, "y":p_kp.y};
            screen_xy[i] =  {"x":s_kp.x, "y":s_kp.y};
        }

        var ok = false;
        ok = jsfeat.motion_estimator.ransac(ransac_param, mm_kernel, pattern_xy, screen_xy, count, homo3x3, match_mask, 1000);

        var good_cnt = 0;
        if (ok) {
            for(var i=0; i < count; ++i) {
                if (match_mask.data[i]) {
                    pattern_xy[good_cnt].x = pattern_xy[i].x;
                    pattern_xy[good_cnt].y = pattern_xy[i].y;
                    screen_xy[good_cnt].x = screen_xy[i].x;
                    screen_xy[good_cnt].y = screen_xy[i].y;
                    good_cnt++;
                }
            }

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

    function getMatches(screen_descriptors, pattern_descriptors, matches) {
        var q_cnt = screen_descriptors.rows;
        var query_du8 = screen_descriptors.data;
        var query_u32 = screen_descriptors.buffer.i32;
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
                var ld_i32 = lev_descr.buffer.i32;
                var ld_off = 0;

                for(pidx = 0; pidx < ld_cnt; ++pidx) {
                    var curr_d = 0;
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

                    ld_off += 8;
                }
            }

            if (best_dist < options.match_threshold) {
                matches[num_matches].screen_idx = qidx;
                matches[num_matches].pattern_lev = best_lev;
                matches[num_matches].pattern_idx = best_idx;
                num_matches++;
            }

            qd_off += 8;
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

    function findCenter(ctx, id) {
        const shape_pts = tCorners(homo3x3.data, pattern_preview.cols*2, pattern_preview.rows*2);
        const region = new Region(shape_pts);
        const center = region.centroid();

        const ratioX = ctx.canvas.clientWidth / ctx.canvas.width;
        const ratioY = ctx.canvas.clientHeight / ctx.canvas.height;

        return { id: id, x: center.x * ratioX, y: center.y * ratioY };
    }
}