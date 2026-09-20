import React from "react";
import { AbsoluteFill, Composition, OffthreadVideo, Img, staticFile } from "remotion";

export type NewsVideoProps = {
  title: string;
  body: string;
};

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_IN_FRAMES = 182;

const TEMPLATE = {
  imageLeft: 90,
  imageTop: 300,
  imageWidth: 900,
  imageHeight: 384,
  titleTop: 55,
  titleWidth: 900,
  titleFontSize: 60,
  bodyLeft: 90,
  bodyTop: 710,
  bodyWidth: 900,
  bodyFontSize: 42,
  bodyLineHeight: 52,
  bodyPaddingX: 32,
  bodyPaddingY: 30,
};

function TextBlock({text, fontSize, lineHeight}: {
  text: string;
  fontSize: number;
  lineHeight: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize,
        lineHeight: `${lineHeight}px`,
        whiteSpace: "normal",
        overflowWrap: "break-word",
        wordBreak: "normal",
      }}
    >
      {text}
    </div>
  );
}

export const NewsVideo: React.FC<NewsVideoProps> = ({title, body}) => (
  <Composition
    id="NewsVideo"
    component={NewsVideoFrame}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{title: "", body: ""}}
  />
);

const NewsVideoFrame: React.FC<NewsVideoProps> = ({title, body}) => (
  <AbsoluteFill style={{backgroundColor: "#000"}}>
    <OffthreadVideo
      src={staticFile("template.mp4")}
      muted
      volume={0}
      style={{width: WIDTH, height: HEIGHT, objectFit: "cover"}}
    />

    <Img
      src={staticFile("news-image.png")}
      style={{
        position: "absolute",
        left: TEMPLATE.imageLeft,
        top: TEMPLATE.imageTop,
        width: TEMPLATE.imageWidth,
        height: TEMPLATE.imageHeight,
        objectFit: "cover",
        borderRadius: 22,
      }}
    />

    <div
      style={{
        position: "absolute",
        left: (WIDTH - TEMPLATE.titleWidth) / 2,
        top: TEMPLATE.titleTop,
        width: TEMPLATE.titleWidth,
        minHeight: 92,
        boxSizing: "border-box",
        padding: "22px 28px 24px",
        borderRadius: 38,
        backgroundColor: "#ff2020",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <TextBlock text={title.slice(0, 120)} fontSize={TEMPLATE.titleFontSize} lineHeight={69} />
    </div>

    <div
      style={{
        position: "absolute",
        left: TEMPLATE.bodyLeft,
        top: TEMPLATE.bodyTop,
        width: TEMPLATE.bodyWidth,
        boxSizing: "border-box",
        padding: `${TEMPLATE.bodyPaddingY}px ${TEMPLATE.bodyPaddingX}px`,
        borderRadius: 22,
        backgroundColor: "#fff",
        color: "#111",
        textAlign: "center",
      }}
    >
      <TextBlock
        text={body}
        fontSize={TEMPLATE.bodyFontSize}
        lineHeight={TEMPLATE.bodyLineHeight}
      />
    </div>
  </AbsoluteFill>
);
