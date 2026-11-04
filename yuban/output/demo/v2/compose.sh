#!/usr/bin/env bash
set -euo pipefail

FFMPEG="/Users/jimachao/.local/bin/ffmpeg"
FONT="/System/Library/Fonts/PingFang.ttc"
ROOT="/Users/jimachao/Documents/ChatGPT/yuban"
DIR="${1:-$ROOT/output/demo/v2}"
OUTPUT_NAME="${2:-wug-language-partner-acceptance-demo-v2.mp4}"
LOGO="$ROOT/public/assets/wug-logo.png"

make_desktop_slide() {
  local source="$1"
  local output="$2"
  local chapter="$3"
  local title="$4"

  "$FFMPEG" -y -v error \
    -f lavfi -i "color=c=0xf2f5f7:s=1440x900:r=30:d=1" \
    -i "$source" \
    -filter_complex "
      [0:v]
        drawbox=x=72:y=122:w=1296:h=736:color=0x17324d@0.10:t=fill,
        drawbox=x=80:y=34:w=7:h=43:color=0xed725f:t=fill,
        drawtext=fontfile='${FONT}':text='${title}':fontcolor=0x17324d:fontsize=34:x=106:y=34,
        drawtext=fontfile='${FONT}':text='ZISU LANGUAGE PARTNER  ·  ${chapter}':fontcolor=0x6f8191:fontsize=16:x=w-text_w-80:y=49[base];
      [1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=white[shot];
      [base][shot]overlay=80:130,
        drawbox=x=80:y=130:w=1280:h=720:color=0xdfe6eb:t=2
    " -frames:v 1 "$output"
}

"$FFMPEG" -y -v error \
  -f lavfi -i "color=c=0x17324d:s=1440x900:r=30:d=1" \
  -i "$LOGO" \
  -filter_complex "
    [0:v]
      drawbox=x=120:y=142:w=92:h=5:color=0xed725f:t=fill,
      drawtext=fontfile='${FONT}':text='浙江外国语学院  ·  ZISU':fontcolor=0x9ac2e3:fontsize=24:x=120:y=98,
      drawtext=fontfile='${FONT}':text='Wug 智能语伴':fontcolor=white:fontsize=68:x=120:y=232,
      drawtext=fontfile='${FONT}':text='让每一次开口，都更自在。':fontcolor=0xdceaf4:fontsize=34:x=120:y=338,
      drawtext=fontfile='${FONT}':text='产品功能验收演示':fontcolor=0xf2a394:fontsize=22:x=120:y=505,
      drawtext=fontfile='${FONT}':text='对话 · 流式回复 · 多语言 · 移动适配':fontcolor=0xb8cedf:fontsize=20:x=120:y=548[cover];
    [1:v]scale=410:410[logo];
    [cover][logo]overlay=875:245
  " -frames:v 1 "$DIR/00-cover.png"

make_desktop_slide "$DIR/01-home.png" "$DIR/slide-01.png" "01" "校园品牌与语伴身份"
make_desktop_slide "$DIR/02-typed.png" "$DIR/slide-02.png" "02" "自然输入与快捷话题"
make_desktop_slide "$DIR/03-streaming.png" "$DIR/slide-03.png" "03" "回复逐字流式呈现"
make_desktop_slide "$DIR/04-reply.png" "$DIR/slide-04.png" "04" "轻量纠错与连续追问"
make_desktop_slide "$DIR/05-language.png" "$DIR/slide-05.png" "05" "多语言与练习难度切换"
make_desktop_slide "$DIR/06-phrase.png" "$DIR/slide-06.png" "06" "推荐短语一键带入"
make_desktop_slide "$DIR/07-japanese-reply.png" "$DIR/slide-07.png" "07" "多轮上下文保持"

"$FFMPEG" -y -v error \
  -f lavfi -i "color=c=0xf2f5f7:s=1440x900:r=30:d=1" \
  -i "$DIR/08-mobile.png" \
  -i "$LOGO" \
  -filter_complex "
    [0:v]
      drawbox=x=0:y=0:w=790:h=900:color=0x17324d:t=fill,
      drawbox=x=82:y=112:w=72:h=5:color=0xed725f:t=fill,
      drawtext=fontfile='${FONT}':text='08  移动端自适应':fontcolor=white:fontsize=46:x=82:y=158,
      drawtext=fontfile='${FONT}':text='在窄屏上依然清晰、完整、可操作':fontcolor=0xb8cedf:fontsize=24:x=82:y=234,
      drawtext=fontfile='${FONT}':text='•  浙外与 Wug 品牌清晰可见':fontcolor=0xeaf3fb:fontsize=23:x=92:y=356,
      drawtext=fontfile='${FONT}':text='•  快捷话题自动换行':fontcolor=0xeaf3fb:fontsize=23:x=92:y=410,
      drawtext=fontfile='${FONT}':text='•  输入区始终处于安全区域':fontcolor=0xeaf3fb:fontsize=23:x=92:y=464,
      drawtext=fontfile='${FONT}':text='浙江外国语学院  ·  Wug 智能语伴':fontcolor=0x9ac2e3:fontsize=17:x=82:y=824,
      drawbox=x=978:y=38:w=386:h=824:color=0x17324d@0.13:t=fill,
      drawbox=x=969:y=29:w=386:h=824:color=white:t=fill[mobilebase];
    [1:v]scale=351:760[phone];
    [2:v]scale=210:210[logo];
    [mobilebase][phone]overlay=987:61[tmp];
    [tmp][logo]overlay=530:625
  " -frames:v 1 "$DIR/slide-08-mobile.png"

"$FFMPEG" -y -v error \
  -f lavfi -i "color=c=0x17324d:s=1440x900:r=30:d=1" \
  -i "$LOGO" \
  -filter_complex "
    [0:v]
      drawtext=fontfile='${FONT}':text='Wug 智能语伴':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=224,
      drawtext=fontfile='${FONT}':text='开口，从这里开始。':fontcolor=0xdceaf4:fontsize=34:x=(w-text_w)/2:y=314,
      drawbox=x=600:y=392:w=240:h=2:color=0xed725f:t=fill,
      drawtext=fontfile='${FONT}':text='浙江外国语学院':fontcolor=0x9ac2e3:fontsize=24:x=(w-text_w)/2:y=450,
      drawtext=fontfile='${FONT}':text='Zhejiang International Studies University':fontcolor=0x779ab6:fontsize=17:x=(w-text_w)/2:y=494[end];
    [1:v]scale=185:185[logo];
    [end][logo]overlay=(W-w)/2:590
  " -frames:v 1 "$DIR/09-end.png"

"$FFMPEG" -y -v error \
  -loop 1 -t 3.2 -i "$DIR/00-cover.png" \
  -loop 1 -t 3.0 -i "$DIR/slide-01.png" \
  -loop 1 -t 2.6 -i "$DIR/slide-02.png" \
  -loop 1 -t 2.7 -i "$DIR/slide-03.png" \
  -loop 1 -t 3.2 -i "$DIR/slide-04.png" \
  -loop 1 -t 3.2 -i "$DIR/slide-05.png" \
  -loop 1 -t 2.6 -i "$DIR/slide-06.png" \
  -loop 1 -t 3.2 -i "$DIR/slide-07.png" \
  -loop 1 -t 4.0 -i "$DIR/slide-08-mobile.png" \
  -loop 1 -t 2.8 -i "$DIR/09-end.png" \
  -filter_complex "
    [0:v]fps=30,format=yuv420p[v0];
    [1:v]fps=30,format=yuv420p[v1];
    [2:v]fps=30,format=yuv420p[v2];
    [3:v]fps=30,format=yuv420p[v3];
    [4:v]fps=30,format=yuv420p[v4];
    [5:v]fps=30,format=yuv420p[v5];
    [6:v]fps=30,format=yuv420p[v6];
    [7:v]fps=30,format=yuv420p[v7];
    [8:v]fps=30,format=yuv420p[v8];
    [9:v]fps=30,format=yuv420p[v9];
    [v0][v1]xfade=transition=fade:duration=0.45:offset=2.75[x1];
    [x1][v2]xfade=transition=fade:duration=0.45:offset=5.30[x2];
    [x2][v3]xfade=transition=fade:duration=0.45:offset=7.45[x3];
    [x3][v4]xfade=transition=fade:duration=0.45:offset=9.70[x4];
    [x4][v5]xfade=transition=fade:duration=0.45:offset=12.45[x5];
    [x5][v6]xfade=transition=fade:duration=0.45:offset=15.20[x6];
    [x6][v7]xfade=transition=fade:duration=0.45:offset=17.35[x7];
    [x7][v8]xfade=transition=fade:duration=0.45:offset=20.10[x8];
    [x8][v9]xfade=transition=fade:duration=0.45:offset=23.65[outv]
  " \
  -map "[outv]" -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$DIR/$OUTPUT_NAME"
