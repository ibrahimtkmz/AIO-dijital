// @ts-nocheck
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  OffthreadVideo,
  Img,
  Audio,
  staticFile,
} from "remotion";

export type NewsVideoProps = {
  title: string;
  body: string;
};

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_IN_FRAMES = 182;

const TEMPLATE = {
  imageLeft: 92,
  imageTop: 280,
  imageWidth: 896,
  imageHeight: 875,
  titleTop: 55,
  titleWidth: 900,
  titleFontSize: 60,
  bodyLeft: 88,
  bodyTop: 1160,
  bodyWidth: 904,
  bodyHeight: 515,
  bodyFontSize: 42,
};

function TextBlock({text,fontSize,lineHeight,maxLines}:{text:string;fontSize:number;lineHeight:number;maxLines:number}) {
  return <div style={{
    width:"100%", overflow:"hidden", display:"-webkit-box",
    WebkitBoxOrient:"vertical", WebkitLineClamp:maxLines,
    whiteSpace:"normal", overflowWrap:"break-word",
    fontFamily:"Arial, Helvetica, sans-serif",
    fontSize, lineHeight:`${lineHeight}px`,
  }}>{text}</div>;
}

export const NewsVideo: React.FC<NewsVideoProps> = ({title, body}) => (
  <>
    <Composition
      id="NewsVideo"
      component={NewsVideoFrame}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{title:"",body:""}}
    />
  </>
);

const NewsVideoFrame: React.FC<NewsVideoProps> = ({title,body}) => (
  <AbsoluteFill style={{backgroundColor:"#000"}}>
    <OffthreadVideo
      src={staticFile("template.mp4")}
      muted
      volume={0}
      style={{width:WIDTH,height:HEIGHT,objectFit:"cover"}}
    />
    <Audio src={staticFile("golden-brown.mp3")} volume={0.18} loop />
    <Audio src={staticFile("golden-brown.mp3")} volume={0.35} />
    <Img
      src={staticFile("news-image.png")}
      style={{
        position:"absolute",left:TEMPLATE.imageLeft,top:TEMPLATE.imageTop,
        width:TEMPLATE.imageWidth,height:TEMPLATE.imageHeight,
        objectFit:"cover",borderRadius:22,
      }}
    />
    <div style={{
      position:"absolute",left:(WIDTH-TEMPLATE.titleWidth)/2,top:TEMPLATE.titleTop,
      width:TEMPLATE.titleWidth,minHeight:92,boxSizing:"border-box",
      padding:"22px 28px 24px",borderRadius:38,backgroundColor:"#ff2020",
      color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
      textAlign:"center",
    }}>
      <TextBlock text={title.slice(0,120)} fontSize={TEMPLATE.titleFontSize} lineHeight={69} maxLines={4}/>
    </div>
    <div style={{
      position:"absolute",left:TEMPLATE.bodyLeft,top:TEMPLATE.bodyTop,
      width:TEMPLATE.bodyWidth,height:TEMPLATE.bodyHeight,boxSizing:"border-box",
      padding:"38px",borderRadius:22,backgroundColor:"#fff",color:"#111",
      display:"flex",alignItems:"flex-start",justifyContent:"center",textAlign:"center",
    }}>
      <TextBlock text={body.slice(0,620)} fontSize={TEMPLATE.bodyFontSize} lineHeight={52} maxLines={10}/>
    </div>
  </AbsoluteFill>
);
