(()=>{
 const video=document.getElementById('riaHologram'),listen=document.getElementById('riaListen');
 if(!video)return;
 video.defaultMuted=true;video.muted=true;video.autoplay=true;video.loop=true;video.playsInline=true;
 let finished=false,userPaused=false;
 function sync(){if(!listen)return;listen.textContent=video.muted?'▶ Hear Ria':'🔊 Sound on';listen.setAttribute('aria-label',video.muted?'Play Ria introduction with sound':'Mute Ria introduction')}
 const play=()=>video.play().catch(sync);
 listen?.addEventListener('click',()=>{video.muted=!video.muted;if(!video.muted){video.currentTime=0;finished=false;userPaused=false;play()}sync()});
 video.addEventListener('play',sync);video.addEventListener('pause',sync);video.addEventListener('ended',()=>{finished=true;sync()});
 video.addEventListener('canplay',()=>{if(!finished&&!userPaused&&video.paused)play()},{once:true});
 addEventListener('pageshow',()=>{if(!finished&&!userPaused)play()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!finished&&!userPaused)play()});
 // Live luminance key removes the near-black backdrop, retaining the luminous portrait.
 const canvas=document.createElement('canvas');canvas.className='ria-keyed-canvas';canvas.setAttribute('aria-hidden','true');
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});
 if(gl){try{
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*.5,(1.0-p.y)*.5);gl_Position=vec4(p,0.,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 uv;uniform sampler2D frame;void main(){vec3 c=texture2D(frame,uv).rgb;float a=smoothstep(.055,.18,max(c.r,max(c.g,c.b)));gl_FragColor=vec4(c,a);}');
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  video.after(canvas);let callback=0;
  function draw(){if(video.readyState<2||document.hidden)return;try{if(canvas.width!==640){canvas.width=640;canvas.height=Math.round(640*video.videoHeight/video.videoWidth);gl.viewport(0,0,canvas.width,canvas.height)}gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);video.parentElement.classList.add('ria-keyed')}catch{video.parentElement.classList.remove('ria-keyed')}}
  function frame(){draw();callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(frame):requestAnimationFrame(frame)}
  frame();video.addEventListener('loadeddata',draw);video.addEventListener('seeked',draw);
  canvas.addEventListener('webglcontextlost',()=>{video.parentElement.classList.remove('ria-keyed');canvas.hidden=true});
  addEventListener('pagehide',e=>{if(e.persisted)return;if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(callback);else cancelAnimationFrame(callback);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program)});
 }catch{canvas.remove()}}
 play();sync();
})();
