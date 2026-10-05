importScripts('vendor/imagetracer.js');
self.onmessage = ({data}) => {
  try {
    const {pixels,width,height,settings,sourceWidth,sourceHeight} = data;
    const rgba = new Uint8ClampedArray(pixels);
    for(let i=0;i<rgba.length;i+=4){
      const alpha=rgba[i+3]/255;
      // Flatten input transparency before quantization to avoid dark fringes.
      for(let c=0;c<3;c++) rgba[i+c]=Math.round(rgba[i+c]*alpha+255*(1-alpha));
      rgba[i+3]=255;
      // JPEG noise in nearly white backgrounds should not become thousands of shapes.
      if(Math.min(rgba[i],rgba[i+1],rgba[i+2])>235)rgba[i]=rgba[i+1]=rgba[i+2]=255;
      if(settings.mono){const gray=rgba[i]*.2126+rgba[i+1]*.7152+rgba[i+2]*.0722;rgba[i]=rgba[i+1]=rgba[i+2]=gray;}
    }
    const ratio=width/sourceWidth;
    const options={numberofcolors:settings.colors,colorsampling:2,colorquantcycles:4,mincolorratio:0,
      ltres: .2+settings.smooth/100*2.5,qtres:.2+settings.smooth/100*2.5,
      pathomit:Math.round(settings.detail*ratio),rightangleenhance:true,
      blurradius:settings.smooth>0?1:0,blurdelta:30,strokewidth:.3,
      roundcoords:2,viewbox:true,desc:false,scale:1};
    if(settings.mono) options.pal=[{r:0,g:0,b:0,a:255},{r:255,g:255,b:255,a:255}];
    const traced=ImageTracer.imagedataToTracedata({width,height,data:rgba},options);
    if(settings.removeBg) traced.palette.forEach(c=>{if(Math.min(c.r,c.g,c.b)>240)c.a=0;});
    let svg=ImageTracer.getsvgstring(traced,options);
    // Keep the source aspect ratio and the true original document size.
    svg=svg.replace('<svg ',`<svg width="${sourceWidth}" height="${sourceHeight}" `);
    self.postMessage({svg,width,height});
  } catch(error){self.postMessage({error:error.message||'Gambar tidak berhasil diproses.'});}
};
